# xeokit-xkt-tools
JavaScript tools to generate .XKT files

* [API documentation](https://xeokit.github.io/xeokit-xkt-tools/docs)
* [Live examples](https://xeokit.github.io/xeokit-xkt-tools/examples)

![Spatial partitioning](http://xeokit.io/img/kdtree.jpeg)


## Contents

## Usage

#### Classes

````xeokit-xkt-tools```` provides five javaScript classes that enable us to programmatically build an 
in-memory "document-object model" that represents the contents of an ````.xkt```` file:

* [**````XKTModel````**](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) represents a single model, and provides methods through which we can build the model. 
* [**````XKTPrimitive````**](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTPrimitive.js~XKTPrimitive.html) represents an individual mesh, which has vertex positions, vertex normals, triangle indices, edge indices, an RGB color, and an opacity. 
* [**````XKTPrimitiveInstance````**](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTPrimitiveInstance.js~XKTPrimitiveInstance.html) is an association class that represents the use of an ````XKTPrimitive```` by an ````XKTEntity````. 
* [**````XKTEntity````**](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTEntity.js~XKTEntity.html) represents a 3D object, which has a unique ID, and one or more ````PrimitiveInstances````.
* [**````XKTTile````**](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTTile.js~XKTTile.html) represents a spatial, box-shaped region within the ````XKTModel````. An ````XKTTile```` has one or more ````XKTEntitys````, a World-space axis-aligned bounding 
box (AABB) that encloses the ````XKTEntitys````, and a decoding matrix to de-quantize the vertex positions belonging to the primitives instanced by the entities. 

![Class diagram](https://xeokit.github.io/xeokit-xkt-tools/images/classes.png)

#### Functions

````xeokit-xkt-tools```` also provides three functions for loading, serializing and testing ````XKTModels````:

* [**````loadXKTModelFromGLTF````**](https://xeokit.github.io/xeokit-xkt-tools/docs/function/index.html#static-function-loadXKTModelFromGLTF) load glTF JSON into an ````XKTModel````.
* [**````writeXKTModelToArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-tools/docs/function/index.html#static-function-writeXKTModelToArrayBuffer) serializes an ````XKTModel```` to an ````ArrayBuffer````.
* [**````validateXKTArrayBuffer````**](https://xeokit.github.io/xeokit-xkt-tools/docs/function/index.html#static-function-validateXKTArrayBuffer) verifies the correctness of an ````ArrayBuffer```` against the ````XKTModel```` it was serialized from. 


#### Procedurally Generating an XKTModel

In the example below, we'll programmatically build a simple model within an [````XKTModel````](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTModel.js~XKTModel.html).


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

xktModel.finalize();
````

#### Serializing the XKTModel to an ArrayBuffer

Next, we'll use  [````writeXKTModelToArrayBuffer````](https://xeokit.github.io/xeokit-xkt-tools/docs/function/index.html#static-function-writeXKTModelToArrayBuffer)  to serialize our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTModel.js~XKTModel.html) to an ````ArrayBuffer````:

````javascript
const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
````

#### Validating the ArrayBuffer

Now we'll use [````validateXKTArrayBuffer````](https://xeokit.github.io/xeokit-xkt-tools/docs/function/index.html#static-function-validateXKTArrayBuffer) to validate 
the ````ArrayBuffer```` against our [````XKTModel````](https://xeokit.github.io/xeokit-xkt-tools/docs/class/src/XKTModel/XKTModel.js~XKTModel.html). If this function 
finds any errors, it will log them to the console and return ````false````. Otherwise, it will return ````true```` to indicate that the ````ArrayBuffer```` is correct. 

````javascript
const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);

if (!xktArrayValid) {
    console.error("XKT array buffer is invalid!");
}
````

#### Loading the ArrayBuffer into a xeokit Viewer

