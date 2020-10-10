
# xeokit-xkt-utils

[![npm version](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils.svg)](https://badge.fury.io/js/%40xeokit%2Fxeokit-xkt-utils)

````xeokit-xkt-utils```` is a library of JavaScript tools for creating ````XKT```` model geometry files that we can load 
into [xeokit](http://xeokit.io).

Using this library, we can programmatically generate ````XKT```` files, or convert glTF into ````XKT````.

This library is used within [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) to convert glTF to ````XKT````.  

![Spatial partitioning](http://xeokit.io/img/kdtree.jpeg)

## Contents
- [Links](#links)
- [Features](#features)
- [JavaScript API](#javascript-api)
    + [XKTModel - The XKT Document Model](#xktmodel---the-xkt-document-model)
    + [Building an XKTModel](#building-an-xktmodel)
    + [Serializing the XKTModel to an ArrayBuffer](#serializing-the-xktmodel-to-an-arraybuffer)
    + [Validating the ArrayBuffer](#validating-the-arraybuffer)
    + [Loading the ArrayBuffer into a Viewer](#loading-the-arraybuffer-into-a-viewer)
    + [Loading glTF into an XKTModel](#loading-gltf-into-an-xktmodel)
- [Using in node.js](#using-in-nodejs)
- [Building](#building)
    

## Links

* [API Documentation](https://xeokit.github.io/xeokit-xkt-utils/docs)
* [Live Tests](https://xeokit.github.io/xeokit-xkt-utils/examples)
* [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt)

## Features

* **Generate XKT programmatically** 
* **Convert glTF into XKT**
* **Full-precision geometry** without the cost of storing double-precision values
* **Geometry compression** using instancing, quantization, oct-encoding and zipping   

## JavaScript API

#### XKTModel - The XKT Document Model

````xeokit-xkt-utils```` provides an  [**````XKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) 
class that represents an ````XKT```` model. As shown in the example below, ````XKTModel```` has builder methods that allow 
 us to populate it with 3D objects.  

````xeokit-xkt-utils```` also provides functions for loading, serializing and testing ````XKTModels````:

* [**````loadGLTFIntoXKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-loadGLTFIntoXKTModel) loads glTF JSON into an ````XKTModel````.
* [**````writeXKTModelToArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer) serializes an ````XKTModel```` to an ````ArrayBuffer````.
* [**````validateXKTArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-validateXKTArrayBuffer) validates an ````ArrayBuffer```` against the ````XKTModel```` it was serialized from. 

#### Building an XKTModel

In the example below, we'll programmatically build a simple [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) resembling this table:

![Spatial partitioning](http://xeokit.io/img/kdtree.jpeg)

````javascript
const {XKTModel, loadGLTFIntoXKTModel, writeXKTModelToArrayBuffer} = require("./xeokit-xkt-utils.cjs.js");

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

Once we've built our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) we need to finalize it:

````javascript
xktModel.finalize();
````

#### Serializing the XKTModel to an ArrayBuffer

Next, we'll use  [````writeXKTModelToArrayBuffer````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer)  to serialize our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to an ````ArrayBuffer````:

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

Let's now create a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html) and load the ````ArrayBuffer```` into it using an [````XKTLoaderPlugin````](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html):

````javascript
const viewer = new Viewer({
    canvasId: "myCanvas"
});

const xktLoader = new XKTLoaderPlugin(viewer);

xktLoader.load({
    id: "myModel",
    xkt: xktArrayBuffer
});
````

The ````XKTLoaderPlugin```` can also load our ````ArrayBuffer```` from a file.

Finally, we'll fit the model in view:

````javascript
viewer.cameraFlight.flyTo(viewer.scene);
````

#### Loading glTF into an XKTModel

Let's use [````loadGLTFIntoXKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-loadGLTFIntoXKTModel) to parse glTF into an [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html). 

We'll also use the classes and functions introduced in the previous examples to serialize the [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to an ````ArrayBuffer````, then validate the ````ArrayBuffer```` and load it into a [````Viewer````](https://xeokit.github.io/xeokit-sdk/docs/class/src/viewer/Viewer.js~Viewer.html).

````javascript
utils.loadJSON("./models/gltf/MAP/MAP.gltf", (json) => {

        const xktModel = new XKTModel();

        loadGLTFIntoXKTModel(json, xktModel, {basePath: ""}).then(() => {
      
            const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);

            const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);

            const viewer = new Viewer({
                canvasId: "myCanvas"
            });

            const xktLoader = new XKTLoaderPlugin(viewer);

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

To build the binaries in ````./dist````:

````npm run build````

To build the JavaScript API documentation in ````./docs````:

````npm run docs````

To build the live tests in ````./examples````:

````
cd examples
npm run build
````
