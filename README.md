# xeokit-xkt-tools
JavaScript tools to generate .XKT files

## Usage

#### Procedurally Generating an XKTModel

Procedurally building a simple table model within an [````XKTModel````](../docs/class/src/XKTModel.js~XKTModel.html):

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

Use [````writeXKTModelToArrayBuffer````](../docs/function/index.html#static-function-writeXKTModelToArrayBuffer) to serialize the [````XKTModel````](../docs/class/src/XKTModel.js~XKTModel.html) to an ````ArrayBuffer````:

````javascript
const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);
````

#### Validating the ArrayBuffer

Use [````validateXKTArrayBuffer````](docs/function/index.html#static-function-validateXKTArrayBuffer) to validate the ````ArrayBuffer```` against the [````XKTModel````](../docs/class/src/XKTModel.js~XKTModel.html):

````javascript
const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);

if (!xktArrayValid) {
    console.error("XKT array buffer is invalid!");
}
````

#### Loading the ArrayBuffer into a xeokit Viewer

