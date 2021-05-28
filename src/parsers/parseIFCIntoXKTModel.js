import * as WebIFC from "web-ifc/web-ifc-api.js";

/**
 * @desc Parses IFC file data into an {@link XKTModel}.
 *
 * Internally, this function uses [web-ifc](https://github.com/tomvandig/web-ifc) to parse the IFC, which relies on a
 * WASM file to do the parsing.
 *
 * Depending on how we use this function, we may need to provide it with a path to the directory where that WASM file is stored.
 *
 * ## Usage
 *
 * In the example below we'll create an {@link XKTModel}, then load an IFC model into it.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#parsers_IFC_RevitSample1)]
 *
 * ````javascript
 * utils.loadArraybuffer("./models/ifc/rac_advanced_sample_project.ifc", async (ifcData) => {
 *
 *     const xktModel = new XKTModel();
 *
 *     parseIFCIntoXKTModel({ifcData, xktModel, wasmPath: "../dist/"});
 *
 *     xktModel.finalize();
 * });
 * ````
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer} [params.ifcData] IFC file data.
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

    const ifcAPI = new WebIFC.IfcAPI();

    if (wasmPath) {
        ifcAPI.SetWasmPath(wasmPath);
    }

    await ifcAPI.Init();

    const dataArray = new Uint8Array(ifcData);

    const modelID = ifcAPI.OpenModel("foo.ifc", dataArray);

    const ctx = {modelID, ifcAPI, xktModel, nextId: 0};

    parseEntities(ctx);

    parseMetadata(ctx);
}

function parseEntities(ctx) {

    const flatMeshes = ctx.ifcAPI.LoadAllGeometry(ctx.modelID);

    for (let i = 0, len = flatMeshes.size(); i < len; i++) {

        const flatMesh = flatMeshes.get(i);
        const entityId = flatMesh.expressID;
        const placedGeometries = flatMesh.geometries;

        const meshIds = [];

        for (let j = 0, lenj = placedGeometries.size(); j < lenj; j++) {

            const placedGeometry = placedGeometries.get(j);
            const geometryId = "" + placedGeometry.geometryExpressID;

            if (!ctx.xktModel.geometries[geometryId]) {

                const geometry = ctx.ifcAPI.GetGeometry(ctx.modelID, placedGeometry.geometryExpressID);
                const vertexData = ctx.ifcAPI.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
                const indices = ctx.ifcAPI.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());

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

                ctx.xktModel.createGeometry({
                    geometryId: geometryId,
                    primitiveType: "triangles",
                    positions: positions,
                    normals: normals,
                    indices: indices
                });
            }

            const meshId = ("mesh" + ctx.nextId++);

            ctx.xktModel.createMesh({
                meshId: meshId,
                geometryId: geometryId,
                matrix: new Float32Array(placedGeometry.flatTransformation),
                color: [placedGeometry.color.x, placedGeometry.color.y, placedGeometry.color.z],
                opacity: placedGeometry.color.w
            });

            meshIds.push(meshId);
        }

        ctx.xktModel.createEntity({
            entityId: entityId,
            meshIds: meshIds
        });
    }
}

function parseMetadata(ctx) {
    const lines = ctx.ifcAPI.GetLineIDsWithType(ctx.modelID, WebIFC.IFCPROJECT);
    const ifcProjectId = lines.get(0);
    const ifcProject = ctx.ifcAPI.GetLine(ctx.modelID, ifcProjectId);
    getAllSpatialChildren(ctx, ifcProject);
    createMetaObjects(ctx, ifcProject);
}

// function getAllSpatialChildren(ctx, spatialElement) {
//     const ifcAPI = ctx.ifcAPI;
//     const id = spatialElement.expressID;
//     const spatialChildrenIDs = getAllRelatedItemsOfType(ctx, id, WebIFC.IFCRELAGGREGATES, "RelatingObject", "RelatedObjects");
//     spatialElement.spatialChildren = spatialChildrenIDs.map((id) => ifcAPI.GetLine(ctx.modelID, id, false));
//     spatialElement.hasChildren = getAllRelatedItemsOfType(ctx, id, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE, "RelatingStructure", "RelatedElements");
//     spatialElement.spatialChildren.forEach(child => getAllSpatialChildren(ctx, child));
// }

function getAllSpatialChildren(ctx, spatialElement) {

    const ifcAPI = ctx.ifcAPI;
    const elementId = spatialElement.expressID;

    const childrenIDs = getAllRelatedItemsOfType(ctx, elementId, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE, "RelatingStructure", "RelatedElements");
    const spatialChildrenIDs = getAllRelatedItemsOfType(ctx, elementId, WebIFC.IFCRELAGGREGATES, "RelatingObject", "RelatedObjects");

    spatialElement.spatialChildren = spatialChildrenIDs.map((id) => ifcAPI.GetLine(ctx.modelID, id, false));
    spatialElement.hasChildren = childrenIDs.map((id) => ifcAPI.GetLine(ctx.modelID, id, false));

    spatialElement.hasChildren.forEach(child => getAllSpatialChildren(ctx, child));
    spatialElement.spatialChildren.forEach(child => getAllSpatialChildren(ctx, child));
}


function getAllRelatedItemsOfType(ctx, elementID, type, relation, relatedProperty) {
    const ifcAPI = ctx.ifcAPI;
    const lines = ifcAPI.GetLineIDsWithType(ctx.modelID, type);
    const ids = [];
    for (let i = 0; i < lines.size(); i++) {
        const relID = lines.get(i);
        const rel = ifcAPI.GetLine(ctx.modelID, relID);
        const relatedItems = rel[relation];
        let foundElement = false;
        if (Array.isArray(relatedItems)) {
            relatedItems.forEach((relID) => {
                if (relID.value === elementID) {
                    foundElement = true;
                }
            });
        } else {
            foundElement = (relatedItems.value === elementID);
        }
        if (foundElement) {
            const element = rel[relatedProperty];
            if (!Array.isArray(element)) {
                ids.push(element.value);
            } else {
                element.forEach(ele => ids.push(ele.value))
            }
        }
    }
    return ids;
}

function createMetaObjects(ctx, ifcElement, parentMetaObjectId) {
    const metaObjectId = ifcElement.GlobalId.value;
    //const metaObjectId = ifcElement.expressID;
    const metaObjectType = ifcElement.__proto__.constructor.name;
    const metaObjectName = ifcElement.Name ? ifcElement.Name.value : metaObjectType;
    ctx.xktModel.createMetaObject({
        metaObjectId: metaObjectId,
        metaObjectType: metaObjectType,
        metaObjectName: metaObjectName,
        parentMetaObjectId: parentMetaObjectId
    });
    console.log(metaObjectId + " - " + metaObjectType);
    const spatialChildren = ifcElement.spatialChildren;
    if (spatialChildren && spatialChildren.length > 0) {
        for (let i = 0, len = spatialChildren.length; i < len; i++) {
            const spatialChildElement = spatialChildren[i];
            createMetaObjects(ctx, spatialChildElement, ifcElement, metaObjectId);
        }
    } else {
        const hasChildren = ifcElement.hasChildren;
        if (hasChildren && hasChildren.length > 0) {
            for (let i = 0, len = hasChildren.length; i < len; i++) {
                const childElement = hasChildren[i];
                const _parentMetaObjectId = metaObjectId;
                createMetaObjects(ctx, childElement, ifcElement, metaObjectId);
            }
        }
    }
}

export {parseIFCIntoXKTModel};
