import * as p from "./lib/pako.es.js";

let pako = p;
if (!pako.inflate) {  // See https://github.com/nodeca/pako/issues/97
    pako = pako.default;
}

const XKT_VERSION = 6; // XKT format version

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

    const primitivesList = xktModel.primitivesList;
    const primitiveInstancesList = xktModel.primitiveInstancesList;
    const entitiesList = xktModel.entitiesList;
    const tilesList = xktModel.tilesList;

    const numPrimitives = primitivesList.length;
    const numPrimitiveInstances = primitiveInstancesList.length;
    const numEntities = entitiesList.length;
    const numTiles = tilesList.length;

    let lenPositions = 0;
    let lenNormals = 0;
    let lenIndices = 0;
    let lenEdgeIndices = 0;
    let lenColors = 0;
    let lenMatrices = 0;

    for (let primitiveIndex = 0; primitiveIndex < numPrimitives; primitiveIndex++) {
        const primitive = primitivesList [primitiveIndex];
        lenPositions += primitive.positionsQuantized.length;
        lenNormals += primitive.normalsOctEncoded.length;
        lenIndices += primitive.indices.length;
        lenEdgeIndices += primitive.edgeIndices.length;
        lenColors += 4;
    }

    for (let entityIndex = 0; entityIndex < numEntities; entityIndex++) {
        const entity = entitiesList[entityIndex];
        if (entity.hasReusedPrimitives) {
            lenMatrices += 16;
        }
    }

    const data = {

        positions: new Uint16Array(lenPositions), // All geometry arrays
        normals: new Int8Array(lenNormals),
        indices: new Uint32Array(lenIndices),
        edgeIndices: new Uint32Array(lenEdgeIndices),

        matrices: new Float32Array(lenMatrices), // Modeling matrices for entities that share primitives. Each entity either shares all it's primitives, or owns all its primitives exclusively. Exclusively-owned primitives are pre-transformed into World-space, and so their entities don't have modeling matrices in this array.

        reusedPrimitivesDecodeMatrix: new Float32Array(xktModel.reusedPrimitivesDecodeMatrix), // A single, global vertex position de-quantization matrix for all reused primitives. Reused primitives are quantized to their collective Local-space AABB, and this matrix is derived from that AABB.

        eachPrimitivePositionsAndNormalsPortion: new Uint32Array(numPrimitives), // For each primitive, an index to its first element in data.positions and data.normals
        eachPrimitiveIndicesPortion: new Uint32Array(numPrimitives), // For each primitive, an index to its first element in data.indices
        eachPrimitiveEdgeIndicesPortion: new Uint32Array(numPrimitives), // For each primitive, an index to its first element in data.edgeIndices
        eachPrimitiveColorAndOpacity: new Uint8Array(lenColors), // For each primitive, an RGBA integer color of format [0..255, 0..255, 0..255, 0..255]

        // Primitive instances are grouped in runs that are shared by the same entities

        primitiveInstances: new Uint32Array(numPrimitiveInstances), // For each primitive instance, an index into the eachPrimitive* arrays

        // Entity elements in the following arrays are grouped in runs that are shared by the same tiles

        eachEntityId: [], // For each entity, an ID string
        eachEntityPrimitiveInstancesPortion: new Uint32Array(numEntities), // For each entity, the index of the the first element of primitiveInstances used by the entity
        eachEntityMatricesPortion: new Uint32Array(numEntities), // For each entity that shares primitives, an index to its first element in data.matrices, to indicate the modeling matrix that transforms the shared primitives' Local-space vertex positions. Thios is ignored for entities that don't share primitives, because the vertex positions of non-shared primitives are pre-transformed into World-space.

        eachTileAABB: new Float64Array(numTiles * 6), // For each tile, an axis-aligned bounding box
        eachTileEntitiesPortion: new Uint32Array(numTiles) // For each tile, the index of the the first element of eachEntityId, eachEntityPrimitiveInstancesPortion and eachEntityMatricesPortion used by the tile
    };

    //------------------------------------------------------------------------------------------------------------------
    // Populate the data
    //------------------------------------------------------------------------------------------------------------------

    let countPositions = 0;
    let countNormals = 0;
    let countIndices = 0;
    let countEdgeIndices = 0;
    let countColors = 0;

    // Primitives

    for (let primitiveIndex = 0; primitiveIndex < numPrimitives; primitiveIndex++) {

        const primitive = primitivesList [primitiveIndex];

        data.positions.set(primitive.positionsQuantized, countPositions);
        data.normals.set(primitive.normalsOctEncoded, countNormals);
        data.indices.set(primitive.indices, countIndices);
        data.edgeIndices.set(primitive.edgeIndices, countEdgeIndices);

        data.eachPrimitivePositionsAndNormalsPortion [primitiveIndex] = countPositions;
        data.eachPrimitiveIndicesPortion [primitiveIndex] = countIndices;
        data.eachPrimitiveEdgeIndicesPortion [primitiveIndex] = countEdgeIndices;
        data.eachPrimitiveColorAndOpacity[countColors + 0] = Math.floor(primitive.color[0]);
        data.eachPrimitiveColorAndOpacity[countColors + 1] = Math.floor(primitive.color[1]);
        data.eachPrimitiveColorAndOpacity[countColors + 2] = Math.floor(primitive.color[2]);
        data.eachPrimitiveColorAndOpacity[countColors + 3] = Math.floor(primitive.opacity);

        countPositions += primitive.positions.length;
        countNormals += primitive.normalsOctEncoded.length;
        countIndices += primitive.indices.length;
        countEdgeIndices += primitive.edgeIndices.length;
        countColors += 4;
    }

    // Entities, primitive instances, and tiles

    let entityIndex = 0;
    let countEntityPrimitiveInstancesPortion = 0;
    let matricesIndex = 0;

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
            const entityPrimitiveInstances = entity.primitiveInstances;
            const numEntityPrimitiveInstances = entityPrimitiveInstances.length;

            if (numEntityPrimitiveInstances === 0) {
                continue;
            }

            for (let k = 0; k < numEntityPrimitiveInstances; k++) {

                const primitiveInstance = entityPrimitiveInstances[k];
                const primitive = primitiveInstance.primitive;
                const primitiveIndex = primitive.primitiveIndex;

                data.primitiveInstances [countEntityPrimitiveInstancesPortion + k] = primitiveIndex;
            }

            if (entity.hasReusedPrimitives) {

                data.matrices.set(entity.matrix, matricesIndex);
                data.eachEntityMatricesPortion [entityIndex] = matricesIndex;

                matricesIndex += 16;
            }

            data.eachEntityId [entityIndex] = entity.entityId;
            data.eachEntityPrimitiveInstancesPortion[entityIndex] = countEntityPrimitiveInstancesPortion; // <<<<<<<<<<<<<<<<<<<< Error here? Order/value of countEntityPrimitiveInstancesPortion correct?

            entityIndex++;
            countEntityPrimitiveInstancesPortion += numEntityPrimitiveInstances;
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

        reusedPrimitivesDecodeMatrix: pako.deflate(data.reusedPrimitivesDecodeMatrix.buffer),

        eachPrimitivePositionsAndNormalsPortion: pako.deflate(data.eachPrimitivePositionsAndNormalsPortion.buffer),
        eachPrimitiveIndicesPortion: pako.deflate(data.eachPrimitiveIndicesPortion.buffer),
        eachPrimitiveEdgeIndicesPortion: pako.deflate(data.eachPrimitiveEdgeIndicesPortion.buffer),
        eachPrimitiveColorAndOpacity: pako.deflate(data.eachPrimitiveColorAndOpacity.buffer),

        primitiveInstances: pako.deflate(data.primitiveInstances.buffer),

        eachEntityId: pako.deflate(JSON.stringify(data.eachEntityId)
            .replace(/[\u007F-\uFFFF]/g, function (chr) { // Produce only ASCII-chars, so that the data can be inflated later
                return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
            })),
        eachEntityPrimitiveInstancesPortion: pako.deflate(data.eachEntityPrimitiveInstancesPortion.buffer),
        eachEntityMatricesPortion: pako.deflate(data.eachEntityMatricesPortion.buffer),

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

        deflatedData.reusedPrimitivesDecodeMatrix,

        deflatedData.eachPrimitivePositionsAndNormalsPortion,
        deflatedData.eachPrimitiveIndicesPortion,
        deflatedData.eachPrimitiveEdgeIndicesPortion,
        deflatedData.eachPrimitiveColorAndOpacity,

        deflatedData.primitiveInstances,

        deflatedData.eachEntityId,
        deflatedData.eachEntityPrimitiveInstancesPortion,
        deflatedData.eachEntityMatricesPortion,

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
    var offset = indexBuf.length;
    for (let i = 0, len = elements.length; i < len; i++) {     // Stored Data 2: the elements themselves
        const element = elements[i];
        dataArray.set(element, offset);
        offset += element.length;
    }
    console.log("Array buffer size: " + (dataArray.length / 1024).toFixed(3) + " kB");
    return dataArray.buffer;
}

export {writeXKTModelToArrayBuffer};