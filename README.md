# xeokit-xkt-utils
JavaScript tools to generate .XKT files

* [API documentation](https://xeokit.github.io/xeokit-xkt-utils/docs)
* [Live examples](https://xeokit.github.io/xeokit-xkt-utils/examples)

![Spatial partitioning](http://xeokit.io/img/kdtree.jpeg)


## Contents

## Features

#### Support for Large WGS84 Coordinates

Using graphics APIs such as WebGL, graphics processing units (GPUs) internally operate on single precision 
32-bit floating-point numbers. 

Single precision values are generally said to have seven accurate decimal digits; 
therefore as your numbers become larger, the numbers are less accurately represented.  

````xeokit-xkt-utils```` improves the accuracy of the math executed on the GPU beyond the GPU's single precision 
limitations by using relative-to-eye coordinates [TODO] 
 
#### Compressed Geometry


## Usage

#### Classes

````xeokit-xkt-utils```` provides five javaScript classes from which we can build an 
in-memory "document-object model" that represents the contents of an ````.xkt```` file. 

* [**````XKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) represents an ````.xkt```` model, providing methods through which we can create 3D objects within the model. 
* [**````XKTPrimitive````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTPrimitive.js~XKTPrimitive.html) represents an individual mesh, which has vertex positions, vertex normals, triangle indices, edge indices, an RGB color, and an opacity. 
* [**````XKTPrimitiveInstance````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTPrimitiveInstance.js~XKTPrimitiveInstance.html) is an association class that represents the use of an ````XKTPrimitive```` by an ````XKTEntity````. 
* [**````XKTEntity````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTEntity.js~XKTEntity.html) represents a 3D object, which has a unique ID, and one or more ````PrimitiveInstances````.
* [**````XKTTile````**](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTTile.js~XKTTile.html) represents a  box-shaped region within the ````XKTModel````. Each ````XKTTile```` has one or more ````XKTEntitys````, a World-space axis-aligned bounding 
box (AABB) that encloses the ````XKTEntitys````, and a decoding matrix to de-quantize the vertex positions belonging to the primitives instanced by the entities. 

<br><br>

![Class diagram](https://xeokit.github.io/xeokit-xkt-utils/images/classes.png)

#### Functions

````xeokit-xkt-utils```` also provides functions for loading, serializing and testing ````XKTModels````:

* [**````loadGLTFIntoXKTModel````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-loadGLTFIntoXKTModel) load glTF JSON into an ````XKTModel````.
* [**````writeXKTModelToArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-writeXKTModelToArrayBuffer) serializes an ````XKTModel```` to an ````ArrayBuffer````.
* [**````validateXKTArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-utils/docs/function/index.html#static-function-validateXKTArrayBuffer) verifies the correctness of an ````ArrayBuffer```` against the ````XKTModel```` it was serialized from. 

#### Building an XKTModel

In the example below, we'll programmatically build a simple [````XKTModel````](https://xeokit.github.io/xeokit-xkt-utils/docs/class/src/XKTModel/XKTModel.js~XKTModel.html).

````javascript
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

## Using in node.js

TODO: massage the snippet below into a comprehensive node.js example.

````javascript
const fs = require('fs');

const {XKTModel, loadGLTFIntoXKTModel, writeXKTModelToArrayBuffer} = require("./XKTModel/lib/xeokit-xkt-utils.cjs.js");

const gltfPath = "./myModel.gltf";
const xktPath = "./myModel.xkt";

const gltfText = await new Promise((resolve, reject) => {
    fs.readFile(gltfPath, (error, gltfText) => {
        if (error !== null) {
            reject(error);
            return;
        }
        resolve(gltfText);
    });
});

const gltf = JSON.parse(gltfText);

const xktModel = new XKTModel();

loadGLTFIntoXKTModel(gltf, xktModel, {basePath: "./"});

const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
    
await new Promise((resolve, reject) => {
    fs.writeFile(xktPath, Buffer.from(xktArrayBuffer), (error) => {
        if (error !== null) {
            console.error(`Unable to write to file at path: ${xktPath}`);
            reject(error);
            return;
        }
        resolve();
    });
});
````