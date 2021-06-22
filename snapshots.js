#!/usr/bin/env node

const PercyScript = require('@percy/script');
const httpServer = require('http-server');
const convert2xkt = require("./dist/convert2xkt.cjs.js");
const fs = require('fs');
const rimraf = require("rimraf");
const path = require("path");

const puppeteer = require('puppeteer');

const SOURCE_FILES = [

    "tests/models/3dxml/widget.3dxml",

    "tests/models/cityjson/csol.json",
    "tests/models/cityjson/msol.json",
    "tests/models/cityjson/msurface.json",
    "tests/models/cityjson/twocube.json",
    "tests/models/cityjson/cube.json",
    "tests/models/cityjson/tetra.json",
    "tests/models/cityjson/torus.json",
    "tests/models/cityjson/DenHaag_01.json",
    "tests/models/cityjson/LoD3_Railway.json",

    "tests/models/ifc/confCenter.ifc",
    "tests/models/ifc/dataHolter.ifc",
    "tests/models/ifc/Duplex.ifc",
    "tests/models/ifc/IfcOpenHouse2x3.ifc",
    "tests/models/ifc/IfcOpenHouse4.ifc",
    "tests/models/ifc/MAP.ifc",
    "tests/models/ifc/rac_advanced_sample_project.ifc",
    "tests/models/ifc/rme_advanced_sample_project.ifc",

    "tests/models/laz/autzen.laz",
    "tests/models/laz/indoor.0.1.laz",

    // // "tests/models/stl/ascii/slotted_disk.stl",
    // // "tests/models/stl/binary/spurGear.stl",

    "tests/models/gltf/schependomlaan/scene.gltf",
    "tests/models/gltf/duplex/scene.gltf",
    "tests/models/gltf/MAP/MAP.gltf",
    "tests/models/gltf/MAP/MAP_from_e57_inf3cm.gltf"
];

const OUTPUT_DIR = "./tests/models/xkt";
const PROPS_SUBDIR_NAME = "props";

const firefoxOptions = {
    product: 'firefox',
    extraPrefsFirefox: {
        // Enable additional Firefox logging from its protocol implementation
        // 'remote.log.level': 'Trace',
    },
    dumpio: true,
    headless: false
};

const chromeOptions = {
    // product: 'chrome',
    headless: false
};

// PercyScript.run(async (page, percySnapshot) => {
//     await test();
// });

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

async function test() {

    // Create XKT files and property sets

    rimraf.sync(OUTPUT_DIR);
    fs.mkdirSync(OUTPUT_DIR);


    const modelStats = {
        modelStats: {}
    };

    for (let i = 0, len = SOURCE_FILES.length; i < len; i++) {
        const src = SOURCE_FILES[i];
        const stats = {
            src: src
        };
        await convert(src, stats);
        modelStats.modelStats[src] = stats;
    }

    for (let i = 0, len = SOURCE_FILES.length; i < len; i++) {

        const browser = await puppeteer.launch(chromeOptions);
        const src = SOURCE_FILES[i];

        const baseName = path.basename(src, path.extname(src));

        const page = await browser.newPage();

        await page.setDefaultNavigationTimeout(3000000);

        await page.goto("http://localhost:8080/tests/loadXKT.html?modelId=" + baseName);

        await page.waitForSelector('#percyLoaded')

        const element = await page.$('#percyLoaded')
        const value = await page.evaluate(el => el.innerText, element)
        const pageStats = JSON.parse(value);

        await page.screenshot({path: baseName + '.png'});

        await page.close();

        const stats = modelStats.modelStats[src];

        stats.loadingTime = pageStats.loadingTime;
        stats.fps = pageStats.fps;

        console.log("\n");

        await browser.close();
    }

    await fs.promises.writeFile(OUTPUT_DIR + "/stats.json", JSON.stringify(modelStats, null, "\t"));

    statsToMarkdown(modelStats);

    console.log("Done.");
}

async function convert(source, stats) {

    const baseName = path.basename(source, path.extname(source));
    const dir = OUTPUT_DIR + "/" + baseName;
    const propsDir = dir + "/" + PROPS_SUBDIR_NAME;

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    if (!fs.existsSync(propsDir)) {
        fs.mkdirSync(propsDir);
    }

    await convert2xkt({

        source,

        outputXKTModel: async function (xktModel) {
            // console.log("projectId " + xktModel.projectId);
            // console.log("modelId " + xktModel.modelId);
            // console.log("revisionId " + xktModel.revisionId);
            //...
        },

        outputXKT: async function (xktData) {
            await fs.promises.writeFile(dir + "/model.xkt", xktData);
        },

        // outputObjectProperties: async function (id, props) {
        //     await fs.promises.writeFile(propsDir + "/" + id + ".json", JSON.stringify(props, null, "\t"));
        // },

        stats,

        log: (msg) => {
            console.log(msg)
        }
    });
}

function statsToMarkdown(stats) {
    const rows = [];
    rows.push('| Source | Objects | Triangles | Vertices | Source kB | XKT kB | Compression | Convert Secs | Load Secs | FPS |');
    rows.push('|-|-|-|-|-|-|-|-|-|-|');
    for (let src in stats.modelStats) {
        const modelStats = stats.modelStats[src];
        const numObjects = modelStats.numObjects;
        const foo = "ll"
        rows.push(`| [${modelStats.src}](./tests/loadXKT.html?xkt=${foo}) | ${modelStats.numObjects} | ${modelStats.numTriangles} | ${modelStats.numVertices} | ${modelStats.sourceSize} | ${modelStats.xktSize} | ${modelStats.compressionRatio} | ${modelStats.conversionTime} | ${modelStats.loadingTime} | ${modelStats.fps} |`);
    }
    const markdown = rows.join("\n");
    console.log(markdown);
    return markdown;
}