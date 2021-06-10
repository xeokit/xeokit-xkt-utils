import {parse} from '@loaders.gl/core';
import {LASLoader} from '@loaders.gl/las';

/**
 * @desc Parses LAS and LAZ point cloud data into an {@link XKTModel}.
 *
 * This parser handles both the LASER file format (LAS) and its compressed version (LAZ),
 * a public format for the interchange of 3-dimensional point cloud data data, developed
 * for LIDAR mapping purposes.
 *
 * ## Usage
 *
 * In the example below we'll create an {@link XKTModel}, then load an LAZ point cloud model into it.
 *
 * ````javascript
 * utils.loadArraybuffer("./models/laz/autzen.laz", async (lazData) => {
 *
 *     const xktModel = new XKTModel();
 *
 *     await parseLASIntoXKTModel({
 *          lazData,
 *          xktModel,
 *          log: (msg) => { console.log(msg); }
 *     });
 *
 *     xktModel.finalize();
 * });
 * ````
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer} params.lazData LAS/LAZ file data.
 * @param {XKTModel} params.xktModel XKTModel to parse into.
 * @param {function} [params.log] Logging callback.
 */
async function parseLASIntoXKTModel({lazData, xktModel, log}) {

    if (!lazData) {
        throw "Argument expected: lazData";
    }

    if (!xktModel) {
        throw "Argument expected: xktModel";
    }

    if (log) {
        log("Converting LAZ/LAS");
    }

    let parsedData;
    try {
        parsedData = await parse(lazData, LASLoader);
    } catch (e) {
        if (log) {
            log("[parseLASIntoXKTModel] " + e);
        }
        return;
    }

    const attributes = parsedData.attributes;
    const positionsValue = attributes.POSITION.value;
    const colorsValue = attributes.COLOR_0.value;
    const colorsCompressed = [];

    for (let i = 0, len = colorsValue.length; i < len; i += 4) {
        colorsCompressed.push(colorsValue[i]);
        colorsCompressed.push(colorsValue[i + 1]);
        colorsCompressed.push(colorsValue[i + 2]);
    }

    xktModel.createGeometry({
        geometryId: "pointsGeometry",
        primitiveType: "points",
        positions: positionsValue,
        colorsCompressed: colorsCompressed
    });

    xktModel.createMesh({
        meshId: "pointsMesh",
        geometryId: "pointsGeometry"
    });

    xktModel.createEntity({
        entityId: "geometries",
        meshIds: ["pointsMesh"]
    });

    if (log) {
        log("Converted points: " + (positionsValue.length / 3));
    }
}

export {parseLASIntoXKTModel};