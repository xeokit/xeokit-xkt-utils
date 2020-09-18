import {math} from "./lib/math.js";
import {geometryCompression} from "./lib/geometryCompression.js";
import {buildEdgeIndices} from "./lib/buildEdgeIndices.js";

const tempVec4a = math.vec4([0, 0, 0, 1]);
const tempVec4b = math.vec4([0, 0, 0, 1]);
const tempMat4 = math.mat4();
const tempMat4b = math.mat4();

/**
 * A mock {@link XKTModel} that creates {@link Mesh}es and {@link Geometry}s to visualize the output of {@link loadXKTModelFromGLTF}.
 *
 * @private
 */
class MockXKTModel {

    /**
     *
     * @param cfg
     */
    constructor(cfg={}) {

        if (!cfg.handlePrimitive) {
            throw "Expected config: handlePrimitive";
        }

        if (!cfg.handleEntity) {
            throw "Expected config: handleEntity";
        }

        this._handlePrimitive = cfg.handlePrimitive;
        this._handleEntity = cfg.handleEntity;

        this.primitives = {};
    }

    createPrimitive(params) {

        const primitiveId = params.primitiveId;
        const primitiveType = params.primitiveType;
        const reused = params.reused;
        const primitiveModelingMatrix = params.primitiveModelingMatrix ? params.primitiveModelingMatrix.slice : math.identityMat4();
        const color = params.color;
        const opacity = params.opacity;
        const positions = params.positions.slice();
        const normals = params.normals.slice();
        const indices = params.indices;

        const positions2 = positions.slice();

        const edgeIndices = buildEdgeIndices(positions, indices, null, 10);

        if (!reused) {

            // Bake single-use primitive's positions into World-space

            for (let i = 0, len = positions.length; i < len; i += 3) {

                tempVec4a[0] = positions[i + 0];
                tempVec4a[1] = positions[i + 1];
                tempVec4a[2] = positions[i + 2];

                math.transformPoint4(primitiveModelingMatrix, tempVec4a, tempVec4b);

                positions2[i + 0] = tempVec4b[0];
                positions2[i + 1] = tempVec4b[1];
                positions2[i + 2] = tempVec4b[2];
            }
        }

        const modelNormalMatrix = math.inverseMat4(math.transposeMat4(primitiveModelingMatrix, tempMat4b), tempMat4);
        const normalsOctEncoded = new Int8Array(normals.length);

        geometryCompression.transformAndOctEncodeNormals(modelNormalMatrix, normals, normals.length, normalsOctEncoded, 0);

        const primitive = new VBOGeometry(this.scene, {
            id: primitiveId,
            primitive: "triangles",
            positions: positions2,
            normals: normals,
            indices: indices,
            edgeIndices: edgeIndices
        });

        this.primitives[primitiveId] = primitive;
    }

    createEntity(params) {

        const entityId = params.entityId;
        const entityModelingMatrix = params.entityModelingMatrix ? params.entityModelingMatrix.slice() : math.identityMat4();
        const primitiveIds = params.primitiveIds;

        for (let primitiveIdIdx = 0, primitiveIdLen = primitiveIds.length; primitiveIdIdx < primitiveIdLen; primitiveIdIdx++) {

            const primitiveId = primitiveIds[primitiveIdIdx];
            const primitive = this.primitives[primitiveId];

            if (!primitive) {
                console.error("primitive not found: " + primitiveId);
                continue;
            }

            new Mesh(this.scene, {
                id: entityId,
                geometry: primitive,
                matrix: entityModelingMatrix,
                edges: true
            });
        }
    }

    finalize() {
    }
}

export {MockXKTModel};