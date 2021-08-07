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
 * utils.loadArraybuffer("./models/ifc/rac_advanced_sample_project.ifc", async (data) => {
 *
 *     const xktModel = new XKTModel();
 *
 *     parseIFCIntoXKTModel({
 *          data,
 *          xktModel,
 *          wasmPath: "../dist/",
 *          autoNormals: true,
 *          log: (msg) => { console.log(msg); }
 *     }).then(()=>{
 *        xktModel.finalize();
 *     },
 *     (msg) => {
 *         console.error(msg);
 *     });
 * });
 * ````
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer} [params.data] IFC file data.
 * @param {XKTModel} [params.xktModel] XKTModel to parse into.
 * @param {Boolean} [params.autoNormals=true] When true, the parser will ignore the IFC geometry normals, and the IFC
 * data will rely on the xeokit ````Viewer```` to automatically generate them. This has the limitation that the
 * normals will be face-aligned, and therefore the ````Viewer```` will only be able to render a flat-shaded representation
 * of the IFC model. This is ````true```` by default, because IFC models tend to look acceptable with flat-shading,
 * and we always want to minimize IFC model size wherever possible.
 * @param {String} params.wasmPath Path to ````web-ifc.wasm````, required by this function.
 * @param {Function} [params.outputObjectProperties] Callback to collect each object's property set.
 * @param {Object} [params.stats] Collects statistics.
 * @param {function} [params.log] Logging callback.
 */
function parseIFCIntoXKTModel({
                                        data,
                                        xktModel,
                                        autoNormals = true,
                                        wasmPath,
                                        outputObjectProperties,
                                        stats={},
                                        log
                                    }) {

    return new Promise(function(resolve, reject) {

        if (!data) {
            reject("Argument expected: data");
            return;
        }

        if (!xktModel) {
            reject("Argument expected: xktModel");
            return;
        }

        if (!wasmPath) {
            reject("Argument expected: wasmPath");
            return;
        }

        const ifcAPI = new WebIFC.IfcAPI();

        if (wasmPath) {
            ifcAPI.SetWasmPath(wasmPath);
        }

        ifcAPI.Init().then(() => {

            const dataArray = new Uint8Array(data);

            const modelID = ifcAPI.OpenModel(dataArray);

            stats.sourceFormat = "IFC";
            stats.schemaVersion = "";
            stats.title = "";
            stats.author = "";
            stats.created = "";
            stats.numTriangles = 0;
            stats.numVertices = 0;
            stats.numObjects = 0;
            stats.numGeometries = 0;

            const ctx = {
                modelID,
                ifcAPI,
                xktModel,
                autoNormals,
                outputObjectProperties,
                log: (log || function (msg) {
                }),
                nextId: 0,
                stats
            };

            const lines = ctx.ifcAPI.GetLineIDsWithType(modelID, WebIFC.IFCPROJECT);
            const ifcProjectId = lines.get(0);
            const ifcProject = ctx.ifcAPI.GetLine(modelID, ifcProjectId);

            ctx.xktModel.schema = "";
            ctx.xktModel.modelId = "" + modelID;
            ctx.xktModel.projectId = "" + ifcProjectId;

            parseGeometry(ctx);
            parseMetadata(ctx);

            ctx.log("Converted objects: " + stats.numObjects);
            ctx.log("Converted geometries: " + stats.numGeometries);
            ctx.log("Converted triangles: " + stats.numTriangles);
            ctx.log("Converted vertices: " + stats.numVertices);

            resolve();

        }).catch((e) => {

            reject(e);
        })
    });
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

                ctx.stats.numGeometries++;
                ctx.stats.numVertices += (positions.length / 3);
                ctx.stats.numTriangles += (indices.length / 3);
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

        ctx.stats.numObjects++;
    }
}

function parseMetadata(ctx) {

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
    const propertySetId = ctx.outputObjectProperties ? metaObjectId : null;
    const metaObjectType = ifcElement.__proto__.constructor.name;
    const metaObjectName = (ifcElement.Name && ifcElement.Name.value !== "") ? ifcElement.Name.value : metaObjectType;

    ctx.xktModel.createMetaObject({metaObjectId, propertySetId, metaObjectType, metaObjectName, parentMetaObjectId});

    if (ctx.outputObjectProperties) {

        // const typeId = getAllRelatedItemsOfType(
        //     modelID,
        //     elementID,
        //     IFCRELDEFINESBYTYPE,
        //     'RelatedObjects',
        //     'RelatingType'
        // );
        // return typeId.map((id) => this.state.api.GetLine(modelID, id, recursive));

        const json = {
            id: metaObjectId,
            type: metaObjectType,
            name: metaObjectName
        };

        if (parentMetaObjectId) {
            json.parent = parentMetaObjectId;
        }

        ctx.outputObjectProperties(propertySetId, json);
    }
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
