import {math} from "../lib/math.js";
import {geometryCompression} from "./lib/geometryCompression.js";
import {buildEdgeIndices} from "./lib/buildEdgeIndices.js";
import {isTriangleMeshSolid} from "./lib/isTriangleMeshSolid.js";

import {XKTMesh} from './XKTMesh.js';
import {XKTGeometry} from './XKTGeometry.js';
import {XKTEntity} from './XKTEntity.js';
import {XKTTile} from './XKTTile.js';
import {KDNode} from "./KDNode.js";

const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4([0, 0, 0, 1]);

const identityMat4 = math.identityMat4();
const tempMat4 = math.mat4();
const tempMat4b = math.mat4();

const MIN_TILE_DIAG = 10000;

const kdTreeDimLength = new Float32Array(3);

/**
 * A document model that represents the contents of an .XKT file.
 *
 * * An XKTModel contains {@link XKTTile}s, which spatially subdivide the model into regions.
 * * Each {@link XKTTile} contains {@link XKTEntity}s, which represent the objects within its region.
 * * Each {@link XKTEntity} has {@link XKTMesh}s, which indicate the {@link XKTGeometry}s that comprise the {@link XKTEntity}.
 * * Import glTF into an XKTModel using {@link parseGLTFIntoXKTModel}
 * * Build an XKTModel programmatically using {@link XKTModel#createGeometry}, {@link XKTModel#createMesh} and {@link XKTModel#createEntity}
 * * Serialize an XKTModel to an ArrayBuffer using {@link writeXKTModelToArrayBuffer}
 *
 * ## Usage
 *
 * See [main docs page](/docs/#javascript-api) for usage examples.
 *
 * @class XKTModel
 */
class XKTModel {

    /**
     * Constructs a new XKTModel.
     *
     * @param {*} [cfg] Configuration
     * @param {Number} [cfg.edgeThreshold=10]
     */
    constructor(cfg = {}) {

        /**
         *
         * @type {Number|number}
         */
        this.edgeThreshold = cfg.edgeThreshold || 10;

        /**
         * The positions of all shared {@link XKTGeometry}s are de-quantized using this singular
         * de-quantization matrix.
         *
         * This de-quantization matrix is generated from the collective Local-space boundary of the
         * positions of all shared {@link XKTGeometry}s.
         *
         * @type {Float32Array}
         */
        this.reusedGeometriesDecodeMatrix = new Float32Array(16);

        /**
         * Map of {@link XKTGeometry}s within this XKTModel, each mapped to {@link XKTGeometry#geometryId}.
         *
         * Created by {@link XKTModel#createGeometry}.
         *
         * @type {{Number:XKTGeometry}}
         */
        this.geometries = {};

        /**
         * List of {@link XKTGeometry}s within this XKTModel, in the order they were created.
         *
         * Each XKTGeometry holds its position in this list in {@link XKTGeometry#geometryIndex}.
         *
         * Created by {@link XKTModel#createGeometry}.
         *
         * @type {XKTGeometry[]}
         */
        this.geometriesList = [];

        /**
         * Map of {@link XKTMesh}s within this XKTModel, each mapped to {@link XKTMesh#meshId}.
         *
         * Created by {@link XKTModel#createMesh}.
         *
         * @type {{Number:XKTMesh}}
         */
        this.meshes = {};

        /**
         * List of {@link XKTMesh}s within this XKTModel, in the order they were created.
         *
         * Each XKTMesh holds its position in this list in {@link XKTMesh#meshIndex}.
         *
         * Created by {@link XKTModel#createMesh}.
         *
         * @type {XKTMesh[]}
         */
        this.meshesList = [];

        /**
         * Map of {@link XKTEntity}s within this XKTModel, each mapped to {@link XKTEntity#entityId}.
         *
         * Created by {@link XKTModel#createEntity}.
         *
         * @type {{String:XKTEntity}}
         */
        this.entities = {};

        /**
         * {@link XKTEntity}s within this XKTModel.
         *
         * Each XKTEntity holds its position in this list in {@link XKTMesh#entityIndex}.
         *
         * Created by {@link XKTModel#finalize}.
         *
         * @type {XKTEntity[]}
         */
        this.entitiesList = [];

        /**
         * {@link XKTTile}s within this Model.
         *
         * Created by {@link XKTModel#finalize}.
         *
         * @type {XKTTile[]}
         */
        this.tilesList = [];

        /**
         * Indicates if this XKTModel has been finalized.
         *
         * Set ````true```` by {@link XKTModel#finalize}.
         *
         * @type {boolean}
         */
        this.finalized = false;
    }

    /**
     * Creates an {@link XKTGeometry} within this XKTModel.
     *
     * Logs error and does nothing if this XKTModel has been finalized (see {@link XKTModel#finalized}).
     *
     * @param {*} params Method parameters.
     * @param {Number} params.geometryId Unique ID for the {@link XKTGeometry}.
     * @param {String} params.primitiveType The type of {@link XKTGeometry}: "triangles", "lines" or "points".
     * @param {Float64Array} params.positions Floating-point Local-space vertex positions for the {@link XKTGeometry}. Required for all primitive types.
     * @param {Number[]} [params.normals] Floating-point vertex normals for the {@link XKTGeometry}. Required for triangles primitives. Ignored for points and lines.
     * @param {Number[]} [params.colors] Floating-point RGBA vertex colors for the {@link XKTGeometry}. Required for points primitives. Ignored for lines and triangles.
     * @param {Number[]} [params.colorsCompressed] Integer RGBA vertex colors for the {@link XKTGeometry}. Required for points primitives. Ignored for lines and triangles.
     * @param {Uint32Array} [params.indices] Indices for the {@link XKTGeometry}. Required for triangles and lines primitives. Ignored for points.
     * @param {Number} [params.edgeThreshold=10]
     * @returns {XKTGeometry} The new {@link XKTGeometry}.
     */
    createGeometry(params) {

        if (!params) {
            throw "Parameters expected: params";
        }

        if (params.geometryId === null || params.geometryId === undefined) {
            throw "Parameter expected: params.geometryId";
        }

        if (!params.primitiveType) {
            throw "Parameter expected: params.primitiveType";
        }

        if (!params.positions) {
            throw "Parameter expected: params.positions";
        }

        const triangles = params.primitiveType === "triangles";
        const points = params.primitiveType === "points";
        const lines = params.primitiveType === "lines";

        if (!triangles && !points && !lines) {
            throw "Unsupported value for params.primitiveType: " + params.primitiveType + "' - supported values are 'triangles', 'points' and 'lines'";
        }

        if (triangles) {
            if (!params.normals) {
                throw "Parameter expected for 'triangles' primitive: params.normals";
            }
            if (!params.indices) {
                throw "Parameter expected for 'triangles' primitive: params.indices";
            }
        }

        if (points) {
            if (!params.colors && !params.colorsCompressed) {
                throw "Parameter expected for 'points' primitive: params.colors or params.colorsCompressed";
            }
        }

        if (lines) {
            if (!params.indices) {
                throw "Parameter expected for 'lines' primitive: params.indices";
            }
        }

        if (this.finalized) {
            console.error("XKTModel has been finalized, can't add more geometries");
            return;
        }

        if (this.geometries[params.geometryId]) {
            console.error("XKTGeometry already exists with this ID: " + params.geometryId);
            return;
        }

        const geometryId = params.geometryId;
        const primitiveType = params.primitiveType;
        const positions = new Float32Array(params.positions); // May modify in #finalize

        const xktGeometryCfg = {
            geometryId: geometryId,
            geometryIndex: this.geometriesList.length,
            primitiveType: primitiveType,
            positions: positions
        }

        if (triangles) {
            xktGeometryCfg.normals = new Float32Array(params.normals); // May modify in #finalize
            xktGeometryCfg.indices = params.indices;
            xktGeometryCfg.edgeIndices = buildEdgeIndices(positions, params.indices, null, params.edgeThreshold || this.edgeThreshold || 10);

        }

        if (points) {
            if (params.colorsCompressed) {
                xktGeometryCfg.colorsCompressed = new Uint8Array(params.colorsCompressed);
            } else {
                const colors = params.colors;
                const colorsCompressed = new Uint8Array(colors.length);
                for (let i = 0, len = colors.length; i < len; i++) {
                    colorsCompressed[i] = Math.floor(colors[i] * 255);
                }
                xktGeometryCfg.colorsCompressed = colorsCompressed;
            }
        }

        if (lines) {
            xktGeometryCfg.indices = params.indices;
        }

        const geometry = new XKTGeometry(xktGeometryCfg);

        this.geometries[geometryId] = geometry;
        this.geometriesList.push(geometry);

        return geometry;
    }

    /**
     * Creates an {@link XKTMesh} within this XKTModel.
     *
     * An {@link XKTMesh} can be owned by one {@link XKTEntity}, which can own multiple {@link XKTMesh}es.
     *
     * @param {*} params Method parameters.
     * @param {Number} params.meshId Unique ID for the {@link XKTMesh}.
     * @param {Number} params.geometryId ID of an existing {@link XKTGeometry} in {@link XKTModel#geometries}.
     * @param {Uint8Array} params.color RGB color for the {@link XKTMesh}, with each color component in range [0..1].
     * @param {Number} params.opacity Opacity factor for the {@link XKTMesh}, in range [0..1].
     * @param {Float32Array} [params.matrix] Modeling matrix for the {@link XKTMesh}. Overrides ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [params.position=[0,0,0]] Position of the {@link XKTMesh}. Overridden by the ````matrix```` parameter.
     * @param {Number[]} [params.scale=[1,1,1]] Scale of the {@link XKTMesh}. Overridden by the ````matrix```` parameter.
     * @param {Number[]} [params.rotation=[0,0,0]] Rotation of the {@link XKTMesh} as Euler angles given in degrees, for each of the X, Y and Z axis. Overridden by the ````matrix```` parameter.
     * @returns {XKTMesh} The new {@link XKTMesh}.
     */
    createMesh(params) {

        if (params.meshId === null || params.meshId === undefined) {
            throw "Parameter expected: params.meshId";
        }

        if (params.geometryId === null || params.geometryId === undefined) {
            throw "Parameter expected: params.geometryId";
        }

        // if (!params.color) {
        //     throw "Parameter expected: params.color";
        // }
        //
        // if (params.opacity === null || params.opacity === undefined) {
        //     throw "Parameter expected: params.opacity";
        // }

        if (this.finalized) {
            throw "XKTModel has been finalized, can't add more meshes";
        }

        if (this.meshes[params.meshId]) {
            console.error("XKTMesh already exists with this ID: " + params.meshId);
            return;
        }

        const geometry = this.geometries[params.geometryId];

        if (!geometry) {
            console.error("XKTGeometry not found: " + params.geometryId);
            return;
        }

        geometry.numInstances++;

        let matrix = params.matrix;

        if (!matrix) {

            const position = params.position;
            const scale = params.scale;
            const rotation = params.rotation;

            if (position || scale || rotation) {
                matrix = math.identityMat4();
                const quaternion = math.eulerToQuaternion(rotation || [0, 0, 0], "XYZ", math.identityQuaternion());
                math.composeMat4(position || [0, 0, 0], quaternion, scale || [1, 1, 1], matrix)

            } else {
                matrix = math.identityMat4();
            }
        }

        const meshIndex = this.meshesList.length;

        const mesh = new XKTMesh({
            meshId: params.meshId,
            meshIndex: meshIndex,
            matrix: matrix,
            geometry: geometry,
            color: params.color,
            opacity: params.opacity
        });

        this.meshes[mesh.meshId] = mesh;
        this.meshesList.push(mesh);

        return mesh;
    }

    /**
     * Creates an {@link XKTEntity} within this XKTModel.
     *
     * Logs error and does nothing if this XKTModel has been finalized (see {@link XKTModel#finalized}).
     *
     * @param {*} params Method parameters.
     * @param {String} params.entityId Unique ID for the {@link XKTEntity}.
     * @param {String[]} params.meshIds IDs of {@link XKTMesh}es used by the {@link XKTEntity}. Note that each {@link XKTMesh} can only be used by one {@link XKTEntity}.
     * @returns {XKTEntity} The new {@link XKTEntity}.
     */
    createEntity(params) {

        if (!params) {
            throw "Parameters expected: params";
        }

        if (params.entityId === null || params.entityId === undefined) {
            throw "Parameter expected: params.entityId";
        }

        if (!params.meshIds) {
            throw "Parameter expected: params.meshIds";
        }

        if (this.finalized) {
            console.error("XKTModel has been finalized, can't add more entities");
            return;
        }

        if (this.entities[params.entityId]) {
            console.error("XKTEntity already exists with this ID: " + params.entityId);
            return;
        }

        const entityId = params.entityId;
        const meshIds = params.meshIds;
        const meshes = [];

        for (let meshIdIdx = 0, meshIdLen = meshIds.length; meshIdIdx < meshIdLen; meshIdIdx++) {

            const meshId = meshIds[meshIdIdx];
            const mesh = this.meshes[meshId];

            if (!mesh) {
                console.error("XKTMesh found: " + meshId);
                continue;
            }

            if (mesh.entity) {
                console.error("XKTMesh " + meshId + " already used by XKTEntity " + mesh.entity.entityId);
                continue;
            }

            meshes.push(mesh);
        }

        const entity = new XKTEntity(entityId, meshes);

        for (let i = 0, len = meshes.length; i < len; i++) {
            const mesh = meshes[i];
            mesh.entity = entity;
        }

        this.entities[entityId] = entity;
        this.entitiesList.push(entity);

        return entity;
    }

    /**
     * Finalizes this XKTModel.
     *
     * After finalizing, we may then serialize the model to an array buffer using {@link writeXKTModelToArrayBuffer}.
     *
     * Logs error and does nothing if this XKTModel has already been finalized.
     *
     * Internally, this method:
     *
     * * sets each {@link XKTEntity}'s {@link XKTEntity#hasReusedGeometries} true if it shares its {@link XKTGeometry}s with other {@link XKTEntity}s,
     * * creates each {@link XKTEntity}'s {@link XKTEntity#aabb},
     * * creates {@link XKTTile}s in {@link XKTModel#tilesList}, and
     * * sets {@link XKTModel#finalized} ````true````.
     */
    finalize() {

        if (this.finalized) {
            console.log("XKTModel already finalized");
            return;
        }

        this._bakeSingleUseGeometryPositions();

        this._bakeAndOctEncodeNormals();

        this._flagEntitiesThatReuseGeometries();

        this._createEntityAABBs();

        const rootKDNode = this._createKDTree();

        this._createTilesFromKDTree(rootKDNode);

        this._createReusedGeometriesDecodeMatrix();

        this._flagSolidGeometries();

        this.finalized = true;
    }

    _bakeSingleUseGeometryPositions() {

        for (let j = 0, lenj = this.meshesList.length; j < lenj; j++) {

            const mesh = this.meshesList[j];

            const geometry = mesh.geometry;

            if (geometry.numInstances === 1) {

                const matrix = mesh.matrix;

                if (matrix && (!math.isIdentityMat4(matrix))) {

                    const positions = geometry.positions;

                    for (let i = 0, len = positions.length; i < len; i += 3) {

                        tempVec4a[0] = positions[i + 0];
                        tempVec4a[1] = positions[i + 1];
                        tempVec4a[2] = positions[i + 2];

                        math.transformPoint4(matrix, tempVec4a, tempVec4b);

                        positions[i + 0] = tempVec4b[0];
                        positions[i + 1] = tempVec4b[1];
                        positions[i + 2] = tempVec4b[2];
                    }
                }
            }
        }
    }

    _bakeAndOctEncodeNormals() {

        for (let i = 0, len = this.meshesList.length; i < len; i++) {

            const mesh = this.meshesList[i];
            const geometry = mesh.geometry;

            if (geometry.normals && !geometry.normalsOctEncoded) {

                geometry.normalsOctEncoded = new Int8Array(geometry.normals.length);

                const modelNormalMatrix = math.inverseMat4(math.transposeMat4(mesh.matrix || identityMat4, tempMat4), tempMat4b);

                geometryCompression.transformAndOctEncodeNormals(modelNormalMatrix, geometry.normals, geometry.normals.length, geometry.normalsOctEncoded, 0);
            }
        }
    }

    _flagEntitiesThatReuseGeometries() {

        for (let i = 0, len = this.entitiesList.length; i < len; i++) {

            const entity = this.entitiesList[i];
            const meshes = entity.meshes;

            for (let j = 0, lenj = meshes.length; j < lenj; j++) {

                const mesh = meshes[j];
                const geometry = mesh.geometry;

                if (geometry.numInstances > 1) {
                    entity.hasReusedGeometries = true;
                }
            }
        }
    }

    _createEntityAABBs() {

        for (let i = 0, len = this.entitiesList.length; i < len; i++) {

            const entity = this.entitiesList[i];
            const entityAABB = entity.aabb;
            const meshes = entity.meshes;

            math.collapseAABB3(entityAABB);

            for (let j = 0, lenj = meshes.length; j < lenj; j++) {

                const mesh = meshes[j];
                const geometry = mesh.geometry;
                const matrix = mesh.matrix;

                if (geometry.numInstances > 1) {

                    const positions = geometry.positions;
                    for (let i = 0, len = positions.length; i < len; i += 3) {
                        tempVec4a[0] = positions[i + 0];
                        tempVec4a[1] = positions[i + 1];
                        tempVec4a[2] = positions[i + 2];
                        math.transformPoint4(matrix, tempVec4a, tempVec4b);
                        math.expandAABB3Point3(entityAABB, tempVec4b);
                    }

                } else {

                    const positions = geometry.positions;
                    for (let i = 0, len = positions.length; i < len; i += 3) {
                        tempVec4a[0] = positions[i + 0];
                        tempVec4a[1] = positions[i + 1];
                        tempVec4a[2] = positions[i + 2];
                        math.expandAABB3Point3(entityAABB, tempVec4a);
                    }
                }
            }
        }
    }

    _createKDTree() {

        const aabb = math.collapseAABB3();

        for (let i = 0, len = this.entitiesList.length; i < len; i++) {
            const entity = this.entitiesList[i];
            math.expandAABB3(aabb, entity.aabb);
        }

        const rootKDNode = new KDNode(aabb);

        for (let i = 0, len = this.entitiesList.length; i < len; i++) {
            const entity = this.entitiesList[i];
            this._insertEntityIntoKDTree(rootKDNode, entity);
        }

        return rootKDNode;
    }

    _insertEntityIntoKDTree(kdNode, entity) {

        const nodeAABB = kdNode.aabb;
        const entityAABB = entity.aabb;

        const nodeAABBDiag = math.getAABB3Diag(nodeAABB);

        if (nodeAABBDiag < MIN_TILE_DIAG) {
            kdNode.entities = kdNode.entities || [];
            kdNode.entities.push(entity);
            math.expandAABB3(nodeAABB, entityAABB);
            return;
        }

        if (kdNode.left) {
            if (math.containsAABB3(kdNode.left.aabb, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.left, entity);
                return;
            }
        }

        if (kdNode.right) {
            if (math.containsAABB3(kdNode.right.aabb, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.right, entity);
                return;
            }
        }

        kdTreeDimLength[0] = nodeAABB[3] - nodeAABB[0];
        kdTreeDimLength[1] = nodeAABB[4] - nodeAABB[1];
        kdTreeDimLength[2] = nodeAABB[5] - nodeAABB[2];

        let dim = 0;

        if (kdTreeDimLength[1] > kdTreeDimLength[dim]) {
            dim = 1;
        }

        if (kdTreeDimLength[2] > kdTreeDimLength[dim]) {
            dim = 2;
        }

        if (!kdNode.left) {
            const aabbLeft = nodeAABB.slice();
            aabbLeft[dim + 3] = ((nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0);
            kdNode.left = new KDNode(aabbLeft);
            if (math.containsAABB3(aabbLeft, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.left, entity);
                return;
            }
        }

        if (!kdNode.right) {
            const aabbRight = nodeAABB.slice();
            aabbRight[dim] = ((nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0);
            kdNode.right = new KDNode(aabbRight);
            if (math.containsAABB3(aabbRight, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.right, entity);
                return;
            }
        }

        kdNode.entities = kdNode.entities || [];
        kdNode.entities.push(entity);

        math.expandAABB3(nodeAABB, entityAABB);
    }

    _createTilesFromKDTree(rootKDNode) {
        this._createTilesFromKDNode(rootKDNode);
    }

    _createTilesFromKDNode(kdNode) {
        if (kdNode.entities && kdNode.entities.length > 0) {
            this._createTileFromEntities(kdNode.entities);
        }
        if (kdNode.left) {
            this._createTilesFromKDNode(kdNode.left);
        }
        if (kdNode.right) {
            this._createTilesFromKDNode(kdNode.right);
        }
    }

    /**
     * Creates a tile from the given entities.
     *
     * For each single-use {@link XKTGeometry}, this method centers {@link XKTGeometry#positions} to make them relative to the
     * tile's center, then quantizes the positions to unsigned 16-bit integers, relative to the tile's boundary.
     *
     * @param entities
     */
    _createTileFromEntities(entities) {

        let numBatchingEntities = 0; // TEST

        const tileAABB = math.AABB3(); // A tighter World-space AABB around the entities
        math.collapseAABB3(tileAABB);

        for (let i = 0; i < entities.length; i++) {
            const entity = entities [i];
            math.expandAABB3(tileAABB, entity.aabb);
        }

        const tileCenter = math.getAABB3Center(tileAABB);
        const tileCenterNeg = math.mulVec3Scalar(tileCenter, -1, math.vec3());

        const rtcAABB = math.AABB3(); // AABB centered at the RTC origin

        rtcAABB[0] = tileAABB[0] - tileCenter[0];
        rtcAABB[1] = tileAABB[1] - tileCenter[1];
        rtcAABB[2] = tileAABB[2] - tileCenter[2];
        rtcAABB[3] = tileAABB[3] - tileCenter[0];
        rtcAABB[4] = tileAABB[4] - tileCenter[1];
        rtcAABB[5] = tileAABB[5] - tileCenter[2];

        for (let i = 0; i < entities.length; i++) {

            const entity = entities [i];

            const meshes = entity.meshes;

            for (let j = 0, lenj = meshes.length; j < lenj; j++) {

                const mesh = meshes[j];
                const geometry = mesh.geometry;

                if (!geometry.reused) {

                    const positions = geometry.positions;

                    // Center positions relative to their tile's World-space center

                    for (let k = 0, lenk = positions.length; k < lenk; k += 3) {

                        positions[k + 0] -= tileCenter[0];
                        positions[k + 1] -= tileCenter[1];
                        positions[k + 2] -= tileCenter[2];
                    }

                    // Quantize positions relative to tile's RTC-space boundary

                    geometryCompression.quantizePositions(positions, positions.length, rtcAABB, geometry.positionsQuantized);

                    numBatchingEntities++;

                } else {

                    // Post-multiply a translation to the mesh's modeling matrix
                    // to center the entity's geometry instances to the tile RTC center

                    math.translateMat4v(tileCenterNeg, mesh.matrix);
                }
            }

            entity.entityIndex = this.entitiesList.length;

            this.entitiesList.push(entity);
        }

        const tile = new XKTTile(tileAABB, entities);

        this.tilesList.push(tile);
    }

    _createReusedGeometriesDecodeMatrix() {

        const tempVec3a = math.vec3();
        const reusedGeometriesAABB = math.collapseAABB3(math.AABB3());
        let countReusedGeometries = 0;

        for (let geometryIndex = 0, numGeometries = this.geometriesList.length; geometryIndex < numGeometries; geometryIndex++) {

            const geometry = this.geometriesList [geometryIndex];

            if (geometry.reused) {

                const positions = geometry.positions;

                for (let i = 0, len = positions.length; i < len; i += 3) {

                    tempVec3a[0] = positions[i];
                    tempVec3a[1] = positions[i + 1];
                    tempVec3a[2] = positions[i + 2];

                    math.expandAABB3Point3(reusedGeometriesAABB, tempVec3a);
                }

                countReusedGeometries++;
            }
        }

        if (countReusedGeometries > 0) {

            geometryCompression.createPositionsDecodeMatrix(reusedGeometriesAABB, this.reusedGeometriesDecodeMatrix);

            for (let geometryIndex = 0, numGeometries = this.geometriesList.length; geometryIndex < numGeometries; geometryIndex++) {

                const geometry = this.geometriesList [geometryIndex];

                if (geometry.reused) {
                    geometryCompression.quantizePositions(geometry.positions, geometry.positions.length, reusedGeometriesAABB, geometry.positionsQuantized);
                }
            }

        } else {
            math.identityMat4(this.reusedGeometriesDecodeMatrix); // No need for this matrix, but we'll be tidy and set it to identity
        }
    }

    _flagSolidGeometries() {
        for (let i = 0, len = this.geometriesList.length; i < len; i++) {
            const geometry = this.geometriesList[i];
            if (geometry.primitiveType === "triangles") {
                geometry.solid = isTriangleMeshSolid(geometry.indices, geometry.positionsQuantized); // Better memory/cpu performance with quantized values
            }
        }
    }
}

export {XKTModel};