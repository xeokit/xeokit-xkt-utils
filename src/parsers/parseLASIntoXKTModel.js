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
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#parsers_LAZ_IndoorScan)]
 *
 * ````javascript
 * utils.loadArraybuffer("./models/laz/indoor.0.1.laz", async (lazData) => {
 *
 *     const xktModel = new XKTModel();
 *
 *     parseLASIntoXKTModel({lazData, xktModel});
 *
 *     xktModel.finalize();
 * });
 * ````
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer} params.lazData LAS/LAZ file data.
 * @param {XKTModel} params.xktModel XKTModel to parse into.
 */
async function parseLASIntoXKTModel({lazData, xktModel}) {

    if (!lazData) {
        throw "Argument expected: lazData";
    }

    if (!xktModel) {
        throw "Argument expected: xktModel";
    }

    let parsedData;
    try {
        parsedData = await parse(lazData, LASLoader);
    } catch (e) {
        console.log("[parseLASIntoXKTModel] " + e);
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
        geometryId: "pointsGeometry",
        primitiveType: "points",
        positions: attributes.POSITION.value,
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
}

export {parseLASIntoXKTModel};