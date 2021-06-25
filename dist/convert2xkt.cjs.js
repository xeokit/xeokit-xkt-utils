'use strict';

const fs = require('fs').promises;
const DOMParser = require('xmldom').DOMParser;

const {
    XKTModel,
    parseCityJSONIntoXKTModel,
    parseIFCIntoXKTModel,
    parseGLTFIntoXKTModel,
    parseLASIntoXKTModel,
    parsePCDIntoXKTModel,
    parseSTLIntoXKTModel,
    parsePLYIntoXKTModel,
    parse3DXMLIntoXKTModel,
    parseMetaModelIntoXKTModel,
    writeXKTModelToArrayBuffer
} = require("../dist/xeokit-xkt-utils.cjs.js");

/**
 * Converts model files into xeokit's native XKT format.
 *
 * Supported source formats are:
 *
 * * IFC (experimental),
 * * CityJSON
 * * 3DXML
 * * glTF
 * * LAZ & LAS
 *
 * @param {Object} params Conversion parameters.
 * @param {String}[params.source] Path to source file. Alternative to ````sourceData````.
 * @param {ArrayBuffer|JSON}[params.sourceData] Source file data. Alternative to ````source````.
 * @param {String}[params.sourceFormat] Format of source file/data. Always needed with ````sourceData````, but not normally needed with ````source````, because convert2xkt will determine the format automatically from the file extension of ````source````.
 * @param {String}[params.metaModelSource] Path to source metaModel file. Alternative to ````metaModelData````.
 * @param {ArrayBuffer|JSON}[params.metaModelData] Source file data. Alternative to ````metaModelSource````.
 * @param {String}[params.output] Path to destination XKT file.
 * @param {Function}[params.outputXKTModel] Callback to collect the ````XKTModel```` that is internally build by this method.
 * @param {Function}[params.outputXKT] Callback to collect XKT file data.
 * @param {Function}[params.outputObjectProperties] Callback to collect each object's property set.
 * @param {Object}[stats] Collects statistics.
 * @param {Boolean} [params.rotateX=true] Whether to rotate the model 90 degrees about the X axis to make the Y axis "up", if neccessary. Applies to CityJSON and LAS/LAZ models.
 * @param {Function}[params.log] Logging callback.
 * @return {Promise<number>}
 */
async function convert2xkt({
                               source,
                               sourceData,
                               sourceFormat,
                               metaModelSource,
                               metaModelData,
                               output,
                               outputXKTModel,
                               outputXKT,
                               outputObjectProperties,
                               stats = {},
                               rotateX,
                               log = (msg) => {
                               }
                           }) {

    if (!source && !sourceData) {
        throw "Argument expected: source or sourceData";
    }

    if (!sourceFormat && sourceData) {
        throw "Argument expected: sourceFormat is required with sourceData";
    }

    if (!output && !outputXKTModel && !outputXKT) {
        throw "Argument expected: output, outputXKTModel or outputXKT";
    }

    if (source) {
        log('Reading input file: ' + source);
    }

    const startTime = new Date();

    const ext = sourceFormat || source.split('.').pop();

    if (ext === "ifc") {
        log("Warning: Here be dragons; IFC conversion is very alpha!");
    }

    if (!sourceData) {
        try {
            sourceData = await fs.readFile(source);
        } catch (err) {
            log(err);
            return -1;
        }
    }

    const sourceFileSizeBytes = sourceData.byteLength;

    log("Input file size: " + (sourceFileSizeBytes / 1000).toFixed(2) + " kB");

    if (!metaModelData && metaModelSource) {
        try {
            const metaModelFileData = await fs.readFile(metaModelSource);
            metaModelData = JSON.parse(metaModelFileData);
        } catch (err) {
            log(err);
            return -1;
        }
    }

    log("Converting...");

    const xktModel = new XKTModel();

    if (metaModelData) {
        await parseMetaModelIntoXKTModel({metaModelData, xktModel});
    }

    switch (ext) {

        case "json":

            await parseCityJSONIntoXKTModel({
                data: JSON.parse(sourceData),
                xktModel,
                outputObjectProperties,
                stats,
                rotateX,
                log
            });
            break;

        case "gltf":

            const gltfBasePath = source ? getBasePath(source) : "";

            await parseGLTFIntoXKTModel({
                data: JSON.parse(sourceData),
                xktModel,
                getAttachment: async (name) => {
                    return fs.readFile(gltfBasePath + name);
                },
                stats,
                log
            });
            break;

        case "ifc":

            await parseIFCIntoXKTModel({
                data: sourceData,
                xktModel,
                wasmPath: "./",
                outputObjectProperties,
                stats,
                log
            });

            break;

        case "laz":

            await parseLASIntoXKTModel({
                data: sourceData,
                xktModel,
                stats,
                rotateX,
                log
            });

            break;

        case "las":

            await parseLASIntoXKTModel({
                data: sourceData,
                xktModel,
                stats,
                log
            });

            break;

        case "pcd":

            await parsePCDIntoXKTModel({
                data: sourceData,
                xktModel,
                stats,
                log
            });

            break;

        case "ply":

            await parsePLYIntoXKTModel({
                data: sourceData,
                xktModel,
                stats,
                log
            });

            break;

        case "stl":

            await parseSTLIntoXKTModel({
                data: sourceData,
                xktModel,
                stats,
                log
            });

            break;

        case "3dxml":

            const domParser = new DOMParser();

            await parse3DXMLIntoXKTModel({
                data: sourceData,
                domParser,
                xktModel,
                outputObjectProperties,
                stats,
                log
            });

            break;

        default:

            log('Error: unsupported source format.');

            return -1;
    }

    xktModel.finalize();

    const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
    const xktContent = Buffer.from(xktArrayBuffer);

    const targetFileSizeBytes = xktArrayBuffer.byteLength;

    stats.sourceFormat = ext;
    stats.sourceSize = (sourceFileSizeBytes / 1000).toFixed(2);
    stats.xktSize = (targetFileSizeBytes / 1000).toFixed(2);
    stats.compressionRatio = (sourceFileSizeBytes / targetFileSizeBytes).toFixed(2);
    stats.conversionTime = ((new Date() - startTime) / 1000.0).toFixed(2);

    log("Converted to: XKT v9");
    log("XKT size: " + stats.xktSize + " kB");
    log("Compression ratio: " + stats.compressionRatio);
    log("Conversion time: " + stats.conversionTime + " s");

    if (output) {
        log('Writing XKT file: ' + output);
        await fs.writeFile(output, xktContent);
    }

    if (outputXKTModel) {
        await outputXKTModel(xktModel);
    }

    if (outputXKT) {
        await outputXKT(xktContent);
    }

    return 0;
}

function getBasePath(src) {
    const i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}

module.exports = convert2xkt;
