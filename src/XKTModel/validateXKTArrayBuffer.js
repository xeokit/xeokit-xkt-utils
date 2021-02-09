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
        reusedGeometriesDecodeMatrix: elements[5],

        eachGeometryPrimitiveType: elements[6],
        eachGeometryVerticesPortion: elements[7],
        eachGeometryIndicesPortion: elements[8],
        eachGeometryEdgeIndicesPortion: elements[9],

        eachMeshGeometriesPortion: elements[10],
        eachMeshMatricesPortion: elements[11],
        eachMeshColorAndOpacity: elements[12],

        eachEntityId: elements[13],
        eachEntityMeshesPortion: elements[14],

        eachTileAABB: elements[15],
        eachTileEntitiesPortion: elements[16]
    };
}

function inflate(deflatedData) {

    return {

        positions: new Uint16Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),

        matrices: new Float32Array(pako.inflate(deflatedData.matrices).buffer),
        reusedGeometriesDecodeMatrix: new Float32Array(pako.inflate(deflatedData.reusedGeometriesDecodeMatrix).buffer),

        eachGeometryPrimitiveType: new Uint8Array(pako.inflate(deflatedData.eachGeometryPrimitiveType).buffer),
        eachGeometryVerticesPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryVerticesPortion).buffer),
        eachGeometryIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryIndicesPortion).buffer),
        eachGeometryEdgeIndicesPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryEdgeIndicesPortion).buffer),

        eachMeshGeometriesPortion: new Uint32Array(pako.inflate(deflatedData.eachMeshGeometriesPortion).buffer),
        eachMeshMatricesPortion: new Uint32Array(pako.inflate(deflatedData.eachMeshMatricesPortion).buffer),
        eachMeshColorAndOpacity: new Uint8Array(pako.inflate(deflatedData.eachMeshColorAndOpacity).buffer),

        eachEntityId: pako.inflate(deflatedData.eachEntityId, {to: 'string'}),
        eachEntityMeshesPortion: new Uint32Array(pako.inflate(deflatedData.eachEntityMeshesPortion).buffer),

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
    const reusedGeometriesDecodeMatrix = inflatedData.reusedGeometriesDecodeMatrix;

    const eachGeometryPrimitiveType = inflatedData.eachGeometryPrimitiveType;
    const eachGeometryVerticesPortion = inflatedData.eachGeometryVerticesPortion;
    const eachGeometryIndicesPortion = inflatedData.eachGeometryIndicesPortion;
    const eachGeometryEdgeIndicesPortion = inflatedData.eachGeometryEdgeIndicesPortion;

    const eachMeshGeometriesPortion = inflatedData.eachMeshGeometriesPortion;
    const eachMeshColorAndOpacity = inflatedData.eachMeshColorAndOpacity;
    const eachMeshMatricesPortion = inflatedData.eachMeshMatricesPortion;

    const eachEntityId = JSON.parse(inflatedData.eachEntityId);
    const eachEntityMeshesPortion = inflatedData.eachEntityMeshesPortion;

    const eachTileAABB = inflatedData.eachTileAABB;
    const eachTileEntitiesPortion = inflatedData.eachTileEntitiesPortion;

    const numGeometries = eachGeometryVerticesPortion.length;
    const numMeshes = eachMeshGeometriesPortion.length;
    const numEntities = eachEntityId.length;
    const numTiles = eachTileEntitiesPortion.length;

    // ASSERTIONS

    if (numTiles !== xktModel.tilesList.length) {
        console.error("Unexpected number of tiles; found " + numTiles + ", but expected " + xktModel.tilesList.length);
        return false;
    }

    // Count instances of each geometry

    const geometryReuseCounts = new Uint32Array(numGeometries);

    for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {
        const geometryIndex = eachMeshGeometriesPortion[meshIndex];
        if (geometryReuseCounts[geometryIndex] !== undefined) {
            geometryReuseCounts[geometryIndex]++;
        } else {
            geometryReuseCounts[geometryIndex] = 1;
        }
    }

    // ASSERTIONS
    // Check mesh --> geometry reuse counts

    for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {
        const geometryIndex = eachMeshGeometriesPortion[meshIndex];
        const xktGeometry = xktModel.geometriesList[geometryIndex];
        if (!xktGeometry) {
            console.error("xktModel.geometriesList[geometryIndex] not found");
            return false;
        }
        if (xktGeometry.numInstances !== geometryReuseCounts[geometryIndex]) {
            console.error("xktGeometry.numInstances !== geometryReuseCounts[geometryIndex]");
            return false;
        }
    }

    // ASSERTIONS
    // Check geometry primitive types

    for (let geometryIndex = 0; geometryIndex < numGeometries; geometryIndex++) {
        const xktGeometry = xktModel.geometriesList[geometryIndex];
        if (!xktGeometry) {
            console.error("xktModel.geometriesList[geometryIndex] not found");
            return false;
        }
        switch (xktGeometry.primitiveType) {
            case 0:
                break;
            case 1:
                break;
            case 3:
                break;
            case 4:
                break;
        }
    }

    // Iterate over tiles

    for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {

        const lastTileIndex = (numTiles - 1);
        const atLastTile = (tileIndex === lastTileIndex);

        const firstTileEntityIndex = eachTileEntitiesPortion [tileIndex];
        const lastTileEntityIndex = atLastTile ? numEntities : eachTileEntitiesPortion[tileIndex + 1];

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
            const lastTileEntityIndex = (numEntities - 1);
            const atLastTileEntity = (tileEntityIndex === lastTileEntityIndex);
            const firstMeshIndex = eachEntityMeshesPortion [tileEntityIndex];
            const lastMeshIndex = atLastTileEntity ? eachMeshGeometriesPortion.length : eachEntityMeshesPortion[tileEntityIndex + 1];

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

            // Iterate each entity's meshes

            for (let meshIndex = firstMeshIndex; meshIndex < lastMeshIndex; meshIndex++) {

                const meshMatrixIndex = eachMeshMatricesPortion[meshIndex];
                const meshMatrix = matrices.slice(meshMatrixIndex, meshMatrixIndex + 16);

                const color = decompressColor(eachMeshColorAndOpacity.subarray((meshIndex * 4), (meshIndex * 4) + 3));
                const opacity = eachMeshColorAndOpacity[(meshIndex * 4) + 3] / 255.0;

                const geometryIndex = eachMeshGeometriesPortion[meshIndex];
                const geometryReuseCount = geometryReuseCounts[geometryIndex];
                const isReusedGeometry = (geometryReuseCount > 1);

                const atLastGeometry = (geometryIndex === (numGeometries - 1));

                const geometryPositions = positions.subarray(eachGeometryVerticesPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryVerticesPortion [geometryIndex + 1]);
                const geometryNormals = normals.subarray(eachGeometryVerticesPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryVerticesPortion [geometryIndex + 1]);
                const geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                const geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);

                // ASSERTIONS

                const xktMesh = xktModel.meshesList[meshIndex];
                const xktGeometry = xktModel.geometriesList[geometryIndex];

                if (!xktMesh) {
                    console.error("xktModel.meshesList[meshIndex] not found");
                    return false;
                }

                if (!xktGeometry) {
                    console.error("xktModel.geometriesList[geometryIndex] not found");
                    return false;
                }

                if (!compareArrays(meshMatrix, xktMesh.matrix)) {
                    console.error("compareArrays(meshMatrix, xktMesh.matrix) === false");
                    return false;
                }

                if (!compareArrays(color, xktMesh.color)) {
                    console.error("compareArrays(color, xktMesh.color) === false");
                    return false;
                }

                if (opacity !== xktMesh.opacity) {
                    console.error("opacity !== xktMesh.opacity");
                    return false;
                }

                if (xktMesh.geometry !== xktGeometry) {
                    console.error("xktMesh.geometry !== xktGeometry");
                    return false;
                }

                if (!compareArrays(geometryPositions, xktGeometry.positionsQuantized)) {
                    console.error("compareArrays(geometryPositions, xktGeometry.positions) === false");
                    return false;
                }

                if (!compareArrays(geometryNormals, xktGeometry.normalsOctEncoded)) {
                    console.error("compareArrays(geometryNormals, xktGeometry.normals) === false");
                    return false;
                }

                if (!compareArrays(geometryIndices, xktGeometry.indices)) {
                    console.error("compareArrays(geometryIndices, xktGeometry.indices) === false");
                    return false;
                }

                if (!compareArrays(geometryEdgeIndices, xktGeometry.edgeIndices)) {
                    console.error("compareArrays(geometryEdgeIndices, xktGeometry.edgeIndices) === false");
                    return false;
                }

                if (geometryReuseCount !== xktGeometry.numInstances) {
                    console.error("geometryReuseCount !== xktGeometry.numInstances");
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