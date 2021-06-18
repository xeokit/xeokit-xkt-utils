#!/usr/bin/env node

const PercyScript = require('@percy/script');
const httpServer = require('http-server');
const convert2xkt = require("./dist/convert2xkt.cjs.js");
const fs = require('fs');
const rimraf = require("rimraf");
const path = require("path");

const SOURCE_FILES = [
    "tests/models/3dxml/widget.3dxml",
    "tests/models/cityjson/csol.json",
    "tests/models/cityjson/cube.json",
    "tests/models/cityjson/DenHaag_01.json",
    "tests/models/cityjson/LoD3_Railway.json",
    "tests/models/ifc/Duplex.ifc",
    "tests/models/ifc/IfcOpenHouse2x3.ifc",
    "tests/models/ifc/IfcOpenHouse4.ifc",
    "tests/models/ifc/MAP.ifc",
    "tests/models/ifc/rac_advanced_sample_project.ifc",
    "tests/models/ifc/rme_advanced_sample_project.ifc"
];

const OUTPUT_DIR = "./tests/models/xkt";

// PercyScript.run(async (page, percySnapshot) => {
//     await test();
// });


test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

async function test() {

    async function convert(source) {

        const dir = "./tests/models/xkt/" + path.basename(source, path.extname(source))
        const propsDir = dir + "/props";

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        if (!fs.existsSync(propsDir)) {
            fs.mkdirSync(propsDir);
        }

        await convert2xkt({

            source,

            outputXKT: async function (xktData) {
                await fs.promises.writeFile(dir + "/model.xkt", xktData);
            },

            outputObjectProperties: async function (id, props) {
                await fs.promises.writeFile(propsDir + "/" + id + ".json", JSON.stringify(props, null, "\t"));
            },

            log: (msg) => {
                console.log(msg)
            }
        });
    }

    async function testPage(source) {

        const dir = "./tests/models/xkt/" + path.basename(source, path.extname(source))
        const propsDir = dir + "/props";
        const xktFilePath = dir + "/model.xkt";
        await page.goto('http://localhost:3000/tests/' + pageName);
        await page.waitForFunction(() => !!document.querySelector('#percyLoaded'));
        await percySnapshot(pageName, {
            widths: [1280]
        });

    }

    // Create XKT files and property sets

    rimraf.sync(OUTPUT_DIR);
    fs.mkdirSync(OUTPUT_DIR);

    for (let i = 0, len = SOURCE_FILES.length; i < len; i++) {
        await convert(SOURCE_FILES[i]);
    }

    // Make visual snapshot of each model

    // for (let i = 0, len = SOURCE_FILES.length; i < len; i++) {
    //     await testPage("loadXKT.html?xkt_src=../" + SOURCE_FILES[i]);
    // }

    console.log("Done.");
}