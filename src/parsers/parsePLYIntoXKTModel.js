import {parse} from '@loaders.gl/core';
import {PLYLoader} from '@loaders.gl/ply';

/**
 * @desc Parses PLY file data into an {@link XKTModel}.
 *
 * ## Usage
 *
 * In the example below we'll create an {@link XKTModel}, then load a PLY model into it.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#parsers_PLY_Test)]
 *
 * ````javascript
 * utils.loadArraybuffer("./models/ply/test.ply", async (data) => {
 *
 *     const xktModel = new XKTModel();
 *
 *     parsePLYIntoXKTModel({data, xktModel});
 *
 *     xktModel.finalize();
 * });
 * ````
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer} params.data PLY file data.
 * @param {XKTModel} params.xktModel XKTModel to parse into.
 * @param {Object} [params.stats] Collects statistics.
 * @param {function} [params.log] Logging callback.
 */
async function parsePLYIntoXKTModel({data, xktModel, stats, log}) {

    if (!data) {
        throw "Argument expected: data";
    }

    if (!xktModel) {
        throw "Argument expected: xktModel";
    }

    let parsedData;
    try {
        parsedData = await parse(data, PLYLoader);
    } catch (e) {
        if (log) {
            log("[parsePLYIntoXKTModel] " + e);
        }
        return;
    }

    const attributes = parsedData.attributes;
    const colorsValue = attributes.COLOR_0.value;
    const colorsCompressed = [];

    for (let i = 0, len = colorsValue.length; i < len; i += 4) {
        colorsCompressed.push(colorsValue[i]);
        colorsCompressed.push(colorsValue[i + 1]);
        colorsCompressed.push(colorsValue[i + 2]);
    }

    xktModel.createGeometry({
        geometryId: "plyGeometry",
        primitiveType: "triangles",
        positions: attributes.POSITION.value,
        colorsCompressed: colorsCompressed
    });

    xktModel.createMesh({
        meshId: "plyMesh",
        geometryId: "plyGeometry"
    });

    xktModel.createEntity({
        entityId: "ply",
        meshIds: ["plyMesh"]
    });

    if (log) {
        log("Converted objects: 1");
        log("Converted geometries: 1");
        log("Converted vertices: " + positions.length / 3);
    }

    if (stats) {
        stats.numObjects = 1;
        stats.numGeometries = 1;
        stats.numVertices = attributes.POSITION.value.length / 3;
    }
}

export {parsePLYIntoXKTModel};
