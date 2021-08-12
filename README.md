# xeokit-xkt-utils

[![Twitter Follow](https://img.shields.io/twitter/follow/xeolabs?style=social)](https://twitter.com/xeolabs)
[![This project is using Percy.io for visual regression testing.](https://percy.io/static/images/percy-badge.svg)](https://percy.io/73524691/xeokit-xkt-utils)
[![npm version](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils.svg)](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils)

Use **xeokit-xkt-utils** to:

* Convert 3D BIM and AEC models into XKT files for super fast loading into [xeokit](https://xeokit.io)
* Generate XKT files with JavaScript
  <BR><BR>

[![Schependomlaan](https://xeokit.github.io/xeokit-ifc-to-xkt/assets/rac_advanced_sample_project.png)](https://xeokit.github.io/xeokit-ifc-to-xkt/tests/loadXKT.html?xkt_src=models/xkt/rac_advanced_sample_project.xkt)

* [[View this XKT model](https://xeokit.github.io/xeokit-ifc-to-xkt/tests/loadXKT.html?xkt_src=models/xkt/rac_advanced_sample_project.xkt)]

---

# Contents

- [Introduction](#introduction)
- [Acknowledgements](#acknowledgements)
- [Resources](#resources)
- [Features](#features)
- [Installing](#installing)
- [Components](#components)
- [Using ````convert2xkt````](#using-----convert2xkt----)
  + [Converting an IFC file into an XKT file on the command line](#converting-an-ifc-file-into-an-xkt-file-on-the-command-line)
  + [Converting an IFC file into an XKT file in Node.js](#converting-an-ifc-file-into-an-xkt-file-in-nodejs)
  + [Converting IFC file data into XKT data in Node.js](#converting-ifc-file-data-into-xkt-data-in-nodejs)
  + [Converting an IFC file into an XKT file, with all element properties](#converting-an-ifc-file-into-an-xkt-file--with-all-element-properties)
- [Using ````XKTModel````](#using-----xktmodel----)
  + [Programmatically Building an XKT File](#programmatically-building-an-xkt-file)
  + [Serializing the XKTModel to an ArrayBuffer](#serializing-the-xktmodel-to-an-arraybuffer)
  + [Loading the ArrayBuffer into a Viewer](#loading-the-arraybuffer-into-a-viewer)
  + [Loading IFC into an XKTModel](#loading-ifc-into-an-xktmodel)
  + [Loading glTF into an XKTModel](#loading-gltf-into-an-xktmodel)
  + [Loading STL into an XKTModel](#loading-stl-into-an-xktmodel)
- [Building](#building)
  + [Building Binaries](#building-binaries)
  + [Building Tests](#building-tests)

---

# Introduction

[````xeokit-xkt-utils````](https://github.com/xeokit/xeokit-xkt-utils) provides the means to convert 3D BIM and AEC models into
XKT files for super fast loading into [xeokit](https://xeokit.io), along with programming tools to generate XKT files
with JavaScript on Node.js.

The [XKT format](https://github.com/xeokit/xeokit-xkt-utils/tree/master/specs) compresses large double-precision models
to a compact payload that loads quickly over the Web into a xeokit viewer running in the browser. We can use 
xeokit-xkt-utils to convert several source formats into XKT, such as IFC, glTF, 3DXML and CityJSON. 

# Acknowledgements

Our thanks to the authors of these open source libraries, which we use internally within ````xeokit-xkt-utils````:  

* [loaders.gl](https://loaders.gl) - Copyright (C) 2015 Uber Technologies, Inc. ([MIT License](http://www.opensource.org/licenses/mit-license.php))
* [Pako](https://github.com/nodeca/pako) - Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn ([MIT License](http://www.opensource.org/licenses/mit-license.php))
* [zip.js](https://github.com/gildas-lormeau/zip.js) - Copyright (C) 2021 Gildas Lormeau ([BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause))
* [earcut](https://github.com/mapbox/earcut) - Copyright (C) 2016, Mapbox ([ISC License](https://opensource.org/licenses/ISC))
* [web-ifc](https://github.com/tomvandig/web-ifc) - Copyright (C) 2020-2021 web-ifc contributors (Mozilla Public License Version 2.0)

# Resources

* [npm](https://www.npmjs.com/package/@xeokit/xeokit-xkt-utils)
* [API Docs](https://xeokit.github.io/xeokit-xkt-utils/docs)
* [Source Code](https://github.com/xeokit/xeokit-xkt-utils)
* [Performance Benchmarks](https://xeokit.github.io/xeokit-xkt-utils/perfTests)
* [XKT Specifications](https://github.com/xeokit/xeokit-xkt-utils/tree/master/specs) 

# Features

* A Node-based CLI tool to convert various 3D model formats to XKT files.
* A JavaScript toolkit of components for loading, generating and saving XKT files.

# Installing

````bash
npm i @xeokit/xeokit-xkt-utils
````

# Components

The table below lists the components provided by ````xeokit-xkt-utils````.

At the center of the toolkit, we've got the converter tool, provided as both a Node.js function and CLI executable.

Bundled with the converter, we've got the XKT document model, a bunch of loaders for different formats, and a function
to serialize the document model to a BLOB. We use these components within the converter tool, and also provide them as
part of the public API for extensibility.

| Component | Description |
| --- | --- |
| [convert2xkt]() | A Node.js-based JavaScript function and CLI tool that converts various AEC model formats into xeokit's native, super-fast-loading XKT format. Supported formats include: IFC (2x3 and 4), CityJSON, glTF, 3DXML, LAZ, LAS, STL and PCL. |
| [XKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) | A JavaScript document model that represents the contents of an XKT file in memory. Using this, we can programmatically build a document model in JavaScript, adding geometries, materials, objects etc, then serialize it to an XKT file. |
| [parseIFCIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseIFCIntoXKTModel) | Parses IFC data into an ````XKTModel```` |
| [parseGLTFIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseGLTFIntoXKTModel) |  Parses glTF into an ````XKTModel```` |
| [parse3DXMLIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parse3DXMLIntoXKTModel) |  Parses 3DXML into an ````XKTModel```` |
| [parseCityJSONIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseJSONIntoXKTModel) |  Parses CityJSON into an ````XKTModel```` |
| [parseLASIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseLASIntoXKTModel) | Parses LAS and LAZ into an ````XKTModel```` |
| [parseSTLIntoXKTModel](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-parseSTLIntoXKTModel) | Parses STL into an ````XKTModel```` |
| [writeXKTModelToArrayBuffer](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer) | Serializes an ````XKTModel```` to an XKT file |

# Using ````convert2xkt````

The ````convert2xkt```` tool converts various model formats into xeokit's native XKT format, which is designed to load
super fast over the Web into a xeokit viewer. This tool can be used both as a CLI executable and as a function within
Node.js.

````bash
node convert2xkt.js -h

Usage: convert2xkt [options]

Options:

    -v, --version            output the version number
    -s, --source [file]      path to source file
    -f, --format [string]    source file format (optional); supported formats are gltf, ifc, laz, las, pcd, ply, stl and cityjson
    -m, --metamodel [file]   path to source metamodel JSON file (optional)
    -o, --output [file]      path to target .xkt file; creates directories on path automatically if not existing
    -p, --properties [file]  path to target directory for object property files; creates directories on path automatically if not existing
    -l, --log                enable logging
    -h, --help               output usage information
````

### Converting an IFC file into an XKT file on the command line

````bash
node convert2xkt.js -s rme_advanced_sample_project.ifc -o rme_advanced_sample_project.ifc.xkt -l

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

### Converting an IFC file into an XKT file in Node.js

````javascript
const convert2xkt = require("@xeokit/xeokit-xkt-utils/dist/convert2xkt.cjs.js");

convert2xkt({
    source: "rme_advanced_sample_project.ifc",
    output: "rme_advanced_sample_project.ifc.xkt",
    log: (msg) => {
        console.log(msg)
    }
}).then(() => {
    console.log("Converted.");
}, (errMsg) => {
    console.error("Conversion failed: " + errMsg)
});
````

### Converting IFC file data into XKT data in Node.js

````javascript
const convert2xkt = require("@xeokit/xeokit-xkt-utils/dist/convert2xkt.cjs.js");
const fs = require('fs');

convert2xkt({
    sourceData: fs.readFileSync("rme_advanced_sample_project.ifc"),
    outputXKT: (xktData) => {
        fs.writeFileSync("rme_advanced_sample_project.ifc.xkt")
    }
}).then(() => {
    console.log("Converted.");
}, (errMsg) => {
    console.error("Conversion failed: " + errMsg)
});
````

### Converting an IFC file into an XKT file, with all element properties

We'll convert our IFC file as before, but this time we'll supply a ````outputObjectProperties```` callback, which will
collect each IFC element's property set. Via that callback, we'll save each property set to a JSON file.

````javascript
const convert2xkt = require("@xeokit/xeokit-xkt-utils/dist/convert2xkt.cjs.js");
const fs = require('fs');

convert2xkt({
    source: "rme_advanced_sample_project.ifc",
    output: "rme_advanced_sample_project.ifc.xkt",
    outputObjectProperties: async function (objectId, props) {
        await fs.writeFileSync(`${objectId}.json`, JSON.stringify(props, null, "\t"));
    }
}).then(() => {
    console.log("Converted.");
}, (errMsg) => {
    console.error("Conversion failed: " + errMsg)
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

Each IFC element's property set file would look like:

````json
{
    "id": "0kF45Qs8L9PAM9kmb1lT2Z",
    "type": "IfcFooting",
    "name": "Wall Foundation:Bearing Footing - 900 x 300:186656",
    "parent": "1xS3BCk291UvhgP2dvNsgp"
}
````

Converting a glTF file and IFC JSON metadata file into an XKT file

````javascript
await convert2xkt({
    source: "duplex.gltf",
    metaModelSource: "metamodel.json",
    output: "duplex.xkt"
});
````

# Using ````XKTModel````

````XKTModel```` is a JavaScript class that represents the contents of an XKT file in memory.

It's a sort of *XKT document model*, with methods to build 3D objects within it, functions to import various model
formats, and a function to serialize it to an XKT file.

We can use these tools to:

* programmatically XKT files,
* combine multiple models into an XKT file, from different formats,
* develop custom XKT converters, and
* extend ````convert2xkt```` to support more formats.

### Programmatically Building an XKT File

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

![XKTModel Example](http://xeokit.io/img/docs/PerformanceModel/PerformanceModel.png)

````javascript
const {
    XKTModel,
    parseGLTFIntoXKTModel,
    writeXKTModelToArrayBuffer
} = require("@xeokit/xeokit-xkt-utils/dist/xeokit-xkt-utils.cjs.js");
const fs = require('fs');

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

fs.writeFileSync("./myModel.xkt", xktArrayBuffer);
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
    src: "./myModel.xkt"
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

# Building

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

Building the tests in TODO

````bash
npm build-tests
````

