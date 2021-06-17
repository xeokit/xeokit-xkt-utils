#!/usr/bin/env node

const fs = require('fs').promises;
const commander = require('commander');
const package = require('./package.json');
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
} = require("./dist/xeokit-xkt-utils.cjs.js");

const program = new commander.Command();

program.version(package.version, '-v, --version');

program
    .option('-s, --source [file]', 'path to source file')
    .option('-f, --format [string]', 'source file format (optional); supported formats are gltf, ifc, laz, las, pcd, ply, stl and cityjson')
    .option('-m, --metamodel [file]', 'path to source metamodel JSON file (optional)')
    .option('-o, --output [file]', 'path to target .xkt file')
    .option('-l, --log', 'enable logging');

program.on('--help', () => {

});

program.parse(process.argv);

const options = program.opts();

if (program.source === undefined) {
    console.error('Error: please specify source file path.');
    program.help();
    process.exit(1);
}

if (program.output === undefined) {
    console.error('Error: please specify target xkt file path.');
    program.help();
    process.exit(1);
}

function log(msg) {
    if (options.log) {
        console.log(msg);
    }
}

log('Reading input file: ' + program.source);

const startTime = new Date();

async function main() {

    const ext = program.format || program.source.split('.').pop();

    if (ext === "ifc") {
        console.log("Warning: Here be dragons; IFC conversion is very alpha!")
    }

    let fileContent;

    try {
        fileContent = await fs.readFile(program.source);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }

    const sourceFileSizeBytes = fileContent.byteLength;

    log("Input file size: " + (sourceFileSizeBytes / 1000).toFixed(2) + " kB");

    let metaModelData;

    if (program.metamodel) {
        try {
            const metaModelFileData = await fs.readFile(program.metamodel);
            metaModelData = JSON.parse(metaModelFileData);
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }

    const xktModel = new XKTModel();

    if (metaModelData) {
        await parseMetaModelIntoXKTModel({metaModelData, xktModel});
    }

    log("Converting...");

    switch (ext) {

        case "json":
            const cityJSONData = JSON.parse(fileContent);
            await parseCityJSONIntoXKTModel({cityJSONData, xktModel, log});
            break;

        case "gltf":
            const gltfData = JSON.parse(fileContent);
            const gltfBasePath = getBasePath(program.source);
            await parseGLTFIntoXKTModel({
                gltfData,
                xktModel,
                getAttachment: async (name) => {
                    return fs.readFile(gltfBasePath + name);
                },
                log
            });
            break;

        case "ifc":
            await parseIFCIntoXKTModel({
                ifcData: fileContent, xktModel, wasmPath: "./", log
            });
            break;

        case "laz":
            await parseLASIntoXKTModel({lazData: fileContent, xktModel, log});
            break;

        case "las":
            await parseLASIntoXKTModel({lazData: fileContent, xktModel, log});
            break;

        case "pcd":
            await parsePCDIntoXKTModel({pcdData: fileContent, xktModel, log});
            break;

        case "ply":
            await parsePLYIntoXKTModel({plyData: fileContent, xktModel, log});
            break;

        case "stl":
            await parseSTLIntoXKTModel({stlData: fileContent, xktModel, log});
            break;

        case "3dxml":
            const domParser = new DOMParser();
            await parse3DXMLIntoXKTModel({blob: fileContent, domParser, xktModel, log});
            break;

        default:
            console.error('Error: unsupported source file format.');
            program.help();
            process.exit(1);
            break;
    }

    log('Writing XKT file: ' + program.output);

    xktModel.finalize();

    const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
    const xktContent = Buffer.from(xktArrayBuffer);

    await fs.writeFile(program.output, xktContent);

    const targetFileSizeBytes = xktArrayBuffer.byteLength;

    log("XKT version: 9");
    log("XKT size: " + (targetFileSizeBytes / 1000).toFixed(2) + " kB");
    log("Compression ratio: " + (sourceFileSizeBytes / targetFileSizeBytes).toFixed(2));
    log("Conversion time: " + ((new Date() - startTime) / 1000.0).toFixed(2) + " s");
}

function getBasePath(src) {
    const i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
