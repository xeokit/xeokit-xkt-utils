#!/usr/bin/env node

const fs = require('fs').promises;
const commander = require('commander');
const package = require('./package.json');

const {
    XKTModel,
    parseIFCIntoXKTModel,
    parseGLTFIntoXKTModel,
    parseLASIntoXKTModel,
    parsePCDIntoXKTModel,
    parseSTLIntoXKTModel,
    parsePLYIntoXKTModel,
    parseMetaModelIntoXKTModel,
    writeXKTModelToArrayBuffer
} = require("./dist/xeokit-xkt-utils.cjs.js");

const program = new commander.Command();

program.version(package.version, '-v, --version');

program
    .option('-s, --source [file]', 'path to source file; supported formats are .gltf, .ifc, .laz, .las, .pcd, .ply and .stl')
    .option('-m, --metamodel [file]', 'path to source metamodel JSON file (optional)')
    .option('-o, --output [file]', 'path to target .xkt file');

program.on('--help', () => {

});

program.parse(process.argv);

if (program.source === undefined) {
    console.error('\n\nError: please specify source file path.');
    program.help();
    process.exit(1);
}

if (program.output === undefined) {
    console.error('\n\nError: please specify target xkt file path.');
    program.help();
    process.exit(1);
}

console.log('\n\nReading input file: ' + program.source);

async function main() {

    const fileContent = await fs.readFile(program.source);

    let metaModelData;

    if (program.metamodel) {
        const metaModelFileData = await fs.readFile(program.metamodel);
        metaModelData = JSON.parse(metaModelFileData);
    }

    const xktModel = new XKTModel();

    if (metaModelData) {
        await parseMetaModelIntoXKTModel({metaModelData, xktModel});
    }

    const ext = program.source.split('.').pop();

    switch (ext) {

        case "gltf":
            const gltfData = JSON.parse(fileContent);
            const gltfBasePath = getBasePath(program.source);
            await parseGLTFIntoXKTModel({
                gltfData,
                xktModel,
                getAttachment: async (name) => {
                    return fs.readFile(gltfBasePath + name);
                }
            });
            break;

        case "ifc":
            await parseIFCIntoXKTModel({ifcData: fileContent, xktModel, wasmPath: "../dist/"});
            break;

        case "laz":
        case "las":
            await parseLASIntoXKTModel({lazData: fileContent, xktModel});
            break;

        case "pcd":
            await parsePCDIntoXKTModel({pcdData: fileContent, xktModel});
            break;

        case "ply":
            await parsePLYIntoXKTModel({plyData: fileContent, xktModel});
            break;

        case "stl":
            await parseSTLIntoXKTModel({stlData: fileContent, xktModel});
            break;

        default:
            console.error('\n\nError: unsupported source file format.');
            program.help();
            process.exit(1);
            break;
    }

    console.log('Converting to XKT format v8');

    xktModel.finalize();

    const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
    const xktContent = Buffer.from(xktArrayBuffer);

    await fs.writeFile(program.output, xktContent);
}

function getBasePath(src) {
    const i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}

main().catch(err => {
    console.error('Something went wrong:', err);
    process.exit(1);
});
