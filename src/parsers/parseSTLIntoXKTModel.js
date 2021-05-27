import {math} from "../lib/math.js";

/**
 * @desc Parses STL file data into an {@link XKTModel}.
 *
 * @param {Object} params Parsing params.
 * @param {ArrayBuffer|Response} [params.stlData] STL file data.
 * @param {XKTModel} [params.xktModel] XKTModel to parse into.
 */
async function parseSTLIntoXKTModel({stlData, xktModel}) {

    if (!stlData) {
        throw "Argument expected: stlData";
    }

    if (!xktModel) {
        throw "Argument expected: xktModel";
    }

    const binData = ensureBinary(stlData);

    if (isBinary(binData)) {
        parseBinary(binData, xktModel, params);
    } else {
        parseASCII(ensureString(stlData), xktModel, params);
    }
}

function isBinary(data) {
    const reader = new DataView(data);
    const numFaces = reader.getUint32(80, true);
    const faceSize = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
    const numExpectedBytes = 80 + (32 / 8) + (numFaces * faceSize);
    if (numExpectedBytes === reader.byteLength) {
        return true;
    }
    const solid = [115, 111, 108, 105, 100];
    for (let i = 0; i < 5; i++) {
        if (solid[i] !== reader.getUint8(i, false)) {
            return true;
        }
    }
    return false;
}

function parseBinary(data, xktModel, options) {
    const reader = new DataView(data);
    const faces = reader.getUint32(80, true);
    let r;
    let g;
    let b;
    let hasColors = false;
    let colors;
    let defaultR;
    let defaultG;
    let defaultB;
    let lastR = null;
    let lastG = null;
    let lastB = null;
    let newMesh = false;
    let alpha;
    for (let index = 0; index < 80 - 10; index++) {
        if ((reader.getUint32(index, false) === 0x434F4C4F /*COLO*/) &&
            (reader.getUint8(index + 4) === 0x52 /*'R'*/) &&
            (reader.getUint8(index + 5) === 0x3D /*'='*/)) {
            hasColors = true;
            colors = [];
            defaultR = reader.getUint8(index + 6) / 255;
            defaultG = reader.getUint8(index + 7) / 255;
            defaultB = reader.getUint8(index + 8) / 255;
            alpha = reader.getUint8(index + 9) / 255;
        }
    }
    let dataOffset = 84;
    let faceLength = 12 * 4 + 2;
    let positions = [];
    let normals = [];
    let splitMeshes = options.splitMeshes;
    for (let face = 0; face < faces; face++) {
        let start = dataOffset + face * faceLength;
        let normalX = reader.getFloat32(start, true);
        let normalY = reader.getFloat32(start + 4, true);
        let normalZ = reader.getFloat32(start + 8, true);
        if (hasColors) {
            let packedColor = reader.getUint16(start + 48, true);
            if ((packedColor & 0x8000) === 0) {
                r = (packedColor & 0x1F) / 31;
                g = ((packedColor >> 5) & 0x1F) / 31;
                b = ((packedColor >> 10) & 0x1F) / 31;
            } else {
                r = defaultR;
                g = defaultG;
                b = defaultB;
            }
            if (splitMeshes && r !== lastR || g !== lastG || b !== lastB) {
                if (lastR !== null) {
                    newMesh = true;
                }
                lastR = r;
                lastG = g;
                lastB = b;
            }
        }
        for (let i = 1; i <= 3; i++) {
            let vertexstart = start + i * 12;
            positions.push(reader.getFloat32(vertexstart, true));
            positions.push(reader.getFloat32(vertexstart + 4, true));
            positions.push(reader.getFloat32(vertexstart + 8, true));
            normals.push(normalX, normalY, normalZ);
            if (hasColors) {
                colors.push(r, g, b, 1); // TODO: handle alpha
            }
        }
        if (splitMeshes && newMesh) {
            addMesh(xktModel, positions, normals, colors, options);
            positions = [];
            normals = [];
            colors = colors ? [] : null;
            newMesh = false;
        }
    }
    if (positions.length > 0) {
        addMesh(xktModel, positions, normals, colors, options);
    }
}

function parseASCII(data, xktModel, options) {
    const faceRegex = /facet([\s\S]*?)endfacet/g;
    let faceCounter = 0;
    const floatRegex = /[\s]+([+-]?(?:\d+.\d+|\d+.|\d+|.\d+)(?:[eE][+-]?\d+)?)/.source;
    const vertexRegex = new RegExp('vertex' + floatRegex + floatRegex + floatRegex, 'g');
    const normalRegex = new RegExp('normal' + floatRegex + floatRegex + floatRegex, 'g');
    const positions = [];
    const normals = [];
    const colors = null;
    let normalx;
    let normaly;
    let normalz;
    let result;
    let verticesPerFace;
    let normalsPerFace;
    let text;
    while ((result = faceRegex.exec(data)) !== null) {
        verticesPerFace = 0;
        normalsPerFace = 0;
        text = result[0];
        while ((result = normalRegex.exec(text)) !== null) {
            normalx = parseFloat(result[1]);
            normaly = parseFloat(result[2]);
            normalz = parseFloat(result[3]);
            normalsPerFace++;
        }
        while ((result = vertexRegex.exec(text)) !== null) {
            positions.push(parseFloat(result[1]), parseFloat(result[2]), parseFloat(result[3]));
            normals.push(normalx, normaly, normalz);
            verticesPerFace++;
        }
        if (normalsPerFace !== 1) {
            console.error("Error in normal of face " + faceCounter);
            return -1;
        }
        if (verticesPerFace !== 3) {
            console.error("Error in positions of face " + faceCounter);
            return -1;
        }
        faceCounter++;
    }
    addMesh(xktModel, positions, normals, colors, options);
}

let nextGeometryId = 0;

function addMesh(xktModel, positions, normals, colors, options) {

    const indices = new Int32Array(positions.length / 3);
    for (let ni = 0, len = indices.length; ni < len; ni++) {
        indices[ni] = ni;
    }

    normals = normals && normals.length > 0 ? normals : null;
    colors = colors && colors.length > 0 ? colors : null;

    if (options.smoothNormals) {
        math.faceToVertexNormals(positions, normals, options);
    }

    const geometryId = nextGeometryId++;
    const meshId = nextGeometryId++;
    const entityId = nextGeometryId++;

    xktModel.createGeometry({
        geometryId: geometryId,
        primitive: "triangles",
        positions: positions,
        normals: normals,
        colors: colors,
        indices: indices
    });

    xktModel.createMesh({
        meshId: meshId,
        geometryId: geometryId
    });

    xktModel.createEntity({
        entityId: entityId,
        meshIds: [meshId]
    });
}

function ensureString(buffer) {
    if (typeof buffer !== 'string') {
        return decodeText(new Uint8Array(buffer));
    }
    return buffer;
}

function ensureBinary(buffer) {
    if (typeof buffer === 'string') {
        const arrayBuffer = new Uint8Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            arrayBuffer[i] = buffer.charCodeAt(i) & 0xff; // implicitly assumes little-endian
        }
        return arrayBuffer.buffer || arrayBuffer;
    } else {
        return buffer;
    }
}

function decodeText(array) {
    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(array);
    }
    let s = '';
    for (let i = 0, il = array.length; i < il; i++) {
        s += String.fromCharCode(array[i]); // Implicitly assumes little-endian.
    }
    return decodeURIComponent(escape(s));
}

export {parseSTLIntoXKTModel};
