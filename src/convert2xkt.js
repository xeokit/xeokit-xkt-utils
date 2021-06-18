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

async function convert2xkt({
                               source,
                               format,
                               metamodel,
                               output,
                               log = (msg) => {
                               }
                           }) {

    if (!source) {
        throw "Argument expected: source";
    }

    if (!output) {
        throw "Argument expected: output";
    }

    log('Reading input file: ' + source);

    const startTime = new Date();

    const ext = format || source.split('.').pop();

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
            await parseIFCIntoXKTModel({data, xktModel, wasmPath: "./", log});
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
            log('Error: unsupported source file format.');
            return -1;
    }

    log('Writing XKT file: ' + output);

    xktModel.finalize();

    const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
    const xktContent = Buffer.from(xktArrayBuffer);

    await fs.writeFile(output, xktContent);

    const targetFileSizeBytes = xktArrayBuffer.byteLength;

    log("XKT version: 9");
    log("XKT size: " + (targetFileSizeBytes / 1000).toFixed(2) + " kB");
    log("Compression ratio: " + (sourceFileSizeBytes / targetFileSizeBytes).toFixed(2));
    log("Conversion time: " + ((new Date() - startTime) / 1000.0).toFixed(2) + " s");

    return 0;
}

function getBasePath(src) {
    const i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}

export default convert2xkt;