import {earcut} from './../lib/earcut';
import {math} from "./../lib/math.js";

const tempVec2a = math.vec2();
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

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
 * @param {function} [params.log] Logging callback.
 */
async function parseCityJSONIntoXKTModel({cityJSONData, xktModel, log}) {

    if (!cityJSONData) {
        throw "Argument expected: cityJSONData";
    }

    if (cityJSONData.type !== "CityJSON") {
        throw "Invalid argument: cityJSONData is not a CityJSON file";
    }

    if (!xktModel) {
        throw "Argument expected: xktModel";
    }

    const vertices = cityJSONData.transform // Avoid side effects - don't modify the CityJSON data
        ? transformVertices(cityJSONData.vertices, cityJSONData.transform)
        : cityJSONData.vertices;

    const ctx = {
        cityJSONData,
        vertices,
        xktModel,
        log: (log || function (msg) {
        }),
        nextId: 0
    };

    ctx.xktModel.schema = cityJSONData.type + " " + cityJSONData.version;

    ctx.log("Converting " + ctx.xktModel.schema);

    await parse(ctx);
}

function transformVertices(vertices, transform) {

    const transformedVertices = [];
    const scale = transform.scale || math.vec3([1, 1, 1]);
    const translate = transform.translate || math.vec3([0, 0, 0]);

    for (let i = 0, j = 0; i < vertices.length; i++, j += 3) {

        const x = (vertices[i][0] * scale[0]) + translate[0];
        const y = (vertices[i][1] * scale[1]) + translate[1];
        const z = (vertices[i][2] * scale[2]) + translate[2];

        transformedVertices.push([x, y, z]);
    }

    return transformedVertices;
}

function parse(ctx) {

    const xktModel = ctx.xktModel;

    const cityJSONData = ctx.cityJSONData;
    const extensions = cityJSONData.extensions;
    const metadata = cityJSONData.metadata;
    const cityObjects = cityJSONData.CityObjects;
    const transform = cityJSONData.transform;

    let countGeometries = 0;
    let countObjects = 0;

    const rootMetaObject = xktModel.createMetaObject({
        metaObjectId: "myModel",
        metaObjectName: "CityJSON",
        metaObjectType: "CityJSON"
    });

    for (const objectId in cityObjects) {
        if (cityObjects.hasOwnProperty(objectId)) {

            const cityObject = cityObjects[objectId];
            const metaObjectType = cityObject.type;

            xktModel.createMetaObject({
                metaObjectId: objectId,
                metaObjectName: metaObjectType + " : " + objectId,
                metaObjectType: metaObjectType,
                parentMetaObjectId: cityObject.parents ? cityObject.parents[0] : rootMetaObject.metaObjectId
            });

            if (!(cityObject.geometry && cityObject.geometry.length > 0)) {
                continue;
            }

            const meshIds = [];
            const sharedIndices = [];

            for (let i = 0, len = cityObject.geometry.length; i < len; i++) {

                const geometry = cityObject.geometry[i];
                const geomType = geometry.type;

                let objectMaterial;
                let surfaceMaterials;

                const appearance = cityJSONData.appearance;
                if (appearance) {
                    const materials = appearance.materials;
                    if (materials) {

                        const geometryMaterial = geometry.material;
                        if (geometryMaterial) {

                            const themeIds = Object.keys(geometryMaterial);

                            if (themeIds.length > 0) {

                                const themeId = themeIds[0];
                                const theme = geometryMaterial[themeId];

                                if (theme.value !== undefined) {

                                    objectMaterial = materials[theme.value];

                                } else {
                                    const values = theme.values;
                                    if (values) {
                                        surfaceMaterials = [];
                                        for (let j = 0, lenj = values.length; j < lenj; j++) {
                                            const value = values[i];
                                            const surfaceMaterial = materials[value];

                                            surfaceMaterials.push(surfaceMaterial);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (surfaceMaterials) {

                    switch (geomType) {

                        case "MultiPoint":
                            break;

                        case "MultiLineString":
                            break;

                        case "MultiSurface":
                        case "CompositeSurface":
                            const surfaces = geometry.boundaries;

                            parseSurfacesWithOwnMaterials(ctx, surfaces, surfaceMaterials, meshIds);
                            break;

                        case "Solid":
                            const shells = geometry.boundaries;
                            for (let j = 0; j < shells.length; j++) {
                                const surfaces = shells[j];

                                parseSurfacesWithOwnMaterials(ctx, surfaces, surfaceMaterials, meshIds);
                            }
                            break;

                        case "MultiSolid":
                        case "CompositeSolid":
                            const solids = geometry.boundaries;
                            for (let j = 0; j < solids.length; j++) {
                                for (let k = 0; k < solids[j].length; k++) {
                                    const surfaces = solids[j][k];

                                    parseSurfacesWithOwnMaterials(ctx, surfaces, surfaceMaterials, meshIds);
                                }
                            }
                            break;

                        case "GeometryInstance":
                            break;
                    }

                } else {

                    const geometryCfg = {
                        positions: [],
                        indices: []
                    };

                    switch (geomType) {

                        case "MultiPoint":
                            break;

                        case "MultiLineString":
                            break;

                        case "MultiSurface":
                        case "CompositeSurface":
                            const surfaces = geometry.boundaries;

                            parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, geometryCfg);
                            break;

                        case "Solid":
                            const shells = geometry.boundaries;
                            for (let j = 0; j < shells.length; j++) {
                                const surfaces = shells[j];

                                parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, geometryCfg);
                            }
                            break;

                        case "MultiSolid":
                        case "CompositeSolid":
                            const solids = geometry.boundaries;
                            for (let j = 0; j < solids.length; j++) {
                                for (let k = 0; k < solids[j].length; k++) {
                                    const surfaces = solids[j][k];

                                    parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, geometryCfg);
                                }
                            }
                            break;

                        case "GeometryInstance":
                            break;
                    }

                    const geometryId = "" + ctx.nextId++;
                    const meshId = "" + ctx.nextId++;

                    xktModel.createGeometry({
                        geometryId: geometryId,
                        primitiveType: "triangles",
                        positions: geometryCfg.positions,
                        indices: geometryCfg.indices
                    });

                    xktModel.createMesh({
                        meshId: meshId,
                        geometryId: geometryId,
                        color: (objectMaterial && objectMaterial.diffuseColor) ? objectMaterial.diffuseColor : [0.8, 0.8, 0.8],
                        opacity: 1.0
                        //opacity: (objectMaterial && objectMaterial.transparency !== undefined) ? (1.0 - objectMaterial.transparency) : 1.0
                    });

                    meshIds.push(meshId);
                }
            }

            if (meshIds.length > 0) {

                xktModel.createEntity({
                    entityId: objectId,
                    meshIds: meshIds
                });

                countObjects++;
                countGeometries += meshIds.length;
            }
        }
    }

    // ctx.log("Converted objects: " + countObjects);
    // ctx.log("Converted geometries: " + countGeometries);
}

function parseMultiPoint(ctx, boundaries) {

}

function parseSurfacesWithOwnMaterials(ctx, surfaces, surfaceMaterials, meshIds) {

    const cityJSONData = ctx.cityJSONData;
    const vertices = ctx.vertices;
    const xktModel = ctx.xktModel;

    for (let i = 0; i < surfaces.length; i++) {

        const surface = surfaces[i];
        const surfaceMaterial = surfaceMaterials[i] || {diffuseColor: [0.8, 0.8, 0.8], transparency: 1.0};

        const face = [];
        const holes = [];

        const sharedIndices = [];

        const geometryCfg = {
            positions: [],
            indices: []
        };

        for (let j = 0; j < surface.length; j++) {

            if (face.length > 0) {
                holes.push(face.length);
            }

            const newFace = extractLocalIndices(ctx, surface[j], sharedIndices, geometryCfg);

            face.push(...newFace);
        }

        if (face.length === 3) { // Triangle

            geometryCfg.indices.push(face[0]);
            geometryCfg.indices.push(face[1]);
            geometryCfg.indices.push(face[2]);

        } else if (face.length > 3) { // Polygon

            // Prepare to triangulate

            const pList = [];

            for (let k = 0; k < face.length; k++) {
                pList.push({
                    x: vertices[sharedIndices[face[k]]][0],
                    y: vertices[sharedIndices[face[k]]][1],
                    z: vertices[sharedIndices[face[k]]][2]
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
                geometryCfg.indices.unshift(face[tr[k]]);
                geometryCfg.indices.unshift(face[tr[k + 1]]);
                geometryCfg.indices.unshift(face[tr[k + 2]]);
            }
        }

        const geometryId = "" + ctx.nextId++;
        const meshId = "" + ctx.nextId++;

        xktModel.createGeometry({
            geometryId: geometryId,
            primitiveType: "triangles",
            positions: geometryCfg.positions,
            indices: geometryCfg.indices
        });

        xktModel.createMesh({
            meshId: meshId,
            geometryId: geometryId,
            color: (surfaceMaterial && surfaceMaterial.diffuseColor) ? surfaceMaterial.diffuseColor : [0.8, 0.8, 0.8],
            opacity: 1.0
            //opacity: (surfaceMaterial && surfaceMaterial.transparency !== undefined) ? (1.0 - surfaceMaterial.transparency) : 1.0
        });

        meshIds.push(meshId);
    }
}

function parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, primitiveCfg) {
    const vertices = ctx.vertices;
    for (let i = 0; i < surfaces.length; i++) {
        let boundary = [];
        let holes = [];
        for (let j = 0; j < surfaces[i].length; j++) {
            if (boundary.length > 0) {
                holes.push(boundary.length);
            }
            const newBoundary = extractLocalIndices(ctx, surfaces[i][j], sharedIndices, primitiveCfg);
            boundary.push(...newBoundary);
        }
        if (boundary.length === 3) { // Triangle
            primitiveCfg.indices.push(boundary[0]);
            primitiveCfg.indices.push(boundary[1]);
            primitiveCfg.indices.push(boundary[2]);
        } else if (boundary.length > 3) { // Polygon
            let pList = [];
            for (let k = 0; k < boundary.length; k++) {
                pList.push({
                    x: vertices[sharedIndices[boundary[k]]][0],
                    y: vertices[sharedIndices[boundary[k]]][1],
                    z: vertices[sharedIndices[boundary[k]]][2]
                });
            }
            const normal = getNormalOfPositions(pList, math.vec3());
            let pv = [];
            for (let k = 0; k < pList.length; k++) {
                to2D(pList[k], normal, tempVec2a);
                pv.unshift(tempVec2a[0]);
                pv.unshift(tempVec2a[1]);
            }
            const tr = earcut(pv, holes, 2);
            for (let k = 0; k < tr.length; k += 3) {
                primitiveCfg.indices.unshift(boundary[tr[k]]);
                primitiveCfg.indices.unshift(boundary[tr[k + 1]]);
                primitiveCfg.indices.unshift(boundary[tr[k + 2]]);
            }
        }
    }
}

function extractLocalIndices(ctx, boundary, sharedIndices, geometryCfg) {

    const vertices = ctx.vertices;
    const newBoundary = []

    for (let i = 0, len = boundary.length; i < len; i++) {

        const index = boundary[i];

        if (sharedIndices.includes(index)) {
            const vertexIndex = sharedIndices.indexOf(index);
            newBoundary.push(vertexIndex);

        } else {
            geometryCfg.positions.push(vertices[index][0]);
            geometryCfg.positions.push(vertices[index][1]);
            geometryCfg.positions.push(vertices[index][2]);

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