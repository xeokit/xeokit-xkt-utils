## XKT Format Specification (V6)

The ````.xkt```` format is xeokit's native binary format, optimized to load large models quickly, while preserving double-precision accuracy for geographically-large models.
 
xeokit using the [XKTLoaderPlugin](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html). 

At present, the ````.xkt```` format only supports triangle meshes.

See the tutorial [Creating Files for Offline BIM](https://github.com/xeokit/xeokit-sdk/wiki/Creating-Files-for-Offline-BIM) for how to use existing tools to convert IFC, OBJ, and glTF files to ````.xkt```` format.

As described in that tutorial, we currently have [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt), a nodejs-based CLI tool that converts ````glTF```` files to *````.xkt````*. 

This specification page describes the ````.xkt```` V6.0 format, in case you need to develop own custom conversion tool, for example on [IFC Engine](http://rdf.bg/product-list/ifc-engine/). 
 
In that case, use the source code for [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) as a reference implementation to help you understand this specification.


## Contents

- [Objectives](#overview)
- [zlib Deflation](#zlib-deflation)
- [Geometry Arrays](#geometry-arrays)
- [Implicit Mesh Order](#implicit-mesh-order)
- [Indices](#indices)
- [Primitives](#primitives)
- [Entity IDs](#entity-ids)
- [Terminology](#terminology)
    + [Mesh](#mesh)
    + [Entity](#entity)
    + [World Space](#world-space)
    + [Model Space](#model-space)
    + [Decoding](#decoding)
    + [Quantization](#quantization)
    + [Oct-Encoding](#oct-encoding)

## Objectives

The ````.xkt```` V6 format organizes model geometry into a minimal payload that can be loaded efficiently over the Web. 

#### Minimal Data Size

The format minimizes the size of the model using the following techniques:

- [Quantize](#quantization) 32-bit geometry vertex positions to unsigned 16-bit integers,
- [oct-encode](#oct-encoding) 32-bit vertex normals to unsigned 8-bit integers, 
- deflate everything using [zlib](http://www.zlib.net/), and
- share geometric primitives among entities to reduce redundant data. 

To avoid loss of precision after quantization, the [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) tool uses a [k-d tree](https://en.wikipedia.org/wiki/K-d_tree) to partition the vertex positions into sub-regions, which are each quantized separately into the full 16-bit range. 

#### Double-Precision Accuracy  

While many IFC models rely on double-precision coordinates, WebGL can only support single-precision (accurate to ~7 digits). For 
a geographically large model with many details, this can result in "jittering", a problem described in xeokit SDK [Issue #401](https://github.com/xeokit/xeokit-sdk/issues/401).

The ````.xkt```` V6 format addresses this by partitioning the model's entities into *tiles*, where the vertex positions of 
the primitives used by tile's entities are relative to the center of their tile, a technique known as *Relative-to-Center* 
(RTC) coordinates. RTC coordinates are commonly used in flight simulators, and geo-spatial visualization libraries, such as [CesiumJS](https://cesium.com/cesiumjs/). 

## Concepts

* [**````XKTModel````**]() represents a single model.
* [**````XKTPrimitive````**]() represents an individual mesh, which has vertex positions, vertex normals, triangle indices, edge indices, an RGB color, and an opacity. 
* [**````XKTPrimitiveInstance````**]() is an association class that represents the use of an ````XKTPrimitive```` by an ````XKTEntity````. 
* [**````XKTEntity````**]() represents a 3D object, which has a unique ID, and one or more ````PrimitiveInstances````.
* [**````XKTTile````**]() represents a spatial, box-shaped region within the ````XKTModel````. An ````XKTTile```` has one or more ````XKTEntitys````, a World-space axis-aligned bounding 
box (AABB) that encloses the ````XKTEntitys````, and a decoding matrix to de-quantize the vertex positions belonging to the primitives instanced by the entities. 

When a primitive is used only once (ie. it is associated with exactly one primitive instance), then the primitive's positions are in World-space. Otherwise, the primitive's positions are in Local-space.

## JavaScript Utilities



 
## File Layout

The table below lists the elements within ````.xkt```` V6.0.  

Elements deflated with [zlib](http://www.zlib.net/) are flagged in the fourth column.

 Element | Type | Description | zlib Deflated? |
|---|---|---|---|
| ````version```` | Uint32 | The ````.xkt```` file format version. This is the first four bytes in the file, and will have the value ````6````.| | 
| ````size_index```` | Uint32 | Byte size of the index. The index is the following block of elements that are each prefixed with ````size_````. The index provides a table of the sizes of elements within the file. | | 
| ````size_positions```` | Uint32 | Byte size of deflated ````positions````. This is the start of the index. | |
| ````size_normals```` | Uint32 | Byte size of deflated ````normals````. | |
| ````size_indices```` | Uint32 | Byte size of deflated ````indices````. | |
| ````size_edge_indices```` | Uint32 | Byte size of deflated ````edge_indices````. | |
| ````size_matrices```` | Uint32 | Byte size of deflated ````matrices````. | |
| ````size_reused_primitives_decode_matrix```` | Uint32 | Byte size of deflated ````reused_primitives_decode_matrix````. | |
| ````size_each_primitive_positions_and_normals_portion```` | Uint32 | Byte size of deflated ````each_primitive_positions_and_normals_portion````. | |
| ````size_each_primitive_indices_portion```` | Uint32 | Byte size of deflated ````each_primitive_indices_portion````. | |
| ````size_each_primitive_edge_indices_portion```` | Uint32 | Byte size of deflated ````each_primitive_edge_indices_portion````. | |
| ````size_each_primitive_color_and_opacity```` | Uint32 | Byte size of deflated ````each_primitive_color_and_opacity````. | |
| ````size_primitive_indices```` | Uint32 | Byte size of deflated ````primitive_indices````. | |
| ````size_each_entity_id```` | Uint32 | Byte size of deflated ````each_entity_id````. | |
| ````size_each_entity_primitive_instances_portion```` | Uint32 | Byte size of deflated ````each_entity_primitive_instances_portion````. | |
| ````size_each_entity_matrices_portion```` | Uint32 | Byte size of deflated ````each_entity_matrices_portion````. | |
| ````size_each_tile_aabb```` | Uint32 | Byte size of deflated ````each_tile_aabb````. | |
| ````size_each_tile_decode_matrix```` | Uint32 | Byte size of deflated ````each_tile_decode_matrix````. | |
| ````size_each_tile_entities_portion```` | Uint32 | Byte size of deflated ````each_tile_entities_portion````. This is the end of the index. | |
| ````positions````  | Uint16[] | [Quantized](#quantization) vertex positions for all ````primitives````. Each primitive has a portion of this array. Portions for ````primitives```` that are only used by one entity are in [World Space](#world-space) coordinates. Portions for ````primitives```` that are used by multiple entities are in [Model Space](#Model-space). | Deflated |
| ````normals```` | Uint8[] | [Oct-encoded](#oct-encoding) vertex normals for all ````primitives````. Each primitive has a portion of this array. | Deflated |
| ````indices```` | Uint32[] | Geometry triangle indices for all ````primitives````. Has three elements per triangle. Each primitive has a portion of this array. | Deflated |
| ````edge_indices```` | Uint32[] | Geometry edge indices for all ````primitives````. Has two elements per edge. Each primitive has a portion of this array. | Deflated |
| ````matrices```` | Float32[] | Modeling matrices for reused ````primitives````. Has sixteen elements per matrix. Each multi-use primitive has a portion of this array. | Deflated |
| ````reused_primitives_decode_matrix```` | Float32[] | A singular dequantization matrix for ````positions```` belonging to ````primitives```` that are shared by multiple entities. Has sixteen elements. | Deflated |
| ````each_primitive_positions_and_normals_portion```` | Uint32[] | Index into ````positions```` and ````normals````. Each of these corresponds to a portion of ````positions```` and ````normals````. | Deflated |
| ````each_primitive_indices_portion```` | Uint32[] | For each primitive, base index of a portion in ````indices````.| Deflated |
| ````each_primitive_edge_indices_portion```` | Uint32[] | For each primitive, base index of a portion in ````edge_indices````.| Deflated |
| ````each_primitive_color_and_opacity```` | Uint32[] | For each mesh, base index of a portion in ````edge_indices````. | Deflated |
| ````primitive_instances```` | Uint32[] | For each mesh, base index of a portion in ````decode_matrices````. Primitives can share decode matrices. | Deflated |
| ````each_entity_id```` | String | String | An ID for each entity. This is a string-encoded JSON array of strings. | Deflated |
| ````each_entity_primitive_instances_portion```` | Uint32[] | For each mesh instance, the base index of the primitive's portion of the ````each_primitive_*```` arrays. | Deflated |
| ````each_entity_matrices_portion```` | String | ID for each entity. This is a string-encoded JSON array of strings. | Deflated |
| ````each_tile_aabb```` | Float32[] | A World-space, axis-aligned bounding box (AABB) for each tile. Each AABB has six 32-bit floating-point values that indicate the min and max extents of the box on each axis: *xmin*, *ymin*, *zmin*, *xmax", *ymax" and "zmax".| Deflated |
| ````each_tile_decode_matrix```` | Float32[] | For each tile, a dequantization matrix to decode the ````positions```` belonging to its entities' ````primitives````. | Deflated |
| ````each_tile_entities_portion```` | Uint32[] | For each tile, an index to the first element of tile's portion of ````each_entity_id````, ````each_entity_primitive_instances_portion````, ````each_tile_aabb```` and ````each_tile_decode_matrix````. | Deflated |

## zlib Deflation

Note the last column in the table above, which indicates that some of the elements are deflated 
using [zlib](http://www.zlib.net/). The [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) tool and the 
[XKTLoaderPlugin](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html) plugin both use 
[pako.js](https://github.com/nodeca/pako), which is a JavaScript port of zlib, to deflate and inflate. 

When loading ````.xkt````, ````XKTLoaderPlugin```` inflates those elements before parsing them.

## Geometry Arrays

The ````positions````, ````normals````, ````indices```` and ````edge_indices```` arrays are the concatenation of the geometries for all the *[primitives](#primitives)* in the model. 

Primitives can be shared by multiple *[entities](#entities)*. For a mesh that's used by only one entity, its ````positions```` portion will be in *[World Space](#world-space)*. For a mesh that's used by multiple entities, its ````positions```` portion will be in *[Model Space](#world-space)*.

The ````positions```` array is [quantized](#quantization) to 16-bit integers, and will be dequantized in xeokit's shaders using a corresponding decode matrix in ````decode_matrices````. 

The ````normals```` array is [oct-encoded](#oct-encoding) to 8-bit integers, and will be also decoded in xeokit's shaders (no matrix is used for oct-decoding). 

For an example of geometry quantization and oct-encoding using JavaScript and WebGL, see the [mesh-quantization-example](https://github.com/xeolabs/mesh-quantization-example) demo by [@tsherif](https://github.com/tsherif). You can also find an example within the source code of [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt).

The ````indices```` array defines triangles, with three elements per triangle.
 
The ````edge_indices```` array defines the edges that xeokit draws for wireframe views, with two elements per edge. An ````.xkt```` exporter needs to generate those edge indices from the geometries, using the algorithm demonstrated in [buildEdgesindices.js](https://github.com/xeokit/xeokit-gltf-to-xkt/blob/master/src/glTFToXKT/lib/buildEdgeIndices.js) (a file within the [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) converter tool). Edge generation is computationally expensive. It's cheaper to pre-generate them in the ````.xkt```` file, rather than have [XKTLoaderPlugin](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js~XKTLoaderPlugin.html) generate them on-the-fly while loading.  

## Mesh Arrays

The ````each_primitive_positions_and_normals_portion````, ````each_primitive_indices_portion```` and ````each_primitive_edge_indices_portion```` indicate which portion of the geometry arrays is 
used for each mesh. 

The first vertex position used by mesh *````meshIdx````* is: 

````javascript
let i = each_primitive_positions_and_normals_portion[ meshIdx ];
let x = positions[ i + 0 ];
let y = positions[ i + 1 ];
let z = positions[ i + 2 ];
```` 

The last vertex position used by mesh ````meshIdx```` is: 

````javascript
let i2 = each_primitive_positions_and_normals_portion[ meshIdx + 1 ] - 1;
let x2 = positions[ i2 + 0 ];
let y2 = positions[ i2 + 1 ];
let z2 = positions[ i2 + 2 ];
```` 

The first vertex normal used by mesh ````meshIdx```` is: 

````javascript
let i = each_primitive_positions_and_normals_portion[ meshIdx ];
let x = normals[ i + 0 ];
let y = normals[ i + 1 ];
let z = normals[ i + 2 ];
```` 

The last vertex normal used by mesh ````meshIdx```` is: 

````javascript
let i2 = each_primitive_positions_and_normals_portion[ meshIdx + 1 ] - 1;
let x2 = normals[ i2 + 0 ];
let y2 = normals[ i2 + 1 ];
let z2 = normals[ i2 + 2 ];
```` 

Recall that ````positions```` are [quantized](#quantization) to 16-bit integers and ````normals```` are [oct-encoded](#oct-encoding). To de-quantize ````positions```` back to floating point values, xeokit will multiply them by the corresponding decode matrix in ````decode_matrices````. 

## Indices

The ````indices```` array indexes ````positions```` and ````normals```` to define the geometry primitives, which are triangles.

Like ````positions```` and ````normals````, ````indices```` has a portion for each mesh.

In the snippet below, we'll obtain the quantized positions of the vertices of the first triangle for mesh ````meshIdx````:

````javascript
let indicesBaseIdx = each_primitive_indices_portion[ meshIdx ];
let positionsAndNormalsBaseIdx = each_primitive_positions_and_normals_portion[ meshIdx ];

let a = indices[ indicesBaseIdx + 0 ];
let b = indices[ indicesBaseIdx + 1 ];
let c = indices[ indicesBaseIdx + 2 ];

let ax = positions[ positionsAndNormalsBaseIdx + (a * 3) + 0];
let ay = positions[ positionsAndNormalsBaseIdx + (a * 3) + 1];
let az = positions[ positionsAndNormalsBaseIdx + (a * 3) + 2];

let bx = positions[ positionsAndNormalsBaseIdx + (b * 3) + 0];
let by = positions[ positionsAndNormalsBaseIdx + (b * 3) + 1];
let bz = positions[ positionsAndNormalsBaseIdx + (b * 3) + 2];

let cx = positions[ positionsAndNormalsBaseIdx + (c * 3) + 0];
let cy = positions[ positionsAndNormalsBaseIdx + (c * 3) + 1];
let cz = positions[ positionsAndNormalsBaseIdx + (c * 3) + 2];
````

Similarly, we'll obtain the oct-encoded normals for the vertices of that triangle:

````javascript
let anx = normals[ positionsAndNormalsBaseIdx + (a * 3) + 0];
let any = normals[ positionsAndNormalsBaseIdx + (a * 3) + 1];
let anz = normals[ positionsAndNormalsBaseIdx + (a * 3) + 2];

let bnx = normals[ positionsAndNormalsBaseIdx + (b * 3) + 0];
let bny = normals[ positionsAndNormalsBaseIdx + (b * 3) + 1];
let bnz = normals[ positionsAndNormalsBaseIdx + (b * 3) + 2];

let cnx = normals[ positionsAndNormalsBaseIdx + (c * 3) + 0];
let cny = normals[ positionsAndNormalsBaseIdx + (c * 3) + 1];
let cnz = normals[ positionsAndNormalsBaseIdx + (c * 3) + 2];
````

Note how ````each_primitive_indices_portion```` contains a base index for each mesh to indicate its portion of ````indices````, and ````each_primitive_positions_and_normals_portion```` 
contains a base index for each mesh to indicate its portion of ````positions````. We use ````each_primitive_positions_and_normals_portion````  to offset each 
index to align it with the primitives portion in ````positions````. 

## Primitives

In xeokit, an entity can have multiple primitives. For example, an entity representing a window could have a mesh representing the frame, 
another representing the pane, another for the handle, and so on. 

The ````primitive_instances```` array contains a base index into ````each_primitive_positions_and_normals_portion````, ````primitive_normals````, 
````each_primitive_indices_portion```` and ````each_primitive_color```` for each entity. 


Let's extend the previous snippet to obtain the quantized positions and oct-encoded normals of the vertices of the first triangle within the first 
mesh belonging to the entity at ````entityIdx````:

````javascript
let meshBaseIdx = each_entity_primitive_instances_portion[ entityIdx ];

let indicesBaseIdx = each_primitive_indices_portion[ meshBaseIdx ];
let positionsAndNormalsBaseIdx = each_primitive_positions_and_normals_portion[ meshBaseIdx ];

let a = indices[ indicesBaseIdx + 0 ];
let b = indices[ indicesBaseIdx + 1 ];
let c = indices[ indicesBaseIdx + 2 ];

let ax = positions[ positionsAndNormalsBaseIdx + (a * 3) + 0];
let ay = positions[ positionsAndNormalsBaseIdx + (a * 3) + 1];
let az = positions[ positionsAndNormalsBaseIdx + (a * 3) + 2];

let bx = positions[ positionsAndNormalsBaseIdx + (b * 3) + 0];
let by = positions[ positionsAndNormalsBaseIdx + (b * 3) + 1];
let bz = positions[ positionsAndNormalsBaseIdx + (b * 3) + 2];

let cx = positions[ positionsAndNormalsBaseIdx + (c * 3) + 0];
let cy = positions[ positionsAndNormalsBaseIdx + (c * 3) + 1];
let cz = positions[ positionsAndNormalsBaseIdx + (c * 3) + 2];

let anx = normals[ positionsAndNormalsBaseIdx + (a * 3) + 0];
let any = normals[ positionsAndNormalsBaseIdx + (a * 3) + 1];
let anz = normals[ positionsAndNormalsBaseIdx + (a * 3) + 2];

let bnx = normals[ positionsAndNormalsBaseIdx + (b * 3) + 0];
let bny = normals[ positionsAndNormalsBaseIdx + (b * 3) + 1];
let bnz = normals[ positionsAndNormalsBaseIdx + (b * 3) + 2];

let cnx = normals[ positionsAndNormalsBaseIdx + (c * 3) + 0];
let cny = normals[ positionsAndNormalsBaseIdx + (c * 3) + 1];
let cnz = normals[ positionsAndNormalsBaseIdx + (c * 3) + 2];
````

Recall that ````primitive_instances```` has the number of primitives used by each entity. To get the base index for the last mesh of our entity:

````javascript
let numPrimitivesInEntity = primitive_instances[ entityIdx];
let meshBaseIdx = each_entity_primitive_instances_portion[ entityIdx + numPrimitivesInEntity - 1 ];

//...
````

## Decode Matrices

xeokit uses the decode matrices in ````decode_matrices```` to convert [quantized](#quantization) ````positions```` back to 32-bit floating point values. xeokit uses those matrices on the GPU, within its shaders.

Each mesh has a decode matrix in ````decode_matrices````. A decode matrix can be shared by multiple primitives. 

The ````each_primitive_decode_matrices_portion```` array contains a base index into ````decode_matrices```` for each mesh.

Let's get the decode matrix for the first mesh belonging to the entity at ````entityIdx````:

````javascript
let meshBaseIdx = each_entity_primitive_instances_portion[ entityIdx ];

let deocdeMatrixBaseIdx = each_primitive_decode_matrices_portion[ meshBaseIdx ];

let decodeMatrix = Float32Array(16);
for (let i = 0; i < 16; i++) {
    decodeMatrix[i] = decode_matrices[ deocdeMatrixBaseIdx + i];
}
````
 
As mentioned earlier, ````.xkt```` reduces accuracy loss by partitioning the ````positions```` into sub-regions, which are quantized separately. Each of the decode matrices corresponds to one of these partitions. Portions of ````positions```` that fall inside the same partition will share the same decode matrix. 

## Entity IDs

Each entity has a string ID, which we can get like so:

````javascript
let entityId = each_entity_id[ entityIdx ];
````

 
## Terminology
 
#### Primitive

A **primitive** represents a mesh. Each mesh has its geometry in a portion of the ````positions````, ````normals````, ````indices```` and ````edgeIndices```` arrays.

Primitives are used by entities. Some primitives are used by exactly one entity, with others are shared by multiple entities. When shared, we say that a mesh is *instanced* by the entities that share it. Instancing is very desirable in our models, because it reduces file size.

A mesh that's only used by one entity has ````positions```` that are in World-space. A mesh used by multiple entities has ````positions```` in Model-space.  

For shared primitives, xeokit will use the modeling matrices on their entities to transform their Model-space ````positions```` into World-space.
 
#### Entity

An entity is a drawable element within a xeokit model. An entity is comprised of one or more primitives. 
 
#### World Space

TODO
 
#### Model Space
 
TODO

#### Quantization
 
Quantization is the process of converting 32-bit floating point values for vertex ````positions```` into unsigned 16-bit integers. This reduces the space occupied by each vertex position from 12 bytes down to six bytes, which reduces the size of the XKT file. 

Quantization is performed by scaling and translating the floating point values so that they fit inside the unsigned 16-bit range. The quantized ````positions```` are accompanied by "decoding matrices" in ````decodeMatrices````, that contain the scaling and translation that xeokit performs on the GPU to de-quantize them back to their original 32-bit floating-point values. 

Some loss of precision occurs during the conversion just mentioned. For this reason, XKT V6 divides the ````positions```` into sub-regions, with each sub-region quantized independently into the full 16-bit range. Each sub-region has its own decoding matrix. 

Resources:

* The [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) tool contains quantization functions and uses a [k-d tree](https://en.wikipedia.org/wiki/K-d_tree) to partition the ````positions```` into sub-regions.
* See [mesh-quantization-example](https://github.com/xeolabs/mesh-quantization-example) for a WebGL-based quantization demo.
* Read the Cesium blog article [Using Quantization with 3D Models](https://cesium.com/blog/2016/08/08/cesium-web3d-quantized-attributes/) for more information on quantization.
   
#### Oct-Encoding

Oct Encoding is the process of converting 32-bit floating point values for vertex ````normals```` into unsigned 8-bit integers. As with quantization, this reduces the space they occupy. Similarly, xeokit converts them back to 32-bit flots on the GPU. 

Oct-encoded normals don't need a decoding matrix for xeokit to convert them back to floats.

Resources:

* The [xeokit-gltf-to-xkt](https://github.com/xeokit/xeokit-gltf-to-xkt) tool contains oct-encoding functions.
* See [mesh-quantization-example](https://github.com/xeolabs/mesh-quantization-example) for a WebGL-based oct-encoding demo.