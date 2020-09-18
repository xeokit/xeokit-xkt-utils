import {math} from "./lib/math.js";
import {geometryCompression} from "./lib/geometryCompression.js";
import {buildEdgeIndices} from "./lib/buildEdgeIndices.js";
import {XKTPrimitiveInstance} from './XKTPrimitiveInstance.js';
import {XKTPrimitive} from './XKTPrimitive.js';
import {XKTEntity} from './XKTEntity.js';
import {XKTTile} from './XKTTile.js';
import {KDNode} from "./KDNode.js";

const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4([0, 0, 0, 1]);
const tempMat4 = math.mat4();
const tempMat4b = math.mat4();

const KD_TREE_MAX_DEPTH = 5; // Increase if greater precision needed
const kdTreeDimLength = new Float32Array(3);

/**
 * A document model that represents the contents of an .XKT V6 file.
 *
 * An XKTModel contains {@link XKTTile}s, which spatially subdivide the model into regions. Each {@link XKTTile}
 * contains {@link XKTEntity}s, which represent the objects within its region. Each {@link XKTEntity}
 * has {@link XKTPrimitiveInstance}s, which indicate the {@link XKTPrimitive}s that comprise the {@link XKTEntity}.
 *
 * * Import glTF into an XKTModel using {@link loadXKTModelFromGLTF}
 * * Build an XKTModel programmatically using {@link XKTModel#createPrimitive} and {@link XKTModel#createEntity}
 * * Serialize an XKTModel to an ArrayBuffer using {@link writeXKTModelToArrayBuffer}
 *
 * ## Usage
 *
 * Procedurally building a simple table model in an XKTModel:
 *
 * ````javascript
 * const xktModel = new XKTModel();
 *
 * xktModel.createPrimitive({
 *      primitiveId: "legPrimitive",
 *      primitiveType: "triangles",
 *      positions: [
 *          1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1,
 *          -1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, -1,
 *          -1, -1, -1, -1, -1, 1, -1, 1, 1, -1
 *      ],
 *      normals: [
 *          0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
 *          -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0,
 *          -1, 0, 0, -1
 *      ],
 *      indices: [
 *          0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19,
 *          20, 21, 22, 20, 22, 23
 *      ],
 *      color: [255, 0, 0],
 *      opacity: 255
 *  });
 *
 * xktModel.createEntity({
 *      entityId: "leg1",
 *      primitiveIds: ["legPrimitive"],
 *      position: [-4, -6, -4],
 *      scale: [1, 3, 1],
 *      rotation: [0, 0, 0]
 *  });
 *
 * xktModel.createEntity({
 *      entityId: "leg2",
 *      primitiveIds: ["legPrimitive"],
 *      position: [4, -6, -4],
 *      scale: [1, 3, 1],
 *      rotation: [0, 0, 0]
 *  });
 *
 * xktModel.createEntity({
 *      entityId: "leg3",
 *      primitiveIds: ["legPrimitive"],
 *      position: [4, -6, 4],
 *      scale: [1, 3, 1],
 *      rotation: [0, 0, 0]
 *  });
 *
 * xktModel.createEntity({
 *      entityId: "leg4",
 *      primitiveIds: ["legPrimitive"],
 *      position: [-4, -6, 4],
 *      scale: [1, 3, 1],
 *      rotation: [0, 0, 0]
 *  });
 *
 * xktModel.createEntity({
 *      entityId: "top",
 *      primitiveIds: ["legPrimitive"],
 *      position: [0, -3, 0],
 *      scale: [6, 0.5, 6],
 *      rotation: [0, 0, 0]
 *  });
 *
 * xktModel.finalize();
 *````
 *
 * Using {@link writeXKTModelToArrayBuffer} to write the XKTModel to an array buffer:
 *
 * ````javascript
 * const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
 * ````
 *
 * Using {@link validateXKTArrayBuffer} to validate the array buffer against the XKTModel:
 *
 * ````javascript
 * const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);
 *
 * if (!xktArrayValid) {
 *     console.error("XKT array buffer is invalid!");
 * }
 * ````
 *
 * @class XKTModel
 */
class XKTModel {

    /**
     * Constructs a new XKTModel.
     *
     * @param {*} cfg Configuration
     */
    constructor(cfg = {}) {

        /**
         * The positions of all shared {@link XKTPrimitive}s are de-quantized using this singular
         * de-quantization matrix.
         *
         * This de-quantization matrix is which is generated from the collective boundary of the
         * positions of all shared {@link XKTPrimitive}s.
         *
         * @type {Float32Array}
         */
        this.reusedPrimitivesDecodeMatrix = new Float32Array(16);

        /**
         * {@link XKTPrimitive}s within this XKTModel, each mapped to {@link XKTPrimitive#primitiveId}.
         *
         * Created by {@link XKTModel#createPrimitive}.
         *
         * @type {{Number:XKTPrimitive}}
         */
        this.primitives = {};

        /**
         * {@link XKTPrimitive}s within this XKTModel, in the order they were created.
         *
         * Created by {@link XKTModel#createPrimitive}.
         *
         * @type {XKTPrimitive[]}
         */
        this.primitivesList = [];

        /**
         * {@link XKTPrimitiveInstance}s within this XKTModel, in the order they were created.
         *
         * Created by {@link XKTModel#createEntity}.
         *
         * @type {XKTPrimitiveInstance[]}
         */
        this.primitiveInstancesList = [];

        /**
         * {@link XKTEntity}s within this XKTModel, each mapped to {@link XKTEntity#entityId}.
         *
         * Created by {@link XKTModel#createEntity}.
         *
         * @type {{String:XKTEntity}}
         */
        this.entities = {};

        /**
         * {@link XKTEntity}s within this XKTModel, in the order they were created.
         *
         * Created by {@link XKTModel#createEntity}.
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
     * Creates an {@link XKTPrimitive} within this XKTModel.
     *
     * Logs error and does nothing if this XKTModel has been (see {@link XKTModel#finalized}).
     *
     * @param {*} params Method parameters.
     * @param {Number} params.primitiveId Unique ID for the {@link XKTPrimitive}.
     * @param {String} params.primitiveType The type of {@link XKTPrimitive}: "triangles", "lines" or "points"
     * @param {Float32Array} [params.matrix] Modeling matrix for the {@link XKTPrimitive}. Overrides ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [params.position=[0,0,0]] Position of the {@link XKTPrimitive}. Overridden by the ````matrix```` parameter.
     * @param {Number[]} [params.scale=[1,1,1]] Scale of the {@link XKTPrimitive}. Overridden by the ````matrix```` parameter.
     * @param {Number[]} [params.rotation=[0,0,0]] Rotation of the {@link XKTPrimitive} as Euler angles given in degrees, for each of the X, Y and Z axis. Overridden by the ````matrix```` parameter.
     * @param {Uint8Array} params.color RGB color for the {@link XKTPrimitive}, with each color component in range [0..1].
     * @param {Number} params.opacity Opacity factor for the {@link XKTPrimitive}, in range [0..1].
     * @param {Float32Array} params.positions Floating-point Local-space vertex positions for the {@link XKTPrimitive}.
     * @param {Number[]} params.normals Floating-point vertex normals for the {@link XKTPrimitive}.
     * @param {Uint32Array} params.indices Triangle mesh indices for the {@link XKTPrimitive}.
     * @returns {XKTPrimitive} The new {@link XKTPrimitive}.
     */
    createPrimitive(params) {

        if (!params) {
            throw "Parameters missing: params";
        }

        if (params.primitiveId === null || params.primitiveId === undefined) {
            throw "Parameter missing: params.primitiveId";
        }

        if (!params.primitiveType) {
            throw "Parameter missing: params.primitiveType";
        }

        if (!params.color) {
            throw "Parameter missing: params.color";
        }

        if (params.opacity === null || params.opacity === undefined) {
            throw "Parameter missing: params.opacity";
        }

        if (!params.positions) {
            throw "Parameter missing: params.positions";
        }

        if (!params.normals) {
            throw "Parameter missing: params.normals";
        }

        if (!params.indices) {
            throw "Parameter missing: params.indices";
        }

        if (this.finalized) {
            console.error("XKTModel has been finalized, can't add more primitives");
            return;
        }

        const primitiveId = params.primitiveId;
        const primitiveType = params.primitiveType;
        let matrix = params.matrix;
        const position = params.position;
        const scale = params.scale;
        const rotation = params.rotation;
        const color = params.color;
        const opacity = params.opacity;
        const positions = params.positions.slice(); // May modify in #finalize
        const normals = params.normals.slice(); // Will modify
        const indices = params.indices;
        const edgeIndices = buildEdgeIndices(positions, indices, null, 10);

        if (!matrix) {
            if (position || scale || rotation) {
                matrix = math.identityMat4();
                const quaternion = math.eulerToQuaternion(rotation || [0, 0, 0], "XYZ", math.identityQuaternion());
                math.composeMat4(position || [0, 0, 0], quaternion, scale || [1, 1, 1], matrix)
            }
        }

        matrix = matrix || math.identityMat4();

        if (matrix && (!math.isIdentityMat4(matrix))) { // Bake positions into World-space
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

        // TODO: Oct-encode normals, in World-space if not reused, otherwise in Model-space?

        const modelNormalMatrix = math.inverseMat4(math.transposeMat4(matrix, tempMat4b), tempMat4);
        const normalsOctEncoded = new Int8Array(normals.length);

        geometryCompression.transformAndOctEncodeNormals(modelNormalMatrix, normals, normals.length, normalsOctEncoded, 0);

        const primitiveIndex = this.primitivesList.length;

        const primitive = new XKTPrimitive(primitiveId, primitiveType, primitiveIndex, color, opacity, positions, normalsOctEncoded, indices, edgeIndices);

        this.primitives[primitiveId] = primitive;
        this.primitivesList.push(primitive);

        return primitive;
    }

    /**
     * Creates an {@link XKTEntity} within this XKTModel.
     *
     * Logs error and does nothing if this XKTModel has been finalized (see {@link XKTModel#finalized}).
     *
     * @param {*} params Method parameters.
     * @param {String} params.entityId Unique ID for the {@link XKTEntity}.
     * @param {Float32Array} [params.matrix] Modeling matrix for the {@link XKTEntity}. Overrides ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [params.position=[0,0,0]] Position of the {@link XKTEntity}. Overridden by the ````matrix```` parameter.
     * @param {Number[]} [params.scale=[1,1,1]] Scale of the {@link XKTEntity}. Overridden by the ````matrix```` parameter.
     * @param {Number[]} [params.rotation=[0,0,0]] Rotation of the {@link XKTEntity} as Euler angles given in degrees, for each of the X, Y and Z axis. Overridden by the ````matrix```` parameter.

     * @param {String[]} params.primitiveIds IDs of {@link XKTPrimitive}s used by the {@link XKTEntity}.
     * @returns {XKTEntity} The new {@link XKTEntity}.
     */
    createEntity(params) {

        if (!params) {
            throw "Parameters missing: params";
        }

        if (params.entityId === null || params.entityId === undefined) {
            throw "Parameter missing: params.entityId";
        }

        if (!params.primitiveIds) {
            throw "Parameter missing: params.primitiveIds";
        }

        if (this.finalized) {
            console.error("XKTModel has been finalized, can't add more entities");
            return;
        }

        const entityId = params.entityId;
        const entityIndex = this.entitiesList.length;
        let matrix = params.matrix;
        const position = params.position;
        const scale = params.scale;
        const rotation = params.rotation;
        const primitiveIds = params.primitiveIds;
        const primitiveInstances = [];

        if (!matrix) {
            if (position || scale || rotation) {
                matrix = math.identityMat4();
                const quaternion = math.eulerToQuaternion(rotation || [0, 0, 0], "XYZ", math.identityQuaternion());
                math.composeMat4(position || [0, 0, 0], quaternion, scale || [1, 1, 1], matrix)
            } else {
                matrix = math.identityMat4();
            }
        }

        for (let primitiveIdIdx = 0, primitiveIdLen = primitiveIds.length; primitiveIdIdx < primitiveIdLen; primitiveIdIdx++) {

            const primitiveId = primitiveIds[primitiveIdIdx];
            const primitive = this.primitives[primitiveId];

            if (!primitive) {
                console.error("Primitive not found: " + primitiveId);
                continue;
            }

            primitive.numInstances++;

            const primitiveInstanceIndex = this.primitiveInstancesList.length;
            const primitiveInstance = new XKTPrimitiveInstance(primitiveInstanceIndex, primitive);

            primitiveInstances.push(primitiveInstance);

            this.primitiveInstancesList.push(primitiveInstance);
        }

        const entity = new XKTEntity(entityId, entityIndex, matrix, primitiveInstances);

        for (let i = 0, len = primitiveInstances.length; i < len; i++) {
            const primitiveInstance = primitiveInstances[i];
            primitiveInstance.entity = entity;
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
     * * sets each {@link XKTEntity}'s {@link XKTEntity#hasReusedPrimitives} true if it shares its {@link XKTPrimitive}s with other {@link XKTEntity}s,
     * * creates each {@link XKTEntity}'s {@link XKTEntity#aabb},
     * * creates {@link XKTTile}s in {@link XKTModel#tilesList}, and
     * * sets {@link XKTModel#finalized} ````true````.
     */
    finalize() {

        if (this.finalized) {
            console.log("XKTModel already finalized");
            return;
        }

        this._flagEntitiesThatReusePrimitives();

        this._createEntityAABBs();

        const rootKDNode = this._createKDTree();

        this._createTilesFromKDTree(rootKDNode);

        this._createReusedPrimitivesDecodeMatrix();

        this.finalized = true;
    }

    _flagEntitiesThatReusePrimitives() {

        for (let i = 0, len = this.entitiesList.length; i < len; i++) {

            const entity = this.entitiesList[i];
            const primitiveInstances = entity.primitiveInstances;

            for (let j = 0, lenj = primitiveInstances.length; j < lenj; j++) {

                const primitiveInstance = primitiveInstances[j];
                const primitive = primitiveInstance.primitive;

                if (primitive.numInstances > 1) {
                    entity.hasReusedPrimitives = true;
                }
            }
        }
    }

    _createEntityAABBs() {

        for (let i = 0, len = this.entitiesList.length; i < len; i++) {

            const entity = this.entitiesList[i];
            const primitiveInstances = entity.primitiveInstances;

            math.collapseAABB3(entity.aabb);

            for (let j = 0, lenj = primitiveInstances.length; j < lenj; j++) {

                const primitiveInstance = primitiveInstances[j];
                const primitive = primitiveInstance.primitive;

                if (primitive.numInstances > 1) {

                    const positions = primitive.positions;
                    for (let i = 0, len = positions.length; i < len; i += 3) {
                        tempVec4a[0] = positions[i + 0];
                        tempVec4a[1] = positions[i + 1];
                        tempVec4a[2] = positions[i + 2];
                        math.transformPoint4(entity.matrix, tempVec4a, tempVec4b);
                        math.expandAABB3Point3(entity.aabb, tempVec4b);
                    }

                } else {

                    const positions = primitive.positions;
                    for (let i = 0, len = positions.length; i < len; i += 3) {
                        tempVec4a[0] = positions[i + 0];
                        tempVec4a[1] = positions[i + 1];
                        tempVec4a[2] = positions[i + 2];
                        math.expandAABB3Point3(entity.aabb, tempVec4a);
                    }
                }
            }
        }
    }

    _createKDTree() {

        const aabb = math.collapseAABB3();

        for (let entityId in this.entities) {
            if (this.entities.hasOwnProperty(entityId)) {
                const entity = this.entities[entityId];
                math.expandAABB3(aabb, entity.aabb);
            }
        }

        const rootKDNode = new KDNode(aabb);

        for (let entityId in this.entities) {
            if (this.entities.hasOwnProperty(entityId)) {
                const entity = this.entities[entityId];
                const depth = 0;
                const maxKDNodeDepth = KD_TREE_MAX_DEPTH;
                this._insertEntityIntoKDTree(rootKDNode, entity, depth + 1, maxKDNodeDepth);
            }
        }

        return rootKDNode;
    }

    _insertEntityIntoKDTree(kdNode, entity, depth, maxKDTreeDepth) {

        const nodeAABB = kdNode.aabb;
        const entityAABB = entity.aabb;

        if (depth >= maxKDTreeDepth) {
            kdNode.entities = kdNode.entities || [];
            kdNode.entities.push(entity);
            math.expandAABB3(nodeAABB, entityAABB);
            return;
        }

        if (kdNode.left) {
            if (math.containsAABB3(kdNode.left.aabb, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.left, entity, depth + 1, maxKDTreeDepth);
                return;
            }
        }

        if (kdNode.right) {
            if (math.containsAABB3(kdNode.right.aabb, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.right, entity, depth + 1, maxKDTreeDepth);
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
                this._insertEntityIntoKDTree(kdNode.left, entity, depth + 1, maxKDTreeDepth);
                return;
            }
        }

        if (!kdNode.right) {
            const aabbRight = nodeAABB.slice();
            aabbRight[dim] = ((nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0);
            kdNode.right = new KDNode(aabbRight);
            if (math.containsAABB3(aabbRight, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.right, entity, depth + 1, maxKDTreeDepth);
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
     * For each single-use {@link XKTPrimitive}, this method centers {@link XKTPrimitive#positions} to make them relative to the
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
        const rtcAABB = math.AABB3(); // AABB centered at the RTC origin

        rtcAABB[0] = tileAABB[0] - tileCenter[0];
        rtcAABB[1] = tileAABB[1] - tileCenter[1];
        rtcAABB[2] = tileAABB[2] - tileCenter[2];
        rtcAABB[3] = tileAABB[3] - tileCenter[0];
        rtcAABB[4] = tileAABB[4] - tileCenter[1];
        rtcAABB[5] = tileAABB[5] - tileCenter[2];

        for (let i = 0; i < entities.length; i++) {

            const entity = entities [i];

            const primitiveInstances = entity.primitiveInstances;

            for (let j = 0, lenj = primitiveInstances.length; j < lenj; j++) {

                const primitiveInstance = primitiveInstances[j];
                const primitive = primitiveInstance.primitive;

                if (!primitive.reused) {

                    const positions = primitive.positions;

                    // Center positions relative to their tile's World-space center

                    for (let k = 0, lenk = positions.length; k < lenk; k += 3) {

                        positions[k + 0] -= tileCenter[0];
                        positions[k + 1] -= tileCenter[1];
                        positions[k + 2] -= tileCenter[2];

                        // positions[k + 0] -= 15;
                        // positions[k + 1] -= 15;
                        // positions[k + 2] -= 15;
                    }

                    // Quantize positions relative to tile's RTC-space boundary

                    geometryCompression.quantizePositions(positions, positions.length, rtcAABB, primitive.positionsQuantized);

                    numBatchingEntities++;
                } else {


                }
            }
        }

        const decodeMatrix = math.mat4();

        geometryCompression.createPositionsDecodeMatrix(rtcAABB, decodeMatrix);

        const tile = new XKTTile(tileAABB, decodeMatrix, entities);

        this.tilesList.push(tile);
    }

    _createReusedPrimitivesDecodeMatrix() {

        const tempVec3a = math.vec3();
        const reusedPrimitivesAABB = math.collapseAABB3(math.AABB3());
        let countReusedPrimitives = 0;

        for (let primitiveIndex = 0, numPrimitives = this.primitivesList.length; primitiveIndex < numPrimitives; primitiveIndex++) {

            const primitive = this.primitivesList [primitiveIndex];

            if (primitive.reused) {

                const positions = primitive.positions;

                for (let i = 0, len = positions.length; i < len; i += 3) {

                    tempVec3a[0] = positions[i];
                    tempVec3a[1] = positions[i + 1];
                    tempVec3a[2] = positions[i + 2];

                    math.expandAABB3Point3(reusedPrimitivesAABB, tempVec3a);
                }

                countReusedPrimitives++;
            }
        }

        if (countReusedPrimitives > 0) {
            geometryCompression.createPositionsDecodeMatrix(reusedPrimitivesAABB, this.reusedPrimitivesDecodeMatrix);

        } else {
            math.identityMat4(this.reusedPrimitivesDecodeMatrix); // No need for this matrix, but we'll be tidy and set it to identity
        }
    }
}

export {XKTModel};