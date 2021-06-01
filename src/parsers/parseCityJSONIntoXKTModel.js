import {earcut} from './../lib/earcut';
import {math} from "./../lib/math.js";
import {buildFaceNormals} from "../lib/buildFaceNormals.js";

const tempVec2a = math.vec2();
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

const OBJECT_COLORS = {
    "Building": [0.455, 0.592, 0.875],
    "BuildingPart": [0.455, 0.592, 0.875],
    "BuildingInstallation": [0.455, 0.592, 0.875],
    "Bridge": [.6, .6, .6],
    "BridgePart": [.6, .6, .6],
    "BridgeInstallation": [.6, .6, .6],
    "BridgeConstructionElement": [.6, .6, .6],
    "CityObjectGroup": [1, 1, 0.702],
    "CityFurniture": [.8, 0, 0],
    "GenericCityObject": [.8, 0, 0],
    "LandUse": [1, 1, 0.702],
    "PlantCover": [0.224, 0.675, 0.224],
    "Railway": [0.1, 0.1, 0.1],
    "Road": [.6, .6, .6],
    "SolitaryVegetationObject": [0.224, 0.675, 0.224],
    "TINRelief": [1, 0.859, 0.6],
    "TransportSquare": [.6, .6, .6],
    "Tunnel": [.6, .6, .6],
    "TunnelPart": [.6, .6, .6],
    "TunnelInstallation": [.6, .6, .6],
    "WaterBody": [0.302, 0.651, 1]
};

const DEFAULT_COLOR = [0.9, 0.9, 0.9];


/**
 * @desc Parses CityJSON models into an {@link XKTModel}.
 *
 * [CityJSON](https://www.cityjson.org) is a JSON-based encoding for a subset of the CityGML data model (version 2.0.0),
 * which is an open standardised data model and exchange format to store digital 3D models of cities and
 * landscapes. CityGML is an official standard of the [Open Geospatial Consortium](https://www.ogc.org/).
 *
 * ## Usage
 *
 * In the example below we'll create an {@link XKTModel}, then load a CityJSON model into it.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#parsers_CityJSON_DenHaag)]
 *
 * ````javascript
 * utils.loadJSON("./models/cityjson/DenHaag.json", async (cityJSONData) => {
 *
 *     const xktModel = new XKTModel();
 *
 *     parseCityJSONIntoXKTModel({cityJSONData, xktModel});
 *
 *     xktModel.finalize();
 * });
 * ````
 *
 * @param {Object} params Parsing params.
 * @param {Object} params.cityJSONData CityJSON data.
 * @param {XKTModel} params.xktModel XKTModel to parse into.
 */
async function parseCityJSONIntoXKTModel({cityJSONData, xktModel, gotNormal}) {

    if (!cityJSONData) {
        throw "Argument expected: cityJSONData";
    }

    if (!xktModel) {
        throw "Argument expected: xktModel";
    }

    const ctx = {cityJSONData, xktModel, nextId: 0, gotNormal};

    await parse(ctx);
}

function parse(ctx) {

    const xktModel = ctx.xktModel;
    const cityJSONData = ctx.cityJSONData;
    const cityObjects = cityJSONData.CityObjects;

    for (const objectId in cityObjects) {
        if (cityObjects.hasOwnProperty(objectId)) {

            const cityObject = cityObjects[objectId];
            const metaObjectType = cityObject.type;
            const objectColor = OBJECT_COLORS[metaObjectType] || DEFAULT_COLOR;

            if (!(cityObject.geometry && cityObject.geometry.length > 0)) {
                continue;
            }

            const geometryCfg = {
                positions: [],
                indices: []
            };

            const sharedIndices = [];

            for (let i = 0, len = cityObject.geometry.length; i < len; i++) {

                const geometry = cityObject.geometry[i];
                const geomType = geometry.type;

                if (geomType === "Solid") {
                    const shells = geometry.boundaries;
                    for (let j = 0; j < shells.length; j++) {
                        const shell = shells[j];
                        parseShell(ctx, shell, sharedIndices, geometryCfg);
                    }

                } else if (geomType === "MultiSurface" || geomType === "CompositeSurface") {
                    const surfaces = geometry.boundaries;
                    parseShell(ctx, surfaces, sharedIndices, geometryCfg);

                } else if (geomType === "MultiSolid" || geomType === "CompositeSolid") {
                    const solids = geometry.boundaries;
                    for (let j = 0; j < solids.length; j++) {
                        for (let k = 0; k < solids[j].length; k++) {
                            const shell = solids[j][k];
                            parseShell(ctx, shell, sharedIndices, geometryCfg);
                        }
                    }
                }
            }

            const geometryId = "" + ctx.nextId++;
            const meshId = "" + ctx.nextId++;
            const entityId = "" + ctx.nextId++;

            const positionsDisjoint = [];
            const indicesDisjoint = [];
            const normals = [];

            buildDisjointTriangles(geometryCfg.positions, geometryCfg.indices, positionsDisjoint, indicesDisjoint);

            buildFaceNormals(positionsDisjoint, indicesDisjoint, normals);

            xktModel.createGeometry({
                geometryId: geometryId,
                primitiveType: "triangles",
                positions: positionsDisjoint,
                normals: normals,
                indices: indicesDisjoint
            });

            xktModel.createMesh({
                meshId: meshId,
                geometryId: geometryId,
                color: objectColor,
                opacity: 1
            });

            xktModel.createEntity({
                entityId: entityId,
                meshIds: [meshId]
            });

            xktModel.createMetaObject({
                metaObjectId: entityId,
                metaObjectName: metaObjectType,
                metaObjectType: metaObjectType
            });
        }
    }
}

function parseShell(ctx, boundaries, sharedIndices, primitiveCfg) {

    const cityJSONData = ctx.cityJSONData;
    const vertices = cityJSONData.vertices;

    for (let i = 0; i < boundaries.length; i++) {

        let boundary = [];
        let holes = [];

        for (let j = 0; j < boundaries[i].length; j++) {

            if (boundary.length > 0) {
                holes.push(boundary.length);
            }

            const newBoundary = extractLocalIndices(ctx, boundaries[i][j], sharedIndices, primitiveCfg);

            boundary.push(...newBoundary);
        }

        if (boundary.length === 3) { // Triangle

            primitiveCfg.indices.push(boundary[0]);
            primitiveCfg.indices.push(boundary[1]);
            primitiveCfg.indices.push(boundary[2]);

        } else if (boundary.length > 3) { // Polygon

            // Prepare to triangulate

            let pList = [];

            for (let k = 0; k < boundary.length; k++) {
                pList.push({
                    x: vertices[sharedIndices[boundary[k]]][0],
                    y: vertices[sharedIndices[boundary[k]]][1],
                    z: vertices[sharedIndices[boundary[k]]][2]
                });
            }

            const normal = getNormalOfPositions(pList, math.vec3());

            // Convert to 2D

            let pv = [];

            for (let k = 0; k < pList.length; k++) {

                to2D(pList[k], normal, tempVec2a);

                pv.unshift(tempVec2a[0]);
                pv.unshift(tempVec2a[1]);
            }

            // Triangulate

            const tr = earcut(pv, holes, 2);

            // Create triangles

            for (let k = 0; k < tr.length; k += 3) {
                primitiveCfg.indices.unshift(boundary[tr[k]]);
                primitiveCfg.indices.unshift(boundary[tr[k + 1]]);
                primitiveCfg.indices.unshift(boundary[tr[k + 2]]);
            }
        }
    }
}

function extractLocalIndices(ctx, boundary, sharedIndices, primitiveCfg) {

    const cityJSONData = ctx.cityJSONData;
    const vertices = cityJSONData.vertices;
    const newBoundary = []

    for (let i = 0, len = boundary.length; i < len; i++) {

        const index = boundary[i];

        if (sharedIndices.includes(index)) {
            const vertexIndex = sharedIndices.indexOf(index);
            newBoundary.push(vertexIndex);

        } else {
            primitiveCfg.positions.push(vertices[index][0]);
            primitiveCfg.positions.push(vertices[index][1]);
            primitiveCfg.positions.push(vertices[index][2]);

            newBoundary.push(sharedIndices.length);

            sharedIndices.push(index);
        }
    }

    return newBoundary
}

function getNormalOfPositions(positions, normal) {

    for (let i = 0; i < positions.length; i++) {

        let nexti = i + 1;
        if (nexti === positions.length) {
            nexti = 0;
        }

        normal[0] += ((positions[i].y - positions[nexti].y) * (positions[i].z + positions[nexti].z));
        normal[1] += ((positions[i].z - positions[nexti].z) * (positions[i].x + positions[nexti].x));
        normal[2] += ((positions[i].x - positions[nexti].x) * (positions[i].y + positions[nexti].y));
    }

    return math.normalizeVec3(normal);
}

function buildDisjointTriangles(positions, indices, positionsDisjoint, indicesDisjoint) {

    for (let i = 0, len = indices.length; i < len; i++) {

        const idx = indices[i];
        const x = positions[(idx * 3) + 0];
        const y = positions[(idx * 3) + 1];
        const z = positions[(idx * 3) + 2];

        positionsDisjoint.push(x);
        positionsDisjoint.push(y);
        positionsDisjoint.push(z);

        indicesDisjoint.push(i);
    }
}

function to2D(_p, _n, re) {

    const p = tempVec3a;
    const n = tempVec3b;
    const x3 = tempVec3c;

    p[0] = _p.x;
    p[1] = _p.y;
    p[2] = _p.z;

    n[0] = _n.x;
    n[1] = _n.y;
    n[2] = _n.z;

    x3[0] = 1.1;
    x3[1] = 1.1;
    x3[2] = 1.1;

    const dist = math.lenVec3(math.subVec3(x3, n));

    if (dist < 0.01) {
        x3[0] += 1.0;
        x3[1] += 2.0;
        x3[2] += 3.0;
    }

    const dot = math.dotVec3(x3, n);
    const tmp2 = math.mulVec3Scalar(n, dot, math.vec3());

    x3[0] -= tmp2[0];
    x3[1] -= tmp2[1];
    x3[2] -= tmp2[2];

    math.normalizeVec3(x3);

    const y3 = math.cross3Vec3(n, x3, math.vec3());
    const x = math.dotVec3(p, x3);
    const y = math.dotVec3(p, y3);

    re[0] = x;
    re[1] = y;
}

export {parseCityJSONIntoXKTModel};