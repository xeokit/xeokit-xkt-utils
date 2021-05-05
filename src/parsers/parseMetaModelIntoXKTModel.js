/**
 * @desc Parses JSON metamodel into an {@link XKTModel}.
 *
 * @param {Object} metaModelData Metamodel data.
 * @param {XKTModel} xktModel XKTModel to parse into.
 * @param {*} [options] Parsing options.
 * @private
 */
function parseMetaModelIntoXKTModel(metaModelData, xktModel, options = {}) {

    const projectId = metaModelData.projectId || "none";
    const revisionId = metaModelData.revisionId || "none";
    const metaObjects = metaModelData.metaObjects || [];
    const author = metaModelData.author;
    const createdAt = metaModelData.createdAt;
    const creatingApplication = metaModelData.creatingApplication;
    const schema = metaModelData.schema;

    let includeTypes;
    if (options.includeTypes) {
        includeTypes = {};
        for (let i = 0, len = options.includeTypes.length; i < len; i++) {
            includeTypes[options.includeTypes[i]] = true;
        }
    }

    let excludeTypes;
    if (options.excludeTypes) {
        excludeTypes = {};
        for (let i = 0, len = options.excludeTypes.length; i < len; i++) {
            includeTypes[options.excludeTypes[i]] = true;
        }
    }

    for (let i = 0, len = metaObjects.length; i < len; i++) {

        const metaObject = metaObjects[i];
        const type = metaObject.type;

        if (excludeTypes && excludeTypes[type]) {
            continue;
        }

        if (includeTypes && !includeTypes[type]) {
            continue;
        }

        xktModel.createMetaObject({
            metaObjectId: metaObject.id,
            metaObjectType: metaObject.type,
            metaObjectName: metaObject.name,
            parentMetaObjectId: metaObject.parent
        })
    }
}

export {parseMetaModelIntoXKTModel};
