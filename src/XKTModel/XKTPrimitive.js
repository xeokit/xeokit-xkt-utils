/**
 * An element of reusable geometry within an {@link XKTModel}.
 *
 * * Created by {@link XKTModel#createPrimitive}
 * * Stored in {@link XKTModel#primitives} and {@link XKTModel#primitivesList}
 * * Referenced by {@link XKTPrimitiveInstance}s, which belong to {@link XKTEntity}s
 *
 * @class XKTPrimitive
 */
class XKTPrimitive {

    /**
     * @private
     * @param {Number} primitiveId Unique ID of the primitive in {@link XKTModel#primitives}.
     * @param {String} primitiveType Type of this primitive - "triangles" so far.
     * @param {Number} primitiveIndex Index of this XKTPrimitive in {@link XKTModel#primitivesList}.
     * @param {Uint8Array} color RGB color of this XKTPrimitive.
     * @param {Number} opacity Opacity of this XKTPrimitive.
     * @param {Float64Array} positions Non-quantized 3D vertex positions.
     * @param {Int8Array} normalsOctEncoded Oct-encoded vertex normals.
     * @param {Uint8Array} vertexColors Vertex colors.
     * @param {Uint32Array} indices Indices to organize the vertex positions and normals into triangles.
     * @param {Uint32Array} edgeIndices Indices to organize the vertex positions into edges.
     */
    constructor(primitiveId, primitiveType, primitiveIndex, color, opacity, positions, normalsOctEncoded, vertexColors, indices, edgeIndices) {

        /**
         * Unique ID of this XKTPrimitive in {@link XKTModel#primitives}.
         *
         * @type {Number}
         */
        this.primitiveId = primitiveId;

        /**
         * The type of primitive - "triangles" | "points" | "lines".
         *
         * @type {String}
         */
        this.primitiveType = primitiveType;

        /**
         * Index of this XKTPrimitive in {@link XKTModel#primitivesList}.
         *
         * @type {Number}
         */
        this.primitiveIndex = primitiveIndex;

        /**
         * RGB color of this XKTPrimitive.
         *
         * @type {Uint8Array}
         */
        this.color = color;

        /**
         * Opacity of this XKTPrimitive.
         *
         * @type {Number}
         */
        this.opacity = opacity;

        /**
         * The number of {@link XKTPrimitiveInstance}s that reference this XKTPrimitive.
         *
         * @type {Number}
         */
        this.numInstances = 0;

        /**
         * Non-quantized 3D vertex positions.
         *
         * @type {Float64Array}
         */
        this.positions = positions;

        /**
         * Quantized vertex positions.
         *
         * This array is later created from {@link XKTPrimitive#positions} by {@link XKTModel#finalize}.
         *
         * @type {Uint16Array}
         */
        this.positionsQuantized = new Uint16Array(positions.length);

        /**
         * Oct-encoded vertex normals.
         *
         * @type {Int8Array}
         */
        this.normalsOctEncoded = normalsOctEncoded;

        /**
         * Vertex colors.
         *
         * @type {Uint8Array}
         */
        this.vertexColors = vertexColors;

        /**
         * Indices that organize the vertex positions and normals as triangles.
         *
         * @type {Uint32Array}
         */
        this.indices = indices;

        /**
         * Indices that organize the vertex positions as edges.
         *
         * @type {Uint32Array}
         */
        this.edgeIndices = edgeIndices;
    }

    /**
     * Convenience property that is ````true```` when {@link XKTPrimitive#numInstances} is greater that one.
     * @returns {boolean}
     */
    get reused() {
        return (this.numInstances > 1);
    }
}

export {XKTPrimitive};