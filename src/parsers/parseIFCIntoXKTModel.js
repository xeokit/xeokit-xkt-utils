import * as WebIFC from "web-ifc/web-ifc-api.js";

/**
 * @desc Parses IFC STEP file data into an {@link XKTModel}.
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
 *     parseIFCIntoXKTModel({
 *          ifcData,
 *          xktModel,
 *          wasmPath: "../dist/",
 *          autoNormals: true,
 *          log: (msg) => { console.log(msg); }
 *     });
 *
 *     xktModel.finalize();
 * });
 * ````
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer} [params.ifcData] IFC file data.
 * @param {XKTModel} [params.xktModel] XKTModel to parse into.
 * @param {Boolean} [params.autoNormals=true] When true, the parser will ignore the IFC geometry normals, and the IFC
 * data will rely on the xeokit ````Viewer```` to automatically generate them. This has the limitation that the
 * normals will be face-aligned, and therefore the ````Viewer```` will only be able to render a flat-shaded representation
 * of the IFC model. This is ````true```` by default, because IFC models tend to look acceptable with flat-shading,
 * and we always want to minimize IFC model size wherever possible.
 * @param {String} params.wasmPath Path to ````web-ifc.wasm````, required by this function.
 * @param {function} [params.log] Logging callback.
 */
async function parseIFCIntoXKTModel({ifcData, xktModel, autoNormals = true, wasmPath, log}) {

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

    const modelID = ifcAPI.OpenModel(dataArray);

    const ctx = {
        modelID,
        ifcAPI,
        xktModel,
        autoNormals,
        log: (log || function (msg) {
        }),
        nextId: 0,
        stats: {
            convertedObjects: 0,
            convertedGeometries: 0
        }
    };

    const lines = ctx.ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCPROJECT);
    const ifcProjectId = lines.get(0);
    const ifcProject = ctx.ifcAPI.GetLine(modelID, ifcProjectId);

    ctx.xktModel.schema = "";
    ctx.xktModel.modelId = "" + modelID;
    ctx.xktModel.projectId = "" + ifcProjectId;

    parseGeometry(ctx);

    parseMetadata(ctx);

    ctx.log("Converted objects: " + ctx.stats.convertedObjects);
    ctx.log("Converted geometries: " + ctx.stats.convertedGeometries);
}

function parseGeometry(ctx) {

    // Parses the geometry and materials in the IFC, creates
    // XKTEntity, XKTMesh and XKTGeometry components within the XKTModel.

    const flatMeshes = ctx.ifcAPI.LoadAllGeometry(ctx.modelID);

    for (let i = 0, len = flatMeshes.size(); i < len; i++) {

        const flatMesh = flatMeshes.get(i);
        const flatMeshExpressID = flatMesh.expressID;
        const placedGeometries = flatMesh.geometries;

        const meshIds = [];

        const properties = ctx.ifcAPI.GetLine(ctx.modelID, flatMeshExpressID);
        const entityId = properties.GlobalId.value;

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
                }

                if (!ctx.autoNormals) {
                    for (let k = 0, lenk = vertexData.length / 6; k < lenk; k++) {
                        normals.push(vertexData[k * 6 + 3]);
                        normals.push(vertexData[k * 6 + 4]);
                        normals.push(vertexData[k * 6 + 5]);
                    }
                }

                ctx.xktModel.createGeometry({
                    geometryId: geometryId,
                    primitiveType: "triangles",
                    positions: positions,
                    normals: ctx.autoNormals ? null : normals,
                    indices: indices
                });

                ctx.stats.convertedGeometries++;
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

        ctx.stats.convertedObjects++;
    }
}

function parseMetadata(ctx) {

    // Parses element properties within the IFC, creates a hierarchy of XKTMetaObject
    // components within the XKTModel. Each leaf XKTMetaObject should correspond to an
    // XKTEntity created with parseGeometry().

    const lines = ctx.ifcAPI.GetLineIDsWithType(ctx.modelID, WebIFC.IFCPROJECT);
    const ifcProjectId = lines.get(0);
    const ifcProject = ctx.ifcAPI.GetLine(ctx.modelID, ifcProjectId);

    parseSpatialChildren(ctx, ifcProject);
}

function parseSpatialChildren(ctx, ifcElement, parentMetaObjectId) {

    createMetaObject(ctx, ifcElement, parentMetaObjectId);

    const metaObjectId = ifcElement.GlobalId.value;

    parseRelatedItemsOfType(
        ctx,
        ifcElement.expressID,
        'RelatingObject',
        'RelatedObjects',
        WebIFC.IFCRELAGGREGATES,
        metaObjectId);

    parseRelatedItemsOfType(
        ctx,
        ifcElement.expressID,
        'RelatingStructure',
        'RelatedElements',
        WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
        metaObjectId);
}

function createMetaObject(ctx, ifcElement, parentMetaObjectId) {

    const metaObjectId = ifcElement.GlobalId.value;
    const metaObjectType = ifcElement.__proto__.constructor.name;
    const metaObjectName = (ifcElement.Name && ifcElement.Name.value !== "") ? ifcElement.Name.value : metaObjectType;

    ctx.xktModel.createMetaObject({metaObjectId, metaObjectType, metaObjectName, parentMetaObjectId});
}

function parseRelatedItemsOfType(ctx, id, relation, related, type, parentMetaObjectId) {

    const lines = ctx.ifcAPI.GetLineIDsWithType(ctx.modelID, type);

    for (let i = 0; i < lines.size(); i++) {

        const relID = lines.get(i);
        const rel = ctx.ifcAPI.GetLine(ctx.modelID, relID);
        const relatedItems = rel[relation];

        let foundElement = false;

        if (Array.isArray(relatedItems)) {
            const values = relatedItems.map((item) => item.value);
            foundElement = values.includes(id);

        } else {
            foundElement = (relatedItems.value === id);
        }

        if (foundElement) {

            const element = rel[related];

            if (!Array.isArray(element)) {

                const ifcElement = ctx.ifcAPI.GetLine(ctx.modelID, element.value);

                parseSpatialChildren(ctx, ifcElement, parentMetaObjectId);

            } else {

                element.forEach((element2) => {

                    const ifcElement = ctx.ifcAPI.GetLine(ctx.modelID, element2.value);

                    parseSpatialChildren(ctx, ifcElement, parentMetaObjectId);
                });
            }
        }
    }
}

export {parseIFCIntoXKTModel};
