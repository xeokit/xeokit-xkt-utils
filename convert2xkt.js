#!/usr/bin/env node

const commander = require('commander');
const package = require('./package.json');
const convert2xkt = require('./dist/convert2xkt.cjs.js');

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

async function main() {

    const result = await convert2xkt({
        source: program.source,
        format: program.format,
        metamodel: program.metamodel,
        output: program.output,
        log});

    if (result < 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
