import {utils} from "../XKTModel/lib/utils.js";
import {math} from "../lib/math.js";

// HACK: Allows node.js to find atob()
let atob2;
if (typeof atob === 'undefined') {
    const atob = require('atob');
    atob2 = atob;
} else {
    atob2 = atob;
}

const WEBGL_COMPONENT_TYPES = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
};

const WEBGL_TYPE_SIZES = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16
};

/**
 * @desc Parses glTF JSON into an {@link XKTModel}.
 *
 * ## Usage
 *
 * In the example below we'll create an {@link XKTModel}, then load a glTF model into it.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#parsers_glTF_Duplex)]
 *
 * ````javascript
 * utils.loadJSON("./models/gltf/duplex/scene.gltf", async (json) => {
 *
 *     const xktModel = new XKTModel();
 *
 *     parseGLTFIntoXKTModel(json, xktModel);
 *
 *     xktModel.finalize();
 * });
 * ````
 *
 * @param {Object} gltf The glTF JSON.
 * @param {XKTModel} xktModel XKTModel to parse into
 * @param {function} getAttachment Callback through which to fetch attachments, if the glTF has them.
 */
async function parseGLTFIntoXKTModel(gltf, xktModel, getAttachment) {
    const parsingCtx = {
        gltf: gltf,
        getAttachment: getAttachment || (() => {
            throw new Error('You must define getAttachment() method to convert glTF with external resources')
        }),
        xktModel: xktModel,
        geometryCreated: {},
        nextGeometryId: 0,
        nextMeshId: 0,
        nextDefaultEntityId: 0
    };
    await parseBuffers(parsingCtx);
    parseBufferViews(parsingCtx);
    freeBuffers(parsingCtx);
    parseMaterials(parsingCtx);
    parseDefaultScene(parsingCtx);
}

async function parseBuffers(parsingCtx) {  // Parses geometry buffers into temporary  "_buffer" Unit8Array properties on the glTF "buffer" elements
    const buffers = parsingCtx.gltf.buffers;
    if (buffers) {
        await Promise.all(buffers.map(buffer => parseBuffer(parsingCtx, buffer)));
    }
}

async function parseBuffer(parsingCtx, bufferInfo) {
    const uri = bufferInfo.uri;
    if (!uri) {
        throw new Error('gltf/handleBuffer missing uri in ' + JSON.stringify(bufferInfo));
    }
    bufferInfo._buffer = await parseArrayBuffer(parsingCtx, uri);
}

async function parseArrayBuffer(parsingCtx, uri) {
    const dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/; // Check for data: URI
    const dataUriRegexResult = uri.match(dataUriRegex);
    if (dataUriRegexResult) { // Safari can't handle data URIs through XMLHttpRequest
        const isBase64 = !!dataUriRegexResult[2];
        let data = dataUriRegexResult[3];
        data = decodeURIComponent(data);
        if (isBase64) {
            data = atob2(data);
        }
        const buffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < data.length; i++) {
            view[i] = data.charCodeAt(i);
        }
        return buffer;
    } else { // Uri is a path to a file
        const arraybuffer = await parsingCtx.getAttachment(uri);
        return arraybuffer;
    }
}

function parseBufferViews(parsingCtx) { // Parses our temporary "_buffer" properties into "_buffer" properties on glTF "bufferView" elements
    const bufferViewsInfo = parsingCtx.gltf.bufferViews;
    if (bufferViewsInfo) {
        for (let i = 0, len = bufferViewsInfo.length; i < len; i++) {
            parseBufferView(parsingCtx, bufferViewsInfo[i]);
        }
    }
}

function parseBufferView(parsingCtx, bufferViewInfo) {
    const buffer = parsingCtx.gltf.buffers[bufferViewInfo.buffer];
    bufferViewInfo._typedArray = null;
    const byteLength = bufferViewInfo.byteLength || 0;
    const byteOffset = bufferViewInfo.byteOffset || 0;
    bufferViewInfo._buffer = buffer._buffer.slice(byteOffset, byteOffset + byteLength);
}

function freeBuffers(parsingCtx) { // Deletes the "_buffer" properties from the glTF "buffer" elements, to save memory
    const buffers = parsingCtx.gltf.buffers;
    if (buffers) {
        for (let i = 0, len = buffers.length; i < len; i++) {
            buffers[i]._buffer = null;
        }
    }
}

function parseMaterials(parsingCtx) {
    const materialsInfo = parsingCtx.gltf.materials;
    if (materialsInfo) {
        for (let i = 0, len = materialsInfo.length; i < len; i++) {
            const materialInfo = materialsInfo[i];
            const material = parseMaterial(parsingCtx, materialInfo);
            materialInfo._materialData = material;
        }
    }
}

function parseMaterial(parsingCtx, materialInfo) { // Attempts to extract an RGBA color for a glTF material
    const material = {
        color: new Float32Array([1, 1, 1]),
        opacity: 1.0,
        metallic: 0,
        roughness: 1
    };
    const extensions = materialInfo.extensions;
    if (extensions) {
        const specularPBR = extensions["KHR_materials_pbrSpecularGlossiness"];
        if (specularPBR) {
            const diffuseFactor = specularPBR.diffuseFactor;
            if (diffuseFactor !== null && diffuseFactor !== undefined) {
                material.color[0] = diffuseFactor[0];
                material.color[1] = diffuseFactor[1];
                material.color[2] = diffuseFactor[2];
            }
        }
        const common = extensions["KHR_materials_common"];
        if (common) {
            const technique = common.technique;
            const values = common.values || {};
            const blinn = technique === "BLINN";
            const phong = technique === "PHONG";
            const lambert = technique === "LAMBERT";
            const diffuse = values.diffuse;
            if (diffuse && (blinn || phong || lambert)) {
                if (!utils.isString(diffuse)) {
                    material.color[0] = diffuse[0];
                    material.color[1] = diffuse[1];
                    material.color[2] = diffuse[2];
                }
            }
            const transparency = values.transparency;
            if (transparency !== null && transparency !== undefined) {
                material.opacity = transparency;
            }
            const transparent = values.transparent;
            if (transparent !== null && transparent !== undefined) {
                material.opacity = transparent;
            }
        }
    }
    const metallicPBR = materialInfo.pbrMetallicRoughness;
    if (metallicPBR) {
        const baseColorFactor = metallicPBR.baseColorFactor;
        if (baseColorFactor) {
            material.color[0] = baseColorFactor[0];
            material.color[1] = baseColorFactor[1];
            material.color[2] = baseColorFactor[2];
            material.opacity = baseColorFactor[3];
        }
        const metallicFactor = metallicPBR.metallicFactor;
        if (metallicFactor !== null && metallicFactor !== undefined) {
            material.metallic = metallicFactor;
        }
        const roughnessFactor = metallicPBR.roughnessFactor;
        if (roughnessFactor !== null && roughnessFactor !== undefined) {
            material.roughness = roughnessFactor;
        }
    }
    return material;
}

function parseDefaultScene(parsingCtx) {
    const scene = parsingCtx.gltf.scene || 0;
    const defaultSceneInfo = parsingCtx.gltf.scenes[scene];
    if (!defaultSceneInfo) {
        throw new Error("glTF has no default scene");
    }
    parseScene(parsingCtx, defaultSceneInfo);
}


function parseScene(parsingCtx, sceneInfo) {
    const nodes = sceneInfo.nodes;
    if (!nodes) {
        return;
    }
    for (let i = 0, len = nodes.length; i < len; i++) {
        const glTFNode = parsingCtx.gltf.nodes[nodes[i]];
        if (glTFNode) {
            parseNode(parsingCtx, glTFNode, null);
        }
    }
}

let count = 0;

function parseNode(parsingCtx, glTFNode, matrix) {

    const gltf = parsingCtx.gltf;
    const xktModel = parsingCtx.xktModel;

    let localMatrix;

    if (glTFNode.matrix) {
        localMatrix = glTFNode.matrix;
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, math.mat4());
        } else {
            matrix = localMatrix;
        }
    }

    if (glTFNode.translation) {
        localMatrix = math.translationMat4v(glTFNode.translation);
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, localMatrix);
        } else {
            matrix = localMatrix;
        }
    }

    if (glTFNode.rotation) {
        localMatrix = math.quaternionToMat4(glTFNode.rotation);
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, localMatrix);
        } else {
            matrix = localMatrix;
        }
    }

    if (glTFNode.scale) {
        localMatrix = math.scalingMat4v(glTFNode.scale);
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, localMatrix);
        } else {
            matrix = localMatrix;
        }
    }

    const gltfMeshId = glTFNode.mesh;

    if (gltfMeshId !== undefined) {

        const meshInfo = gltf.meshes[gltfMeshId];

        if (meshInfo) {

            const numPrimitivesInMesh = meshInfo.primitives.length;

            if (numPrimitivesInMesh > 0) {

                const xktMeshIds = [];

                for (let i = 0; i < numPrimitivesInMesh; i++) {

                    const primitiveInfo = meshInfo.primitives[i];
                    const materialIndex = primitiveInfo.material;
                    const materialInfo = (materialIndex !== null && materialIndex !== undefined) ? gltf.materials[materialIndex] : null;
                    const color = materialInfo ? materialInfo._materialData.color : new Float32Array([1.0, 1.0, 1.0, 1.0]);
                    const opacity = materialInfo ? materialInfo._materialData.opacity : 1.0;
                    const metallic = materialInfo ? materialInfo._materialData.metallic : 0.0;
                    const roughness = materialInfo ? materialInfo._materialData.roughness : 1.0;

                    const xktGeometryId = createPrimitiveGeometryHash(primitiveInfo);

                    if (!parsingCtx.geometryCreated[xktGeometryId]) {

                        const geometryArrays = {};

                        parsePrimitiveGeometry(parsingCtx, primitiveInfo, geometryArrays);

                        const colors = geometryArrays.colors;

                        let colorsCompressed;

                        if (geometryArrays.colors) {
                            colorsCompressed = [];
                            for (let j = 0, lenj = colors.length; j < lenj; j += 4) {
                                colorsCompressed.push(Math.floor(colors[j + 0] * 255));
                                colorsCompressed.push(Math.floor(colors[j + 1] * 255));
                                colorsCompressed.push(Math.floor(colors[j + 2] * 255));
                            }
                        }

                        xktModel.createGeometry({
                            geometryId: xktGeometryId,
                            primitiveType: geometryArrays.primitive,
                            positions: geometryArrays.positions,
                            normals: geometryArrays.normals,
                            colorsCompressed: colorsCompressed,
                            indices: geometryArrays.indices
                        });

                        parsingCtx.geometryCreated[xktGeometryId] = true;
                    }

                    const xktMeshId = parsingCtx.nextMeshId++;

                    xktModel.createMesh({
                        meshId: xktMeshId,
                        geometryId: xktGeometryId,
                        matrix: matrix ? matrix.slice() : math.identityMat4(),
                        color: color,
                        opacity: opacity,
                        metallic: metallic,
                        roughness: roughness
                    });

                    xktMeshIds.push(xktMeshId);
                }

                const xktEntityId = glTFNode.name || ("entity" + parsingCtx.nextDefaultEntityId++);

                xktModel.createEntity({
                    entityId: xktEntityId,
                    meshIds: xktMeshIds
                });
            }
        }
    }

    if (glTFNode.children) {
        const children = glTFNode.children;
        for (let i = 0, len = children.length; i < len; i++) {
            const childNodeIdx = children[i];
            const childGLTFNode = gltf.nodes[childNodeIdx];
            if (!childGLTFNode) {
                console.warn('Node not found: ' + i);
                continue;
            }
            parseNode(parsingCtx, childGLTFNode, matrix);
        }
    }
}

function createPrimitiveGeometryHash(primitiveInfo) {
    const attributes = primitiveInfo.attributes;
    if (!attributes) {
        return "empty";
    }
    return [
        primitiveInfo.mode,
        (primitiveInfo.indices !== null && primitiveInfo.indices !== undefined) ? primitiveInfo.indices : "-",
        (primitiveInfo.positions !== null && primitiveInfo.positions !== undefined) ? primitiveInfo.positions : "-",
        (primitiveInfo.normals !== null && primitiveInfo.normals !== undefined) ? primitiveInfo.normals : "-",
        (primitiveInfo.colors !== null && primitiveInfo.colors !== undefined) ? primitiveInfo.colors : "-"
    ].join(";");
}

function parsePrimitiveGeometry(parsingCtx, primitiveInfo, geometryArrays) {
    const attributes = primitiveInfo.attributes;
    if (!attributes) {
        return;
    }
    switch (primitiveInfo.mode) {
        case 0: // POINTS
            geometryArrays.primitive = "points";
            break;
        case 1: // LINES
            geometryArrays.primitive = "lines";
            break;
        case 2: // LINE_LOOP
            // TODO: convert
            geometryArrays.primitive = "lines";
            break;
        case 3: // LINE_STRIP
            // TODO: convert
            geometryArrays.primitive = "lines";
            break;
        case 4: // TRIANGLES
            geometryArrays.primitive = "triangles";
            break;
        case 5: // TRIANGLE_STRIP
            // TODO: convert
            geometryArrays.primitive = "triangles";
            break;
        case 6: // TRIANGLE_FAN
            // TODO: convert
            geometryArrays.primitive = "triangles";
            break;
    }
    const accessors = parsingCtx.gltf.accessors;
    const indicesIndex = primitiveInfo.indices;
    if (indicesIndex !== null && indicesIndex !== undefined) {
        const accessorInfo = accessors[indicesIndex];
        geometryArrays.indices = parseAccessorTypedArray(parsingCtx, accessorInfo);
    }
    const positionsIndex = attributes.POSITION;
    if (positionsIndex !== null && positionsIndex !== undefined) {
        const accessorInfo = accessors[positionsIndex];
        geometryArrays.positions = parseAccessorTypedArray(parsingCtx, accessorInfo);
    }
    const normalsIndex = attributes.NORMAL;
    if (normalsIndex !== null && normalsIndex !== undefined) {
        const accessorInfo = accessors[normalsIndex];
        geometryArrays.normals = parseAccessorTypedArray(parsingCtx, accessorInfo);
    }
    const colorsIndex = attributes.COLOR_0;
    if (colorsIndex !== null && colorsIndex !== undefined) {
        const accessorInfo = accessors[colorsIndex];
        geometryArrays.colors = parseAccessorTypedArray(parsingCtx, accessorInfo);
    }
}

function parseAccessorTypedArray(parsingCtx, accessorInfo) {
    const bufferView = parsingCtx.gltf.bufferViews[accessorInfo.bufferView];
    const itemSize = WEBGL_TYPE_SIZES[accessorInfo.type];
    const TypedArray = WEBGL_COMPONENT_TYPES[accessorInfo.componentType];
    const elementBytes = TypedArray.BYTES_PER_ELEMENT; // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
    const itemBytes = elementBytes * itemSize;
    if (accessorInfo.byteStride && accessorInfo.byteStride !== itemBytes) { // The buffer is not interleaved if the stride is the item size in bytes.
        throw new Error("interleaved buffer!"); // TODO
    } else {
        return new TypedArray(bufferView._buffer, accessorInfo.byteOffset || 0, accessorInfo.count * itemSize);
    }
}


export {parseGLTFIntoXKTModel};
