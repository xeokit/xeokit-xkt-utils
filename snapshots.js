#!/usr/bin/env node

const httpServer = require('http-server');
const convert2xkt = require("./dist/convert2xkt.cjs.js");
const fs = require('fs');
const rimraf = require("rimraf");
const path = require("path");
const puppeteer = require('puppeteer');
const package = require('./package.json');

const SERVER_PORT = 3000;
const SCREENSHOT_SIZE = [200, 200];
const HEADLESS = false;
const OUTPUT_DIR = "./tests/models/xkt";

const SOURCE_FILES = [
    {
        modelId: "3dxml_widget",
        modelSrc: "./tests/models/3dxml/widget.3dxml"
    },
    {
        modelId: "cityjson_csol",
        modelSrc: "./tests/models/cityjson/csol.json"
    },
    {
        modelId: "cityjson_msol",
        modelSrc: "./tests/models/cityjson/msol.json"
    },
    {
        modelId: "cityjson_msurface",
        modelSrc: "tests/models/cityjson/msurface.json"
    },
    {
        modelId: "cityjson_twocube",
        modelSrc: "tests/models/cityjson/twocube.json"
    },
    {
        modelId: "cityjson_cube",
        modelSrc: "tests/models/cityjson/cube.json"
    },
    {
        modelId: "cityjson_tetra",
        modelSrc: "tests/models/cityjson/tetra.json"
    },
    {
        modelId: "cityjson_torus",
        modelSrc: "tests/models/cityjson/torus.json"
    },
    {
        modelId: "cityjson_denhaag",
        modelSrc: "tests/models/cityjson/DenHaag_01.json"
    },
    {
        modelId: "cityjson_railway",
        modelSrc: "tests/models/cityjson/LoD3_Railway.json"
    },
    {
        modelId: "ifc_conferencecenter",
        modelSrc: "tests/models/ifc/OTCConferenceCenter.ifc"
    },
    {
        modelId: "ifc_duplex",
        modelSrc: "tests/models/ifc/Duplex.ifc"
    },
    {
        modelId: "ifc_openhouse2x3",
        modelSrc: "tests/models/ifc/IfcOpenHouse2x3.ifc"
    },
    {
        modelId: "ifc_openhouse4",
        modelSrc: "tests/models/ifc/IfcOpenHouse4.ifc"
    },
    {
        modelId: "ifc_map",
        modelSrc: "tests/models/ifc/MAP.ifc"
    },
    {
        modelId: "ifc_rac_advanced_sample_project",
        modelSrc: "tests/models/ifc/rac_advanced_sample_project.ifc"
    },
    {
        modelId: "ifc_rme_advanced_sample_project",
        modelSrc: "tests/models/ifc/rme_advanced_sample_project.ifc"
    },
    {
        modelId: "laz_autzen",
        modelSrc: "tests/models/laz/autzen.laz"
    },
    {
        modelId: "laz_indoor_scan",
        modelSrc: "tests/models/laz/indoor.0.1.laz"
    },
    // // // // // // // // "tests/models/stl/ascii/slotted_disk.stl"},
    // // // // // // // // "tests/models/stl/binary/spurGear.stl"},
    {
        modelSrc: "./tests/models/gltf/Schependomlaan.gltf",
        metaModelSrc: "./tests/metaModels/Schependomlaan.json"
    },
    {
        modelId: "gltf_duplex",
        modelSrc: "./tests/models/gltf/Duplex.gltf",
        metaModelSrc: "./tests/metaModels/Duplex.json"
    },
    {
        modelId: "gltf_map",
        modelSrc: "./tests/models/gltf/MAP.gltf",
        metaModelSrc: "./tests/metaModels/MAP.json"
    },
    // {
    //     modelId: "gltf_map_pointcloud",
    //     modelSrc: "./tests/models/gltf/MAP_from_e57_inf3cm.gltf"
    // }
];

let server = httpServer.createServer();
server.listen(SERVER_PORT);

const firefoxOptions = {
    product: 'firefox',
    extraPrefsFirefox: {
        // Enable additional Firefox logging from its protocol implementation
        // 'remote.log.level': 'Trace',
    },
    dumpio: true,
    headless: HEADLESS,
    args: [`--window-size=${SCREENSHOT_SIZE[0]},${SCREENSHOT_SIZE[1]}`, '--disable-infobars'],
    defaultViewport: {
        width: SCREENSHOT_SIZE[0],
        height: SCREENSHOT_SIZE[1]
    }
};

const chromeOptions = {
    product: 'chrome',
    headless: HEADLESS,
    args: [`--window-size=${SCREENSHOT_SIZE[0]},${SCREENSHOT_SIZE[1]}`],
    defaultViewport: {
        width: SCREENSHOT_SIZE[0],
        height: SCREENSHOT_SIZE[1]
    }
};

performanceTest().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

async function performanceTest() {

    console.log("Beginning performance test...\n");

    const testStats = {
        convert2xkt: package.version,
        xeokit: package.devDependencies["@xeokit/xeokit-sdk"],
        modelStats: {}
    };

    await convertModels(testStats);

    await testModels(testStats);

    const statsMarkdown = statsToMarkdown(testStats);

    await fs.promises.writeFile("performanceStats.json", JSON.stringify(testStats, null, "\t"));
    await fs.promises.writeFile("performanceStats.md", statsMarkdown);

    console.log("Done.");
}


async function convertModels(testStats) {

    console.log("Converting models XKT...\n");

    const modelStats = testStats.modelStats;

    rimraf.sync(OUTPUT_DIR);
    fs.mkdirSync(OUTPUT_DIR);

    for (let i = 0, len = SOURCE_FILES.length; i < len; i++) {

        const fileInfo = SOURCE_FILES[i];

        const modelId = fileInfo.modelId;
        const modelSrc = fileInfo.modelSrc;
        const metaModelSrc = fileInfo.metaModelSrc;

        const xktDest = `${OUTPUT_DIR}/${modelId}/model.xkt`;

        const objectPropsDest = "";

        fs.mkdirSync(`${OUTPUT_DIR}/${modelId}`);

        const stats = {
            modelSrc: modelSrc
        };

        if (metaModelSrc) {
            stats.metaModelSrc = metaModelSrc;
        }

        try {
            await convert(modelSrc, metaModelSrc, xktDest, objectPropsDest, stats);
        } catch (e) {
            console.log(`Error converting ${modelSrc}: ` + e);
            continue;
        }

        stats.xktDest = xktDest;

        modelStats[modelId] = stats;
    }

    console.log("All models converted to XKT.\n");
}


async function testModels(testStats) {

    console.log("Testing XKT models in xeokit...\n");

    const modelStats = testStats.modelStats;

    for (let i = 0, len = SOURCE_FILES.length; i < len; i++) {

        const fileInfo = SOURCE_FILES[i];
        const modelId = fileInfo.modelId;

        const stats = modelStats[modelId];

        if (!stats) {
            continue;
        }

        const xktDest = stats.xktDest;

        if (!xktDest) {
            continue;
        }

        const baseName = path.basename(xktDest, path.extname(xktDest));

        const dir = OUTPUT_DIR + "/" + baseName;

        const screenshotDir = `${OUTPUT_DIR}/${modelId}/screenshot`;
        const screenshotPath = `${screenshotDir}/screenshot.png`;

        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir);
        }

        const browser = await puppeteer.launch(chromeOptions);

        const page = await browser.newPage();

        if (!testStats.browserVersion) {
            testStats.browserVersion = await page.browser().version();
        }

        await page.setDefaultNavigationTimeout(3000000);

        await page.goto(`http://localhost:${SERVER_PORT}/tests/loadXKT.html??treeView=false&xktSrc=../${xktDest}`);
        await page.waitForSelector('#percyLoaded')
        const element = await page.$('#percyLoaded')
        const value = await page.evaluate(el => el.innerText, element)
        const pageStats = JSON.parse(value);
        await page.screenshot({path: screenshotPath});
        await page.close();
        await browser.close();

        stats.loadingTime = pageStats.loadingTime;
        stats.fps = pageStats.fps;
        stats.screenshot = "screenshot.png";

        console.log("All XKT models tested in xeokit.\n");
    }
}

async function convert(modelSrc, metaModelSrc, xktDest, objectPropsDest, stats) {

    const xktDestDir = path.dirname(xktDest);
    const objectPropsDir = `${xktDestDir}/props/`;

    if (!fs.existsSync(objectPropsDir)) {
        fs.mkdirSync(objectPropsDir);
    }

    await convert2xkt({
        source: modelSrc,
        metaModelSource: metaModelSrc,
        outputXKTModel: async function (xktModel) {
        },
        outputXKT: async function (xktData) {
            await fs.promises.writeFile(xktDest, xktData);
        },
        // outputObjectProperties: async function (id, props) {
        //     await fs.promises.writeFile(`${objectPropsDir}/${id}.json`, JSON.stringify(props, null, "\t"));
        // },
        stats,
        log: (msg) => {
            console.log(msg)
        }
    });
}

function statsToMarkdown(testStats) {
    const modelStats = testStats.modelStats;
    const rows = [];
    rows.push("## convert2xkt Performance Tests");
    rows.push("\n");
    const dateFormat = new Date();
    rows.push(dateFormat.getDate() + ' / ' + dateFormat.getMonth() + ' / ' + dateFormat.getFullYear());
    rows.push("---");
    rows.push("## Notes");
    rows.push("\n");
    rows.push(`* convert2xkt ${testStats.convert2xkt}`);
    rows.push(`* xeokit-sdk ${testStats.xeokit}`);
    rows.push(`* ${testStats.browserVersion}`);
    rows.push("* Click thumbnails to view models with xeokit.");
    rows.push("\n");
    rows.push("## Results");
    rows.push("\n");
    rows.push('| Screenshot | Source | Objects | Triangles | Vertices | Source kB | XKT kB | Compression | Convert Secs | Load Secs | FPS |');
    rows.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (let modelId in modelStats) {
        const stats = modelStats[modelId];
        rows.push(`| [![](https://xeokit.github.io/xeokit-xkt-utils/tests/models/xkt/${modelId}/screenshot/screenshot.png)](./tests/loadXKT.html?xktSrc=../${stats.xktDest}) | [${modelId}](./tests/loadXKT.html?xktSrc=../${stats.xktDest}) | ${stats.numObjects} | ${stats.numTriangles} | ${stats.numVertices} | ${stats.sourceSize} | ${stats.xktSize} | ${stats.compressionRatio} | ${stats.conversionTime} | ${stats.loadingTime} | ${stats.fps} |`);
    }
    const markdown = rows.join("\n");
    return markdown;
}