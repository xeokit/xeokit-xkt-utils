/**
 * @desc Validates an {@link ArrayBuffer} against the {@link XKTModel} it was written from.
 *
 * @param {ArrayBuffer} arrayBuffer The {@link ArrayBuffer}.
 * @param {XKTModel} xktModel The {@link XKTModel} that the {@link ArrayBuffer} was written from.
 * @returns {Boolean} True if valid, else false. Logs validity failures to the JS console.
 */
function validateXKTArrayBuffer(arrayBuffer, xktModel) {

    const dataView = new DataView(arrayBuffer);
    const dataArray = new Uint8Array(arrayBuffer);
    const xktVersion = dataView.getUint32(0, true);
    const numElements = dataView.getUint32(4, true);

    const elements = [];

    let byteOffset = (numElements + 2) * 4;

    for (let i = 0; i < numElements; i++) {
        const elementSize = dataView.getUint32((i + 2) * 4, true);
        elements.push(dataArray.subarray(byteOffset, byteOffset + elementSize));
        byteOffset += elementSize;
    }

    const deflatedData = extract(elements);
    const inflatedData = inflate(deflatedData);

    return validateData(inflatedData, xktModel);
}

function extract(elements) {
    return {
        positions: elements[0],
        normals: elements[1],
        indices: elements[2],
        edgeIndices: elements[3],
        matrices: elements[4],
        reusedPrimitivesDecodeMatrix: elements[5],
        eachPrimitivePositionsAndNormalsPortion: elements[6],
        eachPrimitiveIndicesPortion: elements[7],
        eachPrimitiveEdgeIndicesPortion: elements[8],
        eachPrimitiveColorAndOpacity: elements[9],
        primitiveInstances: elements[10],
        eachEntityId: elements[11],
        eachEntityPrimitiveInstancesPortion: elements[12],
        eachEntityMatricesPortion: elements[13],
        eachTileAABB: elements[14],
        eachTileEntitiesPortion: elements[15]
    };
}

function inflate(deflatedData) {
    return {
        //positions: new Uint16Array(pako.inflate(deflatedData.positions).buffer),
        positions: new Float32Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),
        matrices: new Float32Array(pako.inflate(deflatedData.matrices).buffer),
        reusedPrimitivesDecodeMatrix: new Float32Array(pako.inflate(deflatedData.reusedPrimitivesDecodeMatrix).buffer),
        eachPrimitivePositionsAndNormalsPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitivePositionsAndNormalsPortion).buffer),
        eachPrimitiveIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveIndicesPortion).buffer),
        eachPrimitiveEdgeIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachPrimitiveEdgeIndicesPortion).buffer),
        eachPrimitiveColorAndOpacity: new Uint8Array(pako.inflate(deflatedData.eachPrimitiveColorAndOpacity).buffer),
        primitiveInstances: new Uint32Array(pako.inflate(deflatedData.primitiveInstances).buffer),
        eachEntityId: pako.inflate(deflatedData.eachEntityId, {to: 'string'}),
        eachEntityPrimitiveInstancesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityPrimitiveInstancesPortion).buffer),
        eachEntityMatricesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityMatricesPortion).buffer),
        eachTileAABB: new Float64Array(pako.inflate(deflatedData.eachTileAABB).buffer),
        eachTileEntitiesPortion: new Uint32Array(pako.inflate(deflatedData.eachTileEntitiesPortion).buffer),
    };
}

const decompressColor = (function () {
    const floatColor = new Float32Array(3);
    return function (intColor) {
        floatColor[0] = intColor[0] / 255.0;
        floatColor[1] = intColor[1] / 255.0;
        floatColor[2] = intColor[2] / 255.0;
        return floatColor;
    };
})();

function validateData(inflatedData, xktModel) {

    const positions = inflatedData.positions;
    const normals = inflatedData.normals;
    const indices = inflatedData.indices;
    const edgeIndices = inflatedData.edgeIndices;

    const matrices = inflatedData.matrices;

    const reusedPrimitivesDecodeMatrix = inflatedData.reusedPrimitivesDecodeMatrix;

    const eachPrimitivePositionsAndNormalsPortion = inflatedData.eachPrimitivePositionsAndNormalsPortion;
    const eachPrimitiveIndicesPortion = inflatedData.eachPrimitiveIndicesPortion;
    const eachPrimitiveEdgeIndicesPortion = inflatedData.eachPrimitiveEdgeIndicesPortion;
    const eachPrimitiveColorAndOpacity = inflatedData.eachPrimitiveColorAndOpacity;

    const primitiveInstances = inflatedData.primitiveInstances;

    const eachEntityId = JSON.parse(inflatedData.eachEntityId);
    const eachEntityPrimitiveInstancesPortion = inflatedData.eachEntityPrimitiveInstancesPortion;
    const eachEntityMatricesPortion = inflatedData.eachEntityMatricesPortion;

    const eachTileAABB = inflatedData.eachTileAABB;
    const eachTileDecodeMatrix = inflatedData.eachTileDecodeMatrix;
    const eachTileEntitiesPortion = inflatedData.eachTileEntitiesPortion;

    const numPrimitives = eachPrimitivePositionsAndNormalsPortion.length;
    const numPrimitiveInstances = primitiveInstances.length;
    const numEntities = eachEntityId.length;
    const numTiles = eachTileEntitiesPortion.length;

    // ASSERTIONS

    if (numTiles !== xktModel.tilesList.length) {
        console.error("Unexpected number of tiles; found " + numTiles + ", but expected " + xktModel.tilesList.length);
        return false;
    }

    // Count instances of each primitive

    const primitiveReuseCounts = new Uint32Array(numPrimitives);

    for (let primitiveInstanceIndex = 0; primitiveInstanceIndex < numPrimitiveInstances; primitiveInstanceIndex++) {
        const primitiveIndex = primitiveInstances[primitiveInstanceIndex];
        if (primitiveReuseCounts[primitiveIndex] !== undefined) {
            primitiveReuseCounts[primitiveIndex]++;
        } else {
            primitiveReuseCounts[primitiveIndex] = 1;
        }
    }

    // Iterate over tiles

    for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {

        const lastTileIndex = (numTiles - 1);
        const atLastTile = (tileIndex === lastTileIndex);

        const firstTileEntityIndex = eachTileEntitiesPortion [tileIndex];
        const lastTileEntityIndex = atLastTile ? numEntities : eachTileEntitiesPortion[tileIndex + 1];

        const tileDecodeMatrixIndex = tileIndex * 16;
        const tileAABBIndex = tileIndex * 6;

        const tileAABB = eachTileAABB.subarray(tileAABBIndex, tileAABBIndex + 6);

        // ASSERTIONS

        const xktTile = xktModel.tilesList[tileIndex];

        if (!xktTile) {
            console.error("xktModel.tilesList[tileIndex] not found");
            return false;
        }

        if (!compareArrays(tileAABB, xktTile.aabb)) {
            console.error("compareArrays(tileAABB, xktTile.aabb) === false");
            return false;
        }

        const numTileEntities = (lastTileEntityIndex - firstTileEntityIndex);
        if (numTileEntities !== xktTile.entities.length) {
            console.error("Unexpected number of entities in tile");
            return false;
        }

        // Iterate over each tile's entities

        for (let tileEntityIndex = firstTileEntityIndex; tileEntityIndex < lastTileEntityIndex; tileEntityIndex++) {

            const entityId = eachEntityId[tileEntityIndex];

            const entityMatrixIndex = eachEntityMatricesPortion[tileEntityIndex];
            const entityMatrix = matrices.slice(entityMatrixIndex, entityMatrixIndex + 16);

            const lastTileEntityIndex = (numEntities - 1);
            const atLastTileEntity = (tileEntityIndex === lastTileEntityIndex);
            const firstPrimitiveInstanceIndex = eachEntityPrimitiveInstancesPortion [tileEntityIndex];
            const lastPrimitiveInstanceIndex = atLastTileEntity ? primitiveInstances.length : eachEntityPrimitiveInstancesPortion[tileEntityIndex + 1];

            // ASSERTIONS

            const xktEntity = xktModel.entitiesList[tileEntityIndex];

            if (!xktEntity) {
                console.error("xktModel.entitiesList[tileEntityIndex] not found");
                return false;
            }

            if (entityId !== xktEntity.entityId) {
                console.error("entityId !== xktEntity.entityId");
                return false;
            }

            if (!compareArrays(entityMatrix, xktEntity.matrix)) {
                console.error("compareArrays(entityMatrix, xktEntity.matrix) === false");
                return false;
            }

            // Iterate each entity's primitive instances

            for (let primitiveInstancesIndex = firstPrimitiveInstanceIndex; primitiveInstancesIndex < lastPrimitiveInstanceIndex; primitiveInstancesIndex++) {

                const primitiveIndex = primitiveInstances[primitiveInstancesIndex];
                const primitiveReuseCount = primitiveReuseCounts[primitiveIndex];
                const isReusedPrimitive = (primitiveReuseCount > 1);

                const atLastPrimitive = (primitiveIndex === (numPrimitives - 1));

                const primitivePositions = positions.subarray(eachPrimitivePositionsAndNormalsPortion [primitiveIndex], atLastPrimitive ? positions.length : eachPrimitivePositionsAndNormalsPortion [primitiveIndex + 1]);
                const primitiveNormals = normals.subarray(eachPrimitivePositionsAndNormalsPortion [primitiveIndex], atLastPrimitive ? normals.length : eachPrimitivePositionsAndNormalsPortion [primitiveIndex + 1]);
                const primitiveIndices = indices.subarray(eachPrimitiveIndicesPortion [primitiveIndex], atLastPrimitive ? indices.length : eachPrimitiveIndicesPortion [primitiveIndex + 1]);
                const primitiveEdgeIndices = edgeIndices.subarray(eachPrimitiveEdgeIndicesPortion [primitiveIndex], atLastPrimitive ? edgeIndices.length : eachPrimitiveEdgeIndicesPortion [primitiveIndex + 1]);

                const color = decompressColor(eachPrimitiveColorAndOpacity.subarray((primitiveIndex * 4), (primitiveIndex * 4) + 3));
                const opacity = eachPrimitiveColorAndOpacity[(primitiveIndex * 4) + 3] / 255.0;

                // ASSERTIONS

                const xktPrimitiveInstance = xktModel.primitiveInstancesList[primitiveInstancesIndex];
                const xktPrimitive = xktModel.primitivesList[primitiveIndex];

                if (!xktPrimitiveInstance) {
                    console.error("xktModel.primitiveInstancesList[primitiveInstancesIndex] not found");
                    return false;
                }

                if (!xktPrimitive) {
                    console.error("xktModel.primitivesList[primitiveIndex] not found");
                    return false;
                }

                if (xktPrimitiveInstance.primitive !== xktPrimitive) {
                    console.error("xktPrimitiveInstance.primitive !== xktPrimitive");
                    return false;
                }

                if (!compareArrays(primitivePositions, xktPrimitive.positions)) {
                    console.error("compareArrays(primitivePositions, xktPrimitive.positions) === false");
                    return false;
                }

                if (!compareArrays(primitiveNormals, xktPrimitive.normalsOctEncoded)) {
                    console.error("compareArrays(primitiveNormals, xktPrimitive.normals) === false");
                    return false;
                }

                if (!compareArrays(primitiveIndices, xktPrimitive.indices)) {
                    console.error("compareArrays(primitiveIndices, xktPrimitive.indices) === false");
                    return false;
                }

                if (!compareArrays(primitiveEdgeIndices, xktPrimitive.edgeIndices)) {
                    console.error("compareArrays(primitiveEdgeIndices, xktPrimitive.edgeIndices) === false");
                    return false;
                }

                if (!compareArrays(color, xktPrimitive.color)) {
                    console.error("compareArrays(color, xktPrimitive.color) === false");
                    return false;
                }

                if (opacity !== xktPrimitive.opacity) {
                    console.error("opacity !== xktPrimitive.opacity");
                    return false;
                }

                if (primitiveReuseCount !== xktPrimitive.numInstances) {
                    console.error("primitiveReuseCount !== xktPrimitive.numInstances");
                    return false;
                }
            }
        }
    }

    return true;
}

function compareArrays(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0, len = a.length; i < len; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

export {validateXKTArrayBuffer};