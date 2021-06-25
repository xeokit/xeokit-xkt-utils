# xeokit-xkt-utils

[![Twitter Follow](https://img.shields.io/twitter/follow/xeolabs?style=social)](https://twitter.com/xeolabs)
[![This project is using Percy.io for visual regression testing.](https://percy.io/static/images/percy-badge.svg)](https://percy.io/73524691/xeokit-xkt-utils)
[![npm version](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils.svg)](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils)

**xeokit-xkt-utils** provides tools for creating XKT model files, which can be loaded into xeokit.

![Spatial partitioning](https://xeokit.github.io/xeokit-xkt-utils/images/geometryGeneration.png)

# Contents

- [Links](#links)
- [Features](#features)
- [Overview](#overview)
- [Supported Formats](#supported-formats)
- [Performance Tests](#performance-tests)
- [Usage](#usage)
  * [Converting Files into XKT](#converting-files-into-xkt)
  * [JavaScript API](#javascript-api)
    + [Features](#features-1)
    + [XKTModel](#xktmodel)
    + [Building an XKTModel](#building-an-xktmodel)
    + [Serializing the XKTModel to an ArrayBuffer](#serializing-the-xktmodel-to-an-arraybuffer)
    + [Loading the ArrayBuffer into a Viewer](#loading-the-arraybuffer-into-a-viewer)
    + [Loading IFC into an XKTModel](#loading-ifc-into-an-xktmodel)
    + [Loading glTF into an XKTModel](#loading-gltf-into-an-xktmodel)
    + [Loading STL into an XKTModel](#loading-stl-into-an-xktmodel)
  * [Building](#building)
    + [Building Binaries](#building-binaries)
    + [Building Tests](#building-tests)

# Links

* [npm](https://www.npmjs.com/package/@xeokit/xeokit-xkt-utils)
* [API Docs](https://xeokit.github.io/xeokit-xkt-utils/docs)
* [Source Code](https://github.com/xeokit/xeokit-xkt-utils)

# Features

* A Node-based CLI tool for converting files to XKT.
* A toolkit of JavaScript components for loading, generating and saving XKT files.

# Overview

At the center of ````xeokit-xkt-utils````, we have a CLI tool for converting files into XKT. Underneath the converter tool we've got an extensible library of components for loading, generating and saving XKT
document models. These are used by the converter, but we can also use them for building our own custom XKT tools.

| Component | Description |
| --- | --- |
| [convert2xkt]() | A Node.js-based JavaScript function and CLI tool that converts various AEC model formats into xeokit's native, super-fast-loading XKT format. Supported formats include: IFC (2x3 and 4), CityJSON, glTF, 3DXML, LAZ, LAS, STL and PCL. |
| [XKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) | A JavaScript document model that represents the contents of an XKT file in memory. We can programmatically build a document model in JavaScript, adding geometries, materials, objects etc, then serialize it to an XKT file. |
| [parseIFCIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseIFCIntoXKTModel) | Parses IFC data into an ````XKTModel```` |
| [parseGLTFIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseGLTFIntoXKTModel) |  Parses glTF into an ````XKTModel```` |
| [parse3DXMLIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parse3DXMLIntoXKTModel) |  Parses 3DXML into an ````XKTModel```` |
| [parseCityJSONIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseJSONIntoXKTModel) |  Parses CityJSON into an ````XKTModel```` |
| [parseLASIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseLASIntoXKTModel) | Parses LAS and LAZ into an ````XKTModel```` |
| [parseSTLIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseSTLIntoXKTModel) | Parses STL into an ````XKTModel```` |
| [writeXKTModelToArrayBuffer**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer) | Serializes an ````XKTModel```` to an XKT file | 


# Supported Formats

* IFC (2x3 and 4)
* CityJSON
* glTF
* 3DXML
* LAZ/LAS
* PCL

# Performance Tests

Shown below are results from our automated performance tests for ````convert2xkt````, showing conversion times, file
sizes, loading times and rendering performance for XKT files converted from various BIM and GIS model formats. 

Click the thumbnails to view the models in the browser with xeokit.

* convert2xkt 1.3.0
* xeokit-sdk 1.9.0
* Chrome/92.0.4512.0
  
* Click thumbnails to view models with xeokit.

| Screenshot | Source | Convert Secs | Load Secs | FPS | Objects | Triangles | Vertices | Source kB | XKT kB | Compression |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/3dxml_widget/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/3dxml_widget/model.xkt) | [3dxml_widget](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/3dxml_widget/model.xkt) | 0.34 | 0.13 | 60 | 306 | 10464 | 13686 | 123.78 | 61.65 | 2.01 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_csol/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_csol/model.xkt) | [cityjson_csol](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_csol/model.xkt) | 0.01 | 0.08 | 60 | 1 | 24 | 12 | 5.26 | 0.66 | 8.00 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_msol/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_msol/model.xkt) | [cityjson_msol](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_msol/model.xkt) | 0.01 | 0.04 | 60 | 1 | 24 | 16 | 5.54 | 0.66 | 8.43 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_msurface/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_msurface/model.xkt) | [cityjson_msurface](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_msurface/model.xkt) | 0.01 | 0.04 | 60 | 1 | 10 | 8 | 2.46 | 0.59 | 4.14 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_twocube/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_twocube/model.xkt) | [cityjson_twocube](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_twocube/model.xkt) | 0.01 | 0.03 | 60 | 1 | 24 | 16 | 4.90 | 0.63 | 7.81 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_cube/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_cube/model.xkt) | [cityjson_cube](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_cube/model.xkt) | 0.00 | 0.03 | 60 | 1 | 12 | 8 | 1.76 | 0.60 | 2.94 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_tetra/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_tetra/model.xkt) | [cityjson_tetra](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_tetra/model.xkt) | 0.00 | 0.04 | 60 | 1 | 4 | 4 | 1.69 | 0.54 | 3.13 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_torus/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_torus/model.xkt) | [cityjson_torus](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_torus/model.xkt) | 0.01 | 0.04 | 60 | 1 | 18 | 14 | 4.35 | 0.65 | 6.75 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_denhaag/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_denhaag/model.xkt) | [cityjson_denhaag](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_denhaag/model.xkt) | 1.08 | 0.48 | 60 | 1991 | 41197 | 71069 | 3153.55 | 399.34 | 7.90 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/cityjson_railway/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_railway/model.xkt) | [cityjson_railway](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/cityjson_railway/model.xkt) | 3.14 | 0.54 | 60 | 120 | 113537 | 170281 | 4521.41 | 878.91 | 5.14 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/ifc_conferencecenter/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_conferencecenter/model.xkt) | [ifc_conferencecenter](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_conferencecenter/model.xkt) | 49.74 | 1.13 | 26 | 6087 | 511459 | 1268451 | 71700.42 | 2698.16 | 26.57 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/ifc_duplex/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_duplex/model.xkt) | [ifc_duplex](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_duplex/model.xkt) | 0.85 | 0.17 | 60 | 208 | 20194 | 49504 | 2366.05 | 88.94 | 26.60 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/ifc_openhouse2x3/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_openhouse2x3/model.xkt) | [ifc_openhouse2x3](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_openhouse2x3/model.xkt) | 0.32 | 0.09 | 60 | 40 | 613 | 1801 | 112.76 | 6.43 | 17.54 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/ifc_openhouse4/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_openhouse4/model.xkt) | [ifc_openhouse4](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_openhouse4/model.xkt) | 0.24 | 0.06 | 60 | 40 | 613 | 1801 | 113.26 | 6.43 | 17.63 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/ifc_map/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_map/model.xkt) | [ifc_map](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_map/model.xkt) | 9.62 | 0.47 | 60 | 1774 | 172268 | 431922 | 28779.42 | 939.71 | 30.63 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/ifc_rac_advanced_sample_project/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_rac_advanced_sample_project/model.xkt) | [ifc_rac_advanced_sample_project](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_rac_advanced_sample_project/model.xkt) | 44.71 | 0.84 | 28 | 5561 | 283616 | 745100 | 45316.70 | 1776.91 | 25.50 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/ifc_rme_advanced_sample_project/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_rme_advanced_sample_project/model.xkt) | [ifc_rme_advanced_sample_project](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/ifc_rme_advanced_sample_project/model.xkt) | 80.10 | 0.92 | 34 | 6442 | 345539 | 823082 | 35309.94 | 1632.98 | 21.62 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/laz_autzen/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/laz_autzen/model.xkt) | [laz_autzen](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/laz_autzen/model.xkt) | 27.58 | 5.37 | 26 | 1 | undefined | 10653336 | 56350.99 | 71525.80 | 0.79 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/laz_indoor_scan/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/laz_indoor_scan/model.xkt) | [laz_indoor_scan](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/laz_indoor_scan/model.xkt) | 1.27 | 0.53 | 60 | 1 | undefined | 808042 | 1644.72 | 3402.97 | 0.48 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/undefined/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/undefined/model.xkt) | [undefined](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/undefined/model.xkt) | 2.69 | 0.56 | 60 | 3504 | 230246 | 367934 | 23075.65 | 1662.27 | 13.88 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/gltf_duplex/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/gltf_duplex/model.xkt) | [gltf_duplex](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/gltf_duplex/model.xkt) | 0.26 | 0.30 | 60 | 291 | 15874 | 25262 | 1433.53 | 126.22 | 11.36 |
| [![](https://xeokit.github.io/xeokit-xkt-utils/assets/models/xkt/gltf_map/screenshot/screenshot.png)](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/gltf_map/model.xkt) | [gltf_map](https://xeokit.github.io/xeokit-xkt-utils/demos/demoXKT.html?xktSrc=.././assets/models/xkt/gltf_map/model.xkt) | 2.81 | 0.52 | 60 | 1986 | 181108 | 354632 | 15785.04 | 1605.40 | 9.83 |

# Usage 

## Converting Files into XKT 

**Example:** Using the CLI tool to convert an IFC file into an XKT file, with logging enabled:

````bash
convert2xkt.js -s rme_advanced_sample_project.ifc -o rme_advanced_sample_project.ifc.xkt -l

Reading input file: rme_advanced_sample_project.ifc
Input file size: 35309.94 kB
Converting...
Converted objects: 6442
Converted geometries: 3897
Writing XKT file: rme_advanced_sample_project.ifc.xkt
XKT version: 9
XKT size: 1632.98 kB
Compression ratio: 21.62
Conversion time: 74.31 s
````

**Example:** Converting an IFC file into an XKT file in Node.js:

````javascript
const convert2xkt = require('./dist/convert2xkt.cjs.js');

const result = await convert2xkt({
    source: "rme_advanced_sample_project.ifc",
    output: "rme_advanced_sample_project.ifc.xkt",
    log: (msg) => {
        console.log(msg)
    }
});

if (result < 0) {
    console.error("Conversion failed - see log for details")
}
````

**Example:** Converting IFC file data into XKT data in Node.js:

````javascript
await convert2xkt({
    sourceData: ifcData, // ArrayBuffer
    outputXKT: (xktData) => { // ArrayBuffer
        //..
    }
});
````

**Example:** Converting an IFC file into an XKT file, while extracting per-element IFC property sets into a set of JSON
files:

````javascript
const fs = require('fs');

await convert2xkt({
    source: "rme_advanced_sample_project.ifc",
    output: "rme_advanced_sample_project.ifc.xkt",
    outputObjectProperties: async function (objectId, props) {
        await fs.promises.writeFile(`${objectId}.json`, JSON.stringify(props, null, "\t"));
    }
});
````

The output files would be something like:

````bash
rme_advanced_sample_project.ifc.xkt
06uoIsbYr35x9JXU7VZ77u.json
09g7Eo3WDEihdnsYS1YDoI.json
0BTBFw6f90Nfh9rP1dl_39.json
0BTBFw6f90Nfh9rP1dl_3A.json
...
````

Each object property set file would look like:

````json
{
    "id": "0kF45Qs8L9PAM9kmb1lT2Z",
    "type": "IfcFooting",
    "name": "Wall Foundation:Bearing Footing - 900 x 300:186656",
    "parent": "1xS3BCk291UvhgP2dvNsgp"
}
````

**Example:** Converting a glTF file and IFC JSON metadata file into an XKT file:

````javascript
await convert2xkt({
    source: "duplex.gltf",
    metaModelSource: "metamodel.json",
    output: "duplex.xkt"
});
````


## JavaScript API

### Features

* A JavaScript document model that represents an XKT file
* Parse various source model file formats into the document model
* Programmatically generate geometry within the document model
* Define optional metadata within the document model
* Serialize the document model to an array buffer
* Save the array buffer as an XKT file

Then:

* Load the XKT into a xeokit viewer, to view the model in the browser.

### XKTModel

At the center of ````xeokit-xkt-utils```` is
the  [**````XKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html)
class, which represents an ````XKT```` model.

````XKTModel```` provides builder methods, with which we can programmatically populate it with 3D objects.

````xeokit-xkt-utils```` also provides these utility functions for loading, serializing and
validating ````XKTModels````:

* [**````parseGLTFIntoXKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseGLTFIntoXKTModel)
  loads glTF JSON into an ````XKTModel````.
    * [**````parseMetaModelIntoXKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseMetaModelIntoXKTModel)
      loads metamodel JSON into an ````XKTModel````.
* [**````writeXKTModelToArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer)
  serializes an ````XKTModel```` to an ````ArrayBuffer````.

### Building an XKTModel

To demonstrate the API, let's
use [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) 's
builder methods to programmatically build a model that resembles the screenshot below. Then we'll serialize
the ````XKTModel```` to an
````ArrayBuffer````, which we'll finally load that into a
xeokit [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html)
using [````XKTLoaderPlugin````](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html)
.

We'll code this example to run in the browser, using the ES module
in [xeokit-xkt-utils.es.js](./dist/xeokit-xkt-utils.es.js). We could also code it to run on node, using the CommonJS
module in [xeokit-xkt-utils.cjs.js](./dist/xeokit-xkt-utils.cjs.js).

[![XKTModel Example](http://xeokit.io/img/docs/PerformanceModel/PerformanceModel.png)](https://xeokit.github.io/xeokit-xkt-utils/tests/#generate_instancing_triangles)

[[Run this example](https://xeokit.github.io/xeokit-xkt-utils/tests/#generate_instancing_triangles)]

````javascript

import {XKTModel, writeXKTModelToArrayBuffer, validateXKTArrayBuffer} from "./dist/xeokit-xkt-utils.es.js";

// Or in node:
// const {XKTModel, parseGLTFIntoXKTModel, writeXKTModelToArrayBuffer} = require("./xeokit-xkt-utils.cjs.js");

const xktModel = new XKTModel();

// Create metamodel - this part is optional

xktModel.createMetaObject({ // Root XKTMetaObject, has no XKTEntity
    metaObjectId: "table",
    metaObjectName: "The Table",
    metaObjectType: "furniture"
});

xktModel.createMetaObject({
    metaObjectId: "redLeg",
    metaObjectName: "Red Table Leg",
    metaObjectType: "furniturePart",
    parentMetaObjectId: "table"
});

xktModel.createMetaObject({
    metaObjectId: "greenLeg",
    metaObjectName: "Green Table Leg",
    metaObjectType: "furniturePart",
    parentMetaObjectId: "table"
});

xktModel.createMetaObject({
    metaObjectId: "blueLeg",
    metaObjectName: "Blue Table Leg",
    metaObjectType: "furniturePart",
    parentMetaObjectId: "table"
});

xktModel.createMetaObject({
    metaObjectId: "yellowLeg",
    metaObjectName: "Yellow Table Leg",
    metaObjectType: "furniturePart",
    parentMetaObjectId: "table"
});

xktModel.createMetaObject({
    metaObjectId: "pinkTop",
    metaObjectName: "The Pink Table Top",
    metaObjectType: "furniturePart",
    parentMetaObjectId: "table"
});

// Create an XKTGeometry that defines a box shape, as a triangle mesh 

xktModel.createGeometry({
    geometryId: "boxGeometry",
    primitiveType: "triangles", // Also "lines" and "points"
    positions: [
        1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1,
        -1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, -1,
        -1, -1, -1, -1, -1, 1, -1, 1, 1, -1
    ],
    normals: [ // Only for "triangles"
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0,
        -1, 0, 0, -1
    ],
    indices: [
        0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23
    ]
});

// Create five XKTMeshes, which represent the table top and legs.
// Each XKTMesh has its own color, position, orientation and size, 
// and uses the XKTGeometry to define its shape.  
// An XKTGeometry can be used by multiple XKTMeshes.

xktModel.createMesh({
    meshId: "redLegMesh",
    geometryId: "boxGeometry",
    position: [-4, -6, -4],
    scale: [1, 3, 1],
    rotation: [0, 0, 0],
    color: [1, 0, 0],
    opacity: 1
});

xktModel.createMesh({
    meshId: "greenLegMesh",
    geometryId: "boxGeometry",
    position: [4, -6, -4],
    scale: [1, 3, 1],
    rotation: [0, 0, 0],
    color: [0, 1, 0],
    opacity: 1
});

xktModel.createMesh({
    meshId: "blueLegMesh",
    geometryId: "boxGeometry",
    position: [4, -6, 4],
    scale: [1, 3, 1],
    rotation: [0, 0, 0],
    color: [0, 0, 1],
    opacity: 1
});

xktModel.createMesh({
    meshId: "yellowLegMesh",
    geometryId: "boxGeometry",
    position: [-4, -6, 4],
    scale: [1, 3, 1],
    rotation: [0, 0, 0],
    color: [1, 1, 0],
    opacity: 1
});

xktModel.createMesh({
    meshId: "pinkTopMesh",
    geometryId: "boxGeometry",
    position: [0, -3, 0],
    scale: [6, 0.5, 6],
    rotation: [0, 0, 0],
    color: [1, 0, 1],
    opacity: 1
});

// Create five XKTEntities, which represent abstract, named objects in the model. 
// Each XKTEntity has an XKTMesh.
// An XKTEntity can have multiple XKTMeshes. 
// An XKTMesh can only belong to one XKTEntity.

xktModel.createEntity({
    entityId: "redLeg",
    meshIds: ["redLegMesh"]
});

xktModel.createEntity({
    entityId: "greenLeg",
    meshIds: ["greenLegMesh"]
});

xktModel.createEntity({
    entityId: "blueLeg",
    meshIds: ["blueLegMesh"]
});

xktModel.createEntity({
    entityId: "yellowLeg",
    meshIds: ["yellowLegMesh"]
});

xktModel.createEntity({
    entityId: "pinkTop",
    meshIds: ["pinkTopMesh"]
});
````

Once we've built
our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) we
need to finalize it. Then it's ready to use.

````javascript
xktModel.finalize();
````

### Serializing the XKTModel to an ArrayBuffer

Next, we'll
use  [````writeXKTModelToArrayBuffer````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer)
to serialize
our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to
an ````ArrayBuffer````.

````javascript
const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
````

### Loading the ArrayBuffer into a Viewer

Let's now create a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html),
then load the ````ArrayBuffer```` into it using
an [````XKTLoaderPlugin````](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html)
.

````javascript
const viewer = new Viewer({
    canvasId: "myCanvas"
});

const xktLoader = new XKTLoaderPlugin(viewer);

const model = xktLoader.load({
    id: "myModel",
    xkt: xktArrayBuffer
});
````

Note that the ````XKTLoaderPlugin```` could also load our ````ArrayBuffer```` from a URL.

Finally, let's fit the whole model in view.

````javascript
viewer.cameraFlight.flyTo(model);
````

### Loading IFC into an XKTModel

Let's
use [````parseIFCIntoXKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseIFCIntoXKTModel)
to import IFC into
an [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html).

As before, we'll also use the classes and functions introduced in the previous examples to serialize
the [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to
an ````ArrayBuffer````, then load it into
a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html).

````javascript
const viewer = new Viewer({
    canvasId: "myCanvas"
});

const xktLoader = new XKTLoaderPlugin(viewer);

utils.loadArraybuffer("./models/ifc/rac_advanced_sample_project.ifc", async (data) => {

        const xktModel = new XKTModel();

        parseIFCIntoXKTModel({data, xktModel, wasmPath: "../dist/"}).then(() => {

            xktModel.finalize();

            const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);

            xktLoader.load({
                id: "myModel",
                xkt: xktArrayBuffer,
                edges: true
            });

            viewer.cameraFlight.flyTo(viewer.scene);
        });
    },
    (errMsg) => {
    });
````

### Loading glTF into an XKTModel

Let's
use [````parseGLTFIntoXKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseGLTFIntoXKTModel)
to import glTF into
an [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html).

We'll also use the classes and functions introduced in the previous examples to serialize
the [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to
an ````ArrayBuffer````, then validate the ````ArrayBuffer```` and load it into
a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html).

````javascript
const viewer = new Viewer({
    canvasId: "myCanvas"
});

const xktLoader = new XKTLoaderPlugin(viewer);

utils.loadJSON("./models/gltf/MAP/MAP.gltf", (json) => {

        const xktModel = new XKTModel();

        parseGLTFIntoXKTModel({gltfData: json, xktModel: xktModel}).then(() => {

            xktModel.finalize();

            const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);

            const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);

            xktLoader.load({
                id: "myModel",
                xkt: xktArrayBuffer
            });

            viewer.cameraFlight.flyTo(viewer.scene);
        });
    },
    (errMsg) => {
    });
````

### Loading STL into an XKTModel

Let's
use [````parseSTLIntoXKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseSTLIntoXKTModel)
to import STL into
an [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html).

As before, we'll also use the classes and functions introduced in the previous examples to serialize
the [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to
an ````ArrayBuffer````, then load it into
a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html).

````javascript
const viewer = new Viewer({
    canvasId: "myCanvas"
});

const xktLoader = new XKTLoaderPlugin(viewer);

utils.loadJSON("./models/stl/binary/spurGear.stl", (json) => {

        const xktModel = new XKTModel();

        parseSTLIntoXKTModel({stlData: json, xktModel: xktModel}).then(() => {

            xktModel.finalize();

            const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);

            xktLoader.load({
                id: "myModel",
                xkt: xktArrayBuffer
            });

            viewer.cameraFlight.flyTo(viewer.scene);
        });
    },
    (errMsg) => {
    });
````

## Building

### Building Binaries

Building the binaries in [````./dist````](https://xeokit.github.io/xeokit-xkt-utils/dist):

````bash
npm update
npm run build
````

This will build:

* [./dist/xeokit-xkt-utils.cjs.js](./dist/xeokit-xkt-utils.cjs.js) - CommonJS module
* [./dist/xeokit-xkt-utils.es.js](./dist/xeokit-xkt-utils.es.js) - ES module

Building the JavaScript API documentation in [````./docs````](https://xeokit.github.io/xeokit-xkt-utils/docs):

````bash
npm run docs
````

### Building Tests

TODO