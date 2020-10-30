
# xeokit-xkt-utils

[![npm version](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils.svg)](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils)

**````xeokit-xkt-utils````** is a library of JavaScript tools for creating ````XKT```` model geometry files, which we then can load 
into [xeokit](http://xeokit.io). Using this library in either browser or node, we can convert glTF into ````XKT````, and can even generate ````XKT```` files programmatically.

This library is currently used within the [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) tool to convert glTF to ````XKT````.    

![Spatial partitioning](http://xeokit.io/img/BimdataViewerCroppedNarrow.jpg)

## Contents
- [Links](#links)
- [Features](#features)
- [JavaScript API](#javascript-api)
    + [XKTModel](#xktmodel)
    + [Building an XKTModel](#building-an-xktmodel)
    + [Serializing the XKTModel to an ArrayBuffer](#serializing-the-xktmodel-to-an-arraybuffer)
    + [Validating the ArrayBuffer](#validating-the-arraybuffer)
    + [Loading the ArrayBuffer into a Viewer](#loading-the-arraybuffer-into-a-viewer)
    + [Loading glTF into an XKTModel](#loading-gltf-into-an-xktmodel)
- [Building](#building)
    

## Links

* [API Documentation](https://xeokit.github.io/xeokit-xkt-utils/docs)
* [Live Tests](https://xeokit.github.io/xeokit-xkt-utils/examples)
* [Source Code](https://github.com/xeokit/xeokit-xkt-utils)
* [npm](https://www.npmjs.com/package/@xeokit/xeokit-xkt-utils)

## Features

* Generate XKT files programmatically.  
* Convert glTF into XKT files.
* Full-precision geometry without the cost of storing double-precision values.
* Geometry compression using instancing, quantization, oct-encoding and gzip.
* Works in browser and node.   

## JavaScript API

#### XKTModel

At the center of ````xeokit-xkt-utils```` is the  [**````XKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) 
class, which represents an ````XKT```` model. 

````XKTModel```` provides builder methods, with which we can programmatically populate it with 3D objects.  

````xeokit-xkt-utils```` also provides these utility functions for loading, serializing and validating ````XKTModels````:

* [**````loadGLTFIntoXKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-loadGLTFIntoXKTModel) loads glTF JSON into an ````XKTModel````.
* [**````writeXKTModelToArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer) serializes an ````XKTModel```` to an ````ArrayBuffer````.
* [**````validateXKTArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-validateXKTArrayBuffer) validates an ````ArrayBuffer```` against the ````XKTModel```` it was serialized from. 

#### Building an XKTModel

To demonstrate the API, let's use [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html)'s builder
 methods to programmatically build a model that resembles the screenshot below. Then we'll serialize the ````XKTModel```` to an 
 ````ArrayBuffer````, which we'll finally load that into a xeokit [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html)
 using [````XKTLoaderPlugin````](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html). 

We'll code this example to run in the browser, using the ES module in [xeokit-xkt-utils.es.js](./dist/xeokit-xkt-utils.es.js). We could also code it 
to run on node, using the CommonJS module in [xeokit-xkt-utils.cjs.js](./dist/xeokit-xkt-utils.cjs.js). 

[![XKTModel Example](http://xeokit.io/img/docs/PerformanceModel/PerformanceModel.png)](https://xeokit.github.io/xeokit-xkt-utils/examples/#XKTModel_generate_instancing)
 
[[Run this example](https://xeokit.github.io/xeokit-xkt-utils/examples/#XKTModel_generate_instancing)]
 

````javascript

import {XKTModel, writeXKTModelToArrayBuffer, validateXKTArrayBuffer} from "./dist/xeokit-xkt-utils.es.js";

// Or in node:
// const {XKTModel, loadGLTFIntoXKTModel, writeXKTModelToArrayBuffer} = require("./xeokit-xkt-utils.cjs.js");

const xktModel = new XKTModel();

xktModel.createPrimitive({
     primitiveId: "legPrimitive",
     primitiveType: "triangles",
     positions: [
         1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1,
         -1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, -1,
         -1, -1, -1, -1, -1, 1, -1, 1, 1, -1
     ],
     normals: [
         0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
         -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0,
         -1, 0, 0, -1
     ],
     indices: [
         0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19,
         20, 21, 22, 20, 22, 23
     ],
     color: [255, 0, 0],
     opacity: 255
 });

xktModel.createEntity({
     entityId: "leg1",
     primitiveIds: ["legPrimitive"],
     position: [-4, -6, -4],
     scale: [1, 3, 1],
     rotation: [0, 0, 0]
 });

xktModel.createEntity({
     entityId: "leg2",
     primitiveIds: ["legPrimitive"],
     position: [4, -6, -4],
     scale: [1, 3, 1],
     rotation: [0, 0, 0]
 });

xktModel.createEntity({
     entityId: "leg3",
     primitiveIds: ["legPrimitive"],
     position: [4, -6, 4],
     scale: [1, 3, 1],
     rotation: [0, 0, 0]
 });

xktModel.createEntity({
     entityId: "leg4",
     primitiveIds: ["legPrimitive"],
     position: [-4, -6, 4],
     scale: [1, 3, 1],
     rotation: [0, 0, 0]
 });

xktModel.createEntity({
     entityId: "top",
     primitiveIds: ["legPrimitive"],
     position: [0, -3, 0],
     scale: [6, 0.5, 6],
     rotation: [0, 0, 0]
 });
````

Once we've built our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) we need to finalize it. Then it's ready to use.

````javascript
xktModel.finalize();
````

#### Serializing the XKTModel to an ArrayBuffer

Next, we'll use  [````writeXKTModelToArrayBuffer````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer)  to serialize our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to an ````ArrayBuffer````.

````javascript
const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
````

#### Validating the ArrayBuffer

Now we'll use [````validateXKTArrayBuffer````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-validateXKTArrayBuffer) to validate 
the ````ArrayBuffer```` against our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html). If this function 
finds any errors, it will log them to the console and return ````false````. Otherwise, it will return ````true```` to indicate that the ````ArrayBuffer```` is correct. 

````javascript
const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);

if (!xktArrayBufferValid) {
    console.error("XKT array buffer is invalid!");
}
````

#### Loading the ArrayBuffer into a Viewer

Let's now create a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html), then load the ````ArrayBuffer```` into it using an [````XKTLoaderPlugin````](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html).

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

#### Loading glTF into an XKTModel

Let's use [````loadGLTFIntoXKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-loadGLTFIntoXKTModel) to parse glTF into an [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html). 

We'll also use the classes and functions introduced in the previous examples to serialize the [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to an ````ArrayBuffer````, then validate the ````ArrayBuffer```` and load it into a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html).

````javascript
const viewer = new Viewer({
    canvasId: "myCanvas"
});

const xktLoader = new XKTLoaderPlugin(viewer);

utils.loadJSON("./models/gltf/MAP/MAP.gltf", (json) => {

        const xktModel = new XKTModel();

        loadGLTFIntoXKTModel(json, xktModel).then(() => {
      
            const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);

            const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);

            xktLoader.load({
                id: "myModel",
                xkt: xktArrayBuffer
            });

            viewer.cameraFlight.flyTo(viewer.scene);
        });
    },
    (errMsg) => {  });
````

## Building 

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

Building the live tests in [````./examples````](https://xeokit.github.io/xeokit-xkt-utils/examples):

````bash
cd examples
npm update
npm run build
````
