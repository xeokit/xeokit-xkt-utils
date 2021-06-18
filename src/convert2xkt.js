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
 * Converts an IFC file into an XKT file, plus optional per-object property sets.
 *
 * @private
 * @param {Object} params Conversion parameters.
 * @param {String}[params.source] Path to source file. Alternative to ````sourceData````.
 * @param {ArrayBuffer|JSON}[params.sourceData] Source file data. Alternative to ````source````.
 * @param {String}[params.sourceFormat] Format of source file/data. Always needed with ````sourceData````, but not normally needed with ````source````, because convert2xkt will determine the format automatically from the file extension of ````source````.
 * @param {Object}[params.metamodel]
 * @param {String}[params.output] Path to destination file. Alternative to ````outputXKT````.
 * @param {Function}[params.outputXKT] Callback to collect XKT file data.
 * @param {Function}[params.outputObjectProperties] Callback to collect each object's property set.
 * @param {Function}[params.log] Logging callback.
 * @return {Promise<number>}
 */
async function convert2xkt({
                               source,
                               sourceData,
                               sourceFormat,
                               metamodel,
                               output,
                               outputXKT,
                               outputObjectProperties,
                               log = (msg) => {
                               }
                           }) {

    if (!source && !sourceData) {
        throw "Argument expected: source or sourceData";
    }

    if (!output && !outputXKT) {
        throw "Argument expected: output or outputXKT";
    }

    if (source) {
        log('Reading input file: ' + source);
    }

    const startTime = new Date();

    const ext = sourceFormat || source.split('.').pop();

    if (ext === "ifc") {
        log("Warning: Here be dragons; IFC conversion is very alpha!")
    }

    let data;

    try {
        data = await fs.readFile(source);
    } catch (err) {
        log(err);
        return -1;
    }

    const sourceFileSizeBytes = data.byteLength;

    log("Input file size: " + (sourceFileSizeBytes / 1000).toFixed(2) + " kB");

    let metaModelData;

    if (metamodel) {
        try {
            const metaModelFileData = await fs.readFile(metamodel);
            metaModelData = JSON.parse(metaModelFileData);
        } catch (err) {
            log(err);
            return -1;
        }
    }

    const xktModel = new XKTModel();

    if (metaModelData) {
        await parseMetaModelIntoXKTModel({metaModelData, xktModel});
    }

    log("Converting...");

    switch (ext) {

        case "json":
            await parseCityJSONIntoXKTModel({data: JSON.parse(data), xktModel, log});
            break;

        case "gltf":
            const gltfBasePath = getBasePath(program.source);
            await parseGLTFIntoXKTModel({
                data: JSON.parse(data),
                xktModel,
                getAttachment: async (name) => {
                    return fs.readFile(gltfBasePath + name);
                },
                log
            });
            break;

        case "ifc":
            await parseIFCIntoXKTModel({
                data,
                xktModel,
                wasmPath: "./",
                outputObjectProperties,
                log
            });
            break;

        case "laz":
            await parseLASIntoXKTModel({data, xktModel, log});
            break;

        case "las":
            await parseLASIntoXKTModel({data, xktModel, log});
            break;

        case "pcd":
            await parsePCDIntoXKTModel({data, xktModel, log});
            break;

        case "ply":
            await parsePLYIntoXKTModel({data, xktModel, log});
            break;

        case "stl":
            await parseSTLIntoXKTModel({data, xktModel, log});
            break;

        case "3dxml":
            const domParser = new DOMParser();
            await parse3DXMLIntoXKTModel({data, domParser, xktModel, log});
            break;

        default:
            log('Error: unsupported source format.');
            return -1;
    }

    xktModel.finalize();

    const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
    const xktContent = Buffer.from(xktArrayBuffer);

    const targetFileSizeBytes = xktArrayBuffer.byteLength;

    log("Converted to: XKT v9");
    log("XKT size: " + (targetFileSizeBytes / 1000).toFixed(2) + " kB");
    log("Compression ratio: " + (sourceFileSizeBytes / targetFileSizeBytes).toFixed(2));
    log("Conversion time: " + ((new Date() - startTime) / 1000.0).toFixed(2) + " s");

    if (output) {
        log('Writing XKT file: ' + output);
        await fs.writeFile(output, xktContent);
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

export default convert2xkt;