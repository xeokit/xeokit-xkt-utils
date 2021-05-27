import {IfcAPI} from "web-ifc/web-ifc-api.js";

/**
 * @desc Parses IFC file data into an {@link XKTModel}.
 *
 * Internally, this function uses [web-ifc](https://github.com/tomvandig/web-ifc) to parse the IFC, which relies on a
 * WASM file to do the parsing.
 *
 * Depending on how we use this function, we may need to provide it with a path to the directory where that WASM file is stored.
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer|Response} [params.ifcData] IFC file data.
 * @param {XKTModel} [params.xktModel] XKTModel to parse into.
 * @param {String} params.wasmPath Path to ````web-ifc.wasm````, required by this function.
 */
async function parseIFCIntoXKTModel({ifcData, xktModel, wasmPath}) {

    if (!ifcData) {
        throw "Argument expected: ifcData";
    }

    if (!xktModel) {
        throw "Argument expected: xktModel";
    }

    if (!wasmPath) {
        throw "Argument expected: wasmPath";
    }

    let nextId = 0;

    const ifcApi = new IfcAPI();

    if (wasmPath) {
        ifcApi.SetWasmPath(wasmPath);
    }

    await ifcApi.Init();

    const dataArray = new Uint8Array(ifcData);

    const modelID = ifcApi.OpenModel("foo.ifc", dataArray);

    const flatMeshes = ifcApi.LoadAllGeometry(modelID);

    for (let i = 0, len = flatMeshes.size(); i < len; i++) {

        const flatMesh = flatMeshes.get(i);
        const entityId = "" + flatMesh.expressID;
        const placedGeometries = flatMesh.geometries;
        const meshIds = [];

        for (let j = 0, lenj = placedGeometries.size(); j < lenj; j++) {

            const placedGeometry = placedGeometries.get(j);
            const geometryId = "" + placedGeometry.geometryExpressID;

            if (!xktModel.geometries[geometryId]) {

                const geometry = ifcApi.GetGeometry(modelID, placedGeometry.geometryExpressID);
                const vertexData = ifcApi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
                const indices = ifcApi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());

                // De-interleave vertex arrays

                const positions = [];
                const normals = [];

                for (let k = 0, lenk = vertexData.length / 6; k < lenk; k++) {

                    positions.push(vertexData[k * 6 + 0]);
                    positions.push(vertexData[k * 6 + 1]);
                    positions.push(vertexData[k * 6 + 2]);

                    normals.push(vertexData[k * 6 + 3]);
                    normals.push(vertexData[k * 6 + 4]);
                    normals.push(vertexData[k * 6 + 5]);
                }

                xktModel.createGeometry({
                    geometryId: geometryId,
                    primitiveType: "triangles",
                    positions: positions,
                    normals: normals,
                    indices: indices
                });
            }

            const meshId = ("mesh" + nextId++);

            xktModel.createMesh({
                meshId: meshId,
                geometryId: geometryId,
                matrix: new Float32Array(placedGeometry.flatTransformation),
                color: [placedGeometry.color.x, placedGeometry.color.y, placedGeometry.color.z],
                opacity: placedGeometry.color.w
            });

            meshIds.push(meshId);
        }

        xktModel.createEntity({
            entityId: entityId,
            meshIds: meshIds
        });
    }
}

export {parseIFCIntoXKTModel};
