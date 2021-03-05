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

        // vertex attributes

        positions: elements[0],
        normals: elements[1],
        colors: elements[2],

        // Indices

        indices: elements[3],
        edgeIndices: elements[4],

        // Transform matrices

        matrices: elements[5],

        reusedGeometriesDecodeMatrix: elements[6],

        // Geometries

        eachGeometryPrimitiveType: elements[7],
        eachGeometryPositionsPortion: elements[8],
        eachGeometryNormalsPortion: elements[9],
        eachGeometryColorsPortion: elements[10],

        eachGeometryIndicesPortion: elements[11],
        eachGeometryEdgeIndicesPortion: elements[12],

        // Meshes are grouped in runs that are shared by the same entities

        eachMeshGeometriesPortion: elements[13],
        eachMeshMatricesPortion: elements[14],
        eachMeshColorAndOpacity: elements[15],

        // Entity elements in the following arrays are grouped in runs that are shared by the same tiles

        eachEntityId: elements[16],
        eachEntityMeshesPortion: elements[17],

        eachTileAABB: elements[18],
        eachTileEntitiesPortion: elements[19]
    };
}

function inflate(deflatedData) {

    return {

        positions: new Uint16Array(pako.inflate(deflatedData.positions).buffer),
        normals: new Int8Array(pako.inflate(deflatedData.normals).buffer),
        colors: new Uint8Array(pako.inflate(deflatedData.colors).buffer),

        indices: new Uint32Array(pako.inflate(deflatedData.indices).buffer),
        edgeIndices: new Uint32Array(pako.inflate(deflatedData.edgeIndices).buffer),

        matrices: new Float32Array(pako.inflate(deflatedData.matrices).buffer),
        reusedGeometriesDecodeMatrix: new Float32Array(pako.inflate(deflatedData.reusedGeometriesDecodeMatrix).buffer),

        eachGeometryPrimitiveType: new Uint8Array(pako.inflate(deflatedData.eachGeometryPrimitiveType).buffer),
        eachGeometryPositionsPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryPositionsPortion).buffer),
        eachGeometryNormalsPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryNormalsPortion).buffer),
        eachGeometryColorsPortion: new Uint32Array(pako.inflate(deflatedData.eachGeometryColorsPortion).buffer),
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
    const colors = inflatedData.colors;

    const indices = inflatedData.indices;
    const edgeIndices = inflatedData.edgeIndices;

    const matrices = inflatedData.matrices;
    const reusedGeometriesDecodeMatrix = inflatedData.reusedGeometriesDecodeMatrix;

    const eachGeometryPrimitiveType = inflatedData.eachGeometryPrimitiveType;
    const eachGeometryPositionsPortion = inflatedData.eachGeometryPositionsPortion;
    const eachGeometryNormalsPortion = inflatedData.eachGeometryNormalsPortion;
    const eachGeometryColorsPortion = inflatedData.eachGeometryColorsPortion;
    const eachGeometryIndicesPortion = inflatedData.eachGeometryIndicesPortion;
    const eachGeometryEdgeIndicesPortion = inflatedData.eachGeometryEdgeIndicesPortion;

    const eachMeshGeometriesPortion = inflatedData.eachMeshGeometriesPortion;
    const eachMeshColorAndOpacity = inflatedData.eachMeshColorAndOpacity;
    const eachMeshMatricesPortion = inflatedData.eachMeshMatricesPortion;

    const eachEntityId = JSON.parse(inflatedData.eachEntityId);
    const eachEntityMeshesPortion = inflatedData.eachEntityMeshesPortion;

    const eachTileAABB = inflatedData.eachTileAABB;
    const eachTileEntitiesPortion = inflatedData.eachTileEntitiesPortion;

    const numGeometries = eachGeometryPositionsPortion.length;
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
        const geometryPrimitiveType = eachGeometryPrimitiveType[geometryIndex];
        switch (geometryPrimitiveType) {
            case 0:
                if (xktGeometry.primitiveType !== "triangles") {
                    console.error("eachGeometryPrimitiveType[geometryIndex] unexpected value");
                    return false;
                }
                break;
            case 1:
                if (xktGeometry.primitiveType !== "triangles") {
                    console.error("eachGeometryPrimitiveType[geometryIndex] unexpected value");
                    return false;
                }
                break;
            case 2:
                if (xktGeometry.primitiveType !== "points") {
                    console.error("eachGeometryPrimitiveType[geometryIndex] unexpected value");
                    return false;
                }
                break;
            case 3:
                if (xktGeometry.primitiveType !== "lines") {
                    console.error("eachGeometryPrimitiveType[geometryIndex] unexpected value");
                    return false;
                }
                break;
            default:
                console.error("eachGeometryPrimitiveType[geometryIndex] unexpected value");
                return false;
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

                const primitiveType = eachGeometryPrimitiveType[geometryIndex];

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

                if (isReusedGeometry && !compareArrays(meshMatrix, xktMesh.matrix)) {
                    console.error("compareArrays(meshMatrix, xktMesh.matrix) === false");
                    return false;
                }

                if (xktMesh.color && !compareArrays(color, xktMesh.color)) {
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

                let primitiveName;
                let geometryPositions;
                let geometryNormals;
                let geometryColors;
                let geometryIndices;
                let geometryEdgeIndices;

                switch (primitiveType) {
                    case 0: // Solid
                        primitiveName = "triangles";
                        geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                        geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                        geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                        geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                        break;
                    case 1: // Surface
                        primitiveName = "triangles";
                        geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                        geometryNormals = normals.subarray(eachGeometryNormalsPortion [geometryIndex], atLastGeometry ? normals.length : eachGeometryNormalsPortion [geometryIndex + 1]);
                        geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                        geometryEdgeIndices = edgeIndices.subarray(eachGeometryEdgeIndicesPortion [geometryIndex], atLastGeometry ? edgeIndices.length : eachGeometryEdgeIndicesPortion [geometryIndex + 1]);
                        break;
                    case 2:
                        primitiveName = "points";
                        geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                        geometryColors = colors.subarray(eachGeometryColorsPortion [geometryIndex], atLastGeometry ? colors.length : eachGeometryColorsPortion [geometryIndex + 1]);
                        break;
                    case 3:
                        primitiveName = "lines";
                        geometryPositions = positions.subarray(eachGeometryPositionsPortion [geometryIndex], atLastGeometry ? positions.length : eachGeometryPositionsPortion [geometryIndex + 1]);
                        geometryIndices = indices.subarray(eachGeometryIndicesPortion [geometryIndex], atLastGeometry ? indices.length : eachGeometryIndicesPortion [geometryIndex + 1]);
                        break;
                    default:
                        continue;
                }

                if (geometryPositions && !compareArrays(geometryPositions, xktGeometry.positionsQuantized)) {
                    console.error("compareArrays(geometryPositions, xktGeometry.positionsQuantized) === false");
                    return false;
                }

                if (geometryNormals && !compareArrays(geometryNormals, xktGeometry.normalsOctEncoded)) {
                    console.error("compareArrays(geometryNormals, xktGeometry.normalsOctEncoded) === false");
                    return false;
                }

                if (geometryColors && !compareArrays(geometryColors, xktGeometry.colorsCompressed)) {
                    console.error("compareArrays(geometryColors, xktGeometry.colorsCompressed) === false");
                    return false;
                }

                if (geometryIndices && !compareArrays(geometryIndices, xktGeometry.indices)) {
                    console.error("compareArrays(geometryIndices, xktGeometry.indices) === false");
                    return false;
                }

                if (geometryEdgeIndices && !compareArrays(geometryEdgeIndices, xktGeometry.edgeIndices)) {
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