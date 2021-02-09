import * as p from "./lib/pako.es.js";

let pako = p;
if (!pako.inflate) {  // See https://github.com/nodeca/pako/issues/97
    pako = pako.default;
}

const XKT_VERSION = 7; // XKT format version

/**
 * Writes an {@link XKTModel} to an {@link ArrayBuffer}.
 *
 * @param {XKTModel} xktModel The {@link XKTModel}.
 * @returns {ArrayBuffer} The {@link ArrayBuffer}.
 */
function writeXKTModelToArrayBuffer(xktModel) {

    const data = getModelData(xktModel);

    const deflatedData = deflateData(data);

    const arrayBuffer = createArrayBuffer(deflatedData);

    return arrayBuffer;
}

function getModelData(xktModel) {

    //------------------------------------------------------------------------------------------------------------------
    // Allocate data
    //------------------------------------------------------------------------------------------------------------------

    const geometriesList = xktModel.geometriesList;
    const meshesList = xktModel.meshesList;
    const entitiesList = xktModel.entitiesList;
    const tilesList = xktModel.tilesList;

    const numGeometries = geometriesList.length;
    const numMeshes = meshesList.length;
    const numEntities = entitiesList.length;
    const numTiles = tilesList.length;

    let lenPositions = 0;
    let lenNormals = 0;
    let lenIndices = 0;
    let lenEdgeIndices = 0;
    let lenMatrices = 0;

    for (let geometryIndex = 0; geometryIndex < numGeometries; geometryIndex++) {
        const geometry = geometriesList [geometryIndex];
        lenPositions += geometry.positionsQuantized.length;
        lenNormals += geometry.normalsOctEncoded.length;
        lenIndices += geometry.indices.length;
        lenEdgeIndices += geometry.edgeIndices.length;
    }

    for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {
        const mesh = meshesList[meshIndex];
        if (mesh.geometry.numInstances > 1) {
            lenMatrices += 16;
        }
    }

    const data = {

        // Vertex attributes

        positions: new Uint16Array(lenPositions), // All geometry arrays
        normals: new Int8Array(lenNormals),

        // Triangle and edge indices

        indices: new Uint32Array(lenIndices),
        edgeIndices: new Uint32Array(lenEdgeIndices),

        // Transform matrices

        matrices: new Float32Array(lenMatrices), // Modeling matrices for entities that share geometries. Each entity either shares all it's geometries, or owns all its geometries exclusively. Exclusively-owned geometries are pre-transformed into World-space, and so their entities don't have modeling matrices in this array.

        reusedGeometriesDecodeMatrix: new Float32Array(xktModel.reusedGeometriesDecodeMatrix), // A single, global vertex position de-quantization matrix for all reused geometries. Reused geometries are quantized to their collective Local-space AABB, and this matrix is derived from that AABB.

        eachGeometryPrimitiveType: new Uint8Array(numGeometries), // Primitive type for each geometry (0=solid triangles, 1=surface triangles, 2=lines, 3=points)
        eachGeometryVerticesPortion: new Uint32Array(numGeometries), // For each geometry, an index to its first element in data.positions and data.normals
        eachGeometryIndicesPortion: new Uint32Array(numGeometries), // For each geometry, an index to its first element in data.indices
        eachGeometryEdgeIndicesPortion: new Uint32Array(numGeometries), // For each geometry, an index to its first element in data.edgeIndices

        // Meshes are grouped in runs that are shared by the same entities

        eachMeshGeometriesPortion: new Uint32Array(numMeshes), // For each mesh, an index into the eachGeometry* arrays
        eachMeshMatricesPortion: new Uint32Array(numEntities), // For each mesh that shares its geometry, an index to its first element in data.matrices, to indicate the modeling matrix that transforms the shared geometry Local-space vertex positions. This is ignored for meshes that don't share geometries, because the vertex positions of non-shared geometries are pre-transformed into World-space.
        eachMeshColorAndOpacity: new Uint8Array(numMeshes * 4), // For each mesh, an RGBA integer color of format [0..255, 0..255, 0..255, 0..255]

        // Entity elements in the following arrays are grouped in runs that are shared by the same tiles

        eachEntityId: [], // For each entity, an ID string
        eachEntityMeshesPortion: new Uint32Array(numEntities), // For each entity, the index of the the first element of meshes used by the entity

        eachTileAABB: new Float64Array(numTiles * 6), // For each tile, an axis-aligned bounding box
        eachTileEntitiesPortion: new Uint32Array(numTiles) // For each tile, the index of the the first element of eachEntityId, eachEntityMeshesPortion and eachEntityMatricesPortion used by the tile
    };

    //------------------------------------------------------------------------------------------------------------------
    // Populate the data
    //------------------------------------------------------------------------------------------------------------------

    let countPositions = 0;
    let countNormals = 0;
    let countIndices = 0;
    let countEdgeIndices = 0;
    let countColors = 0;

    // Geometries

    let matricesIndex = 0;

    for (let geometryIndex = 0; geometryIndex < numGeometries; geometryIndex++) {

        const geometry = geometriesList [geometryIndex];

        data.positions.set(geometry.positionsQuantized, countPositions);
        data.normals.set(geometry.normalsOctEncoded, countNormals);

        data.indices.set(geometry.indices, countIndices);
        data.edgeIndices.set(geometry.edgeIndices, countEdgeIndices);

        let primitiveType = 0;
        if (geometry.primitiveType === "triangles") {
            primitiveType = (geometry.solid) ? 0 : 1;
        } else if (geometry.primitiveType === "points") {
            primitiveType = 2;
        } else if (geometry.primitiveType === "lines") {
            primitiveType = 3;
        }

        data.eachGeometryPrimitiveType [geometryIndex] = primitiveType;
        data.eachGeometryVerticesPortion [geometryIndex] = countPositions;
        data.eachGeometryIndicesPortion [geometryIndex] = countIndices;
        data.eachGeometryEdgeIndicesPortion [geometryIndex] = countEdgeIndices;

        countPositions += geometry.positions.length;
        countNormals += geometry.normalsOctEncoded.length;
        countIndices += geometry.indices.length;
        countEdgeIndices += geometry.edgeIndices.length;
    }

    // Meshes

    for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {

        const mesh = meshesList [meshIndex];

        if (mesh.geometry.numInstances > 1) {

            data.matrices.set(mesh.matrix, matricesIndex);
            data.eachMeshMatricesPortion [meshIndex] = matricesIndex;

            matricesIndex += 16;
        }

        data.eachMeshColorAndOpacity[countColors + 0] = Math.floor(mesh.color[0] * 255);
        data.eachMeshColorAndOpacity[countColors + 1] = Math.floor(mesh.color[1] * 255);
        data.eachMeshColorAndOpacity[countColors + 2] = Math.floor(mesh.color[2] * 255);
        data.eachMeshColorAndOpacity[countColors + 3] = Math.floor(mesh.opacity * 255);

        countColors += 4;
    }

    // Entities, geometry instances, and tiles

    let entityIndex = 0;
    let countEntityGeometryInstancesPortion = 0;

    for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {

        const tile = tilesList [tileIndex];
        const tileEntities = tile.entities;
        const numTileEntities = tileEntities.length;

        if (numTileEntities === 0) {
            continue;
        }

        data.eachTileEntitiesPortion[tileIndex] = entityIndex;

        const tileAABB = tile.aabb;

        for (let j = 0; j < numTileEntities; j++) {

            const entity = tileEntities[j];
            const entityGeometryInstances = entity.meshes;
            const numEntityGeometryInstances = entityGeometryInstances.length;

            if (numEntityGeometryInstances === 0) {
                continue;
            }

            for (let k = 0; k < numEntityGeometryInstances; k++) {

                const geometryInstance = entityGeometryInstances[k];
                const geometry = geometryInstance.geometry;
                const geometryIndex = geometry.geometryIndex;

                data.eachMeshGeometriesPortion [countEntityGeometryInstancesPortion + k] = geometryIndex;
            }

            data.eachEntityId [entityIndex] = entity.entityId;
            data.eachEntityMeshesPortion[entityIndex] = countEntityGeometryInstancesPortion; // <<<<<<<<<<<<<<<<<<<< Error here? Order/value of countEntityGeometryInstancesPortion correct?

            entityIndex++;
            countEntityGeometryInstancesPortion += numEntityGeometryInstances;
        }

        const tileAABBIndex = tileIndex * 6;
        const tileDecodeMatrixIndex = tileIndex * 16;

        data.eachTileAABB.set(tileAABB, tileAABBIndex);
    }

    return data;
}

function deflateData(data) {

    return {

        positions: pako.deflate(data.positions.buffer),
        normals: pako.deflate(data.normals.buffer),
        indices: pako.deflate(data.indices.buffer),
        edgeIndices: pako.deflate(data.edgeIndices.buffer),

        matrices: pako.deflate(data.matrices.buffer),
        reusedGeometriesDecodeMatrix: pako.deflate(data.reusedGeometriesDecodeMatrix.buffer),

        eachGeometryPrimitiveType: pako.deflate(data.eachGeometryPrimitiveType.buffer),
        eachGeometryVerticesPortion: pako.deflate(data.eachGeometryVerticesPortion.buffer),
        eachGeometryIndicesPortion: pako.deflate(data.eachGeometryIndicesPortion.buffer),
        eachGeometryEdgeIndicesPortion: pako.deflate(data.eachGeometryEdgeIndicesPortion.buffer),

        eachMeshGeometriesPortion: pako.deflate(data.eachMeshGeometriesPortion.buffer),
        eachMeshMatricesPortion: pako.deflate(data.eachMeshMatricesPortion.buffer),
        eachMeshColorAndOpacity: pako.deflate(data.eachMeshColorAndOpacity.buffer),

        eachEntityId: pako.deflate(JSON.stringify(data.eachEntityId)
            .replace(/[\u007F-\uFFFF]/g, function (chr) { // Produce only ASCII-chars, so that the data can be inflated later
                return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
            })),
        eachEntityMeshesPortion: pako.deflate(data.eachEntityMeshesPortion.buffer),

        eachTileAABB: pako.deflate(data.eachTileAABB.buffer),
        eachTileEntitiesPortion: pako.deflate(data.eachTileEntitiesPortion.buffer)
    };
}

function createArrayBuffer(deflatedData) {

    return toArrayBuffer([

        deflatedData.positions,
        deflatedData.normals,
        deflatedData.indices,
        deflatedData.edgeIndices,

        deflatedData.matrices,
        deflatedData.reusedGeometriesDecodeMatrix,

        deflatedData.eachGeometryPrimitiveType,
        deflatedData.eachGeometryVerticesPortion,
        deflatedData.eachGeometryIndicesPortion,
        deflatedData.eachGeometryEdgeIndicesPortion,

        deflatedData.eachMeshGeometriesPortion,
        deflatedData.eachMeshMatricesPortion,
        deflatedData.eachMeshColorAndOpacity,

        deflatedData.eachEntityId,
        deflatedData.eachEntityMeshesPortion,

        deflatedData.eachTileAABB,
        deflatedData.eachTileEntitiesPortion
    ]);
}

function toArrayBuffer(elements) {
    const indexData = new Uint32Array(elements.length + 2);
    indexData[0] = XKT_VERSION;
    indexData [1] = elements.length;  // Stored Data 1.1: number of stored elements
    let dataLen = 0;    // Stored Data 1.2: length of stored elements
    for (let i = 0, len = elements.length; i < len; i++) {
        const element = elements[i];
        const elementsize = element.length;
        indexData[i + 2] = elementsize;
        dataLen += elementsize;
    }
    const indexBuf = new Uint8Array(indexData.buffer);
    const dataArray = new Uint8Array(indexBuf.length + dataLen);
    dataArray.set(indexBuf);
    let offset = indexBuf.length;
    for (let i = 0, len = elements.length; i < len; i++) {     // Stored Data 2: the elements themselves
        const element = elements[i];
        dataArray.set(element, offset);
        offset += element.length;
    }
    console.log("Array buffer size: " + (dataArray.length / 1024).toFixed(3) + " kB");
    return dataArray.buffer;
}

export {writeXKTModelToArrayBuffer};