import {parseMetaModelIntoXKTModel} from "./parsers/parseMetaModelIntoXKTModel.js";
import {parseCityJSONIntoXKTModel} from "./parsers/parseCityJSONIntoXKTModel.js";
import {parseGLTFIntoXKTModel} from "./parsers/parseGLTFIntoXKTModel.js";
import {parseIFCIntoXKTModel} from "./parsers/parseIFCIntoXKTModel.js";
import {parseLASIntoXKTModel} from "./parsers/parseLASIntoXKTModel.js";
import {parsePCDIntoXKTModel} from "./parsers/parsePCDIntoXKTModel.js";
import {parsePLYIntoXKTModel} from "./parsers/parsePLYIntoXKTModel.js";
import {parseSTLIntoXKTModel} from "./parsers/parseSTLIntoXKTModel.js";
import {parse3DXMLIntoXKTModel} from "./parsers/parse3DXMLIntoXKTModel.js";
import {writeXKTModelToArrayBuffer} from "./XKTModel/writeXKTModelToArrayBuffer.js";
import {XKTModel} from "./XKTModel/XKTModel.js";

const fs = require('fs');
const DOMParser = require('xmldom').DOMParser;


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
 * @private
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
 * @param {Function}[params.outputStats] Callback to collect statistics.
 * @param {Boolean} [params.rotateX=true] Whether to rotate the model 90 degrees about the X axis to make the Y axis "up", if neccessary. Applies to CityJSON and LAS/LAZ models.
 * @param {Function}[params.log] Logging callback.
 * @return {Promise<number>}
 */
function convert2xkt({
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
                         outputStats,
                         rotateX,
                         log = (msg) => {
                         }
                     }) {

    return new Promise(function (resolve, reject) {

        const _log = log;
        log = (msg) => {
            _log("[convert2xkt] " + msg)
        }

        if (!source && !sourceData) {
            reject("Argument expected: source or sourceData");
            return;
        }

        if (!sourceFormat && sourceData) {
            reject("Argument expected: sourceFormat is required with sourceData");
            return;
        }

        if (!output && !outputXKTModel && !outputXKT) {
            reject("Argument expected: output, outputXKTModel or outputXKT");
            return;
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
                sourceData = fs.readFileSync(source);
            } catch (err) {
                reject(err);
                return;
            }
        }

        const sourceFileSizeBytes = sourceData.byteLength;

        log("Input file size: " + (sourceFileSizeBytes / 1000).toFixed(2) + " kB");

        if (!metaModelData && metaModelSource) {
            try {
                const metaModelFileData = fs.readFileSync(metaModelSource);
                metaModelData = JSON.parse(metaModelFileData);
            } catch (err) {
                reject(err);
                return;
            }
        }

        log("Converting...");

        const xktModel = new XKTModel();

        if (metaModelData) {

            parseMetaModelIntoXKTModel({metaModelData, xktModel}).then(
                () => {
                    convertForFormat();
                },
                (errMsg) => {
                    reject(errMsg);
                });
        } else {
            convertForFormat();
        }

        function convertForFormat() {

            switch (ext) {
                case "json":
                    convert(parseCityJSONIntoXKTModel, {
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
                    convert(parseGLTFIntoXKTModel, {
                        data: JSON.parse(sourceData),
                        xktModel,
                        getAttachment: async (name) => {
                            return fs.readFileSync(gltfBasePath + name);
                        },
                        stats,
                        log
                    });
                    break;

                case "ifc":
                    convert(parseIFCIntoXKTModel, {
                        data: sourceData,
                        xktModel,
                        wasmPath: "./",
                        outputObjectProperties,
                        stats,
                        log
                    });
                    break;

                case "laz":
                    convert(parseLASIntoXKTModel, {
                        data: sourceData,
                        xktModel,
                        stats,
                        rotateX,
                        log
                    });
                    break;

                case "las":
                    convert(parseLASIntoXKTModel, {
                        data: sourceData,
                        xktModel,
                        stats,
                        log
                    });
                    break;

                case "pcd":
                    convert(parsePCDIntoXKTModel, {
                        data: sourceData,
                        xktModel,
                        stats,
                        log
                    });
                    break;

                case "ply":
                    convert(parsePLYIntoXKTModel, {
                        data: sourceData,
                        xktModel,
                        stats,
                        log
                    });
                    break;

                case "stl":
                    convert(parseSTLIntoXKTModel, {
                        data: sourceData,
                        xktModel,
                        stats,
                        log
                    });
                    break;

                case "3dxml":
                    const domParser = new DOMParser();
                    convert(parse3DXMLIntoXKTModel, {
                        data: sourceData,
                        domParser,
                        xktModel,
                        outputObjectProperties,
                        stats,
                        log
                    });
                    break;

                default:
                    reject('Error: unsupported source format: "${ext}".');
                    return;
            }
        }

        function convert(parser, converterParams) {

            parser(converterParams).then(() => {

                xktModel.finalize();

                const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
                const xktContent = Buffer.from(xktArrayBuffer);

                const targetFileSizeBytes = xktArrayBuffer.byteLength;

                stats.sourceSize = (sourceFileSizeBytes / 1000).toFixed(2);
                stats.xktSize = (targetFileSizeBytes / 1000).toFixed(2);
                stats.compressionRatio = (sourceFileSizeBytes / targetFileSizeBytes).toFixed(2);
                stats.conversionTime = ((new Date() - startTime) / 1000.0).toFixed(2);
                stats.aabb = xktModel.aabb;

                log("Converted to: XKT v9");
                log("XKT size: " + stats.xktSize + " kB");
                log("Compression ratio: " + stats.compressionRatio);
                log("Conversion time: " + stats.conversionTime + " s");

                if (output) {
                    log('Writing XKT file: ' + output);
                    fs.writeFileSync(output, xktContent);
                }

                if (outputXKTModel) {
                    outputXKTModel(xktModel);
                }

                if (outputXKT) {
                    outputXKT(xktContent);
                }

                if (outputStats) {
                    outputStats(stats);
                }

                resolve();

            }, (err) => {
                reject(err);
            });
        }
    });
}


function getBasePath(src) {
    const i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}


export default convert2xkt;