#!/usr/bin/env node

const commander = require('commander');
const package = require('./package.json');
const convert2xkt = require('./dist/convert2xkt.cjs.js');
const fs = require('fs');

const program = new commander.Command();

program.version(package.version, '-v, --version');

program
    .option('-s, --source [file]', 'path to source file')
    .option('-f, --format [string]', 'source file format (optional); supported formats are gltf, ifc, laz, las, pcd, ply, stl and cityjson')
    .option('-m, --metamodel [file]', 'path to source metamodel JSON file (optional)')
    .option('-o, --output [file]', 'path to target .xkt file; creates directories on path automatically if not existing')
    .option('-p, --properties [file]', 'path to target directory for object property files; creates directories on path automatically if not existing')
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

async function main() {

    if (program.output) {
        const outputDir = getBasePath(program.output).trim();
        if (outputDir !== "" && !fs.existsSync(outputDir)){
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }

    if (program.properties) {
        const outputPropertiesDir = getBasePath(program.properties).trim();
        if (outputPropertiesDir !== "" && !fs.existsSync(outputPropertiesDir)){
            fs.mkdirSync(outputPropertiesDir, { recursive: true });
        }
    }

    const result = await convert2xkt({
        source: program.source,
        format: program.format,
        metaModelSource: program.metamodel,
        output: program.output,
        outputObjectProperties: program.properties ? async function (objectId, props) {
            await fs.writeFileSync(`${program.properties}/${objectId}.json`, JSON.stringify(props, null, "\t"));
        } : null,
        log
    });

    if (result < 0) {
        process.exit(1);
    }
}

function getBasePath(src) {
    const i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
