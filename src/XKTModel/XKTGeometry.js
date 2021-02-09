/**
 * An element of reusable geometry within an {@link XKTModel}.
 *
 * * Created by {@link XKTModel#createGeometry}
 * * Stored in {@link XKTModel#geometries} and {@link XKTModel#geometriesList}
 * * Referenced by {@link XKTMesh}s, which belong to {@link XKTEntity}s
 *
 * @class XKTGeometry
 */
class XKTGeometry {

    /**
     * @private
     * @param {Number} geometryId Unique ID of the geometry in {@link XKTModel#geometries}.
     * @param {String} primitiveType Type of this geometry - "triangles" so far.
     * @param {Number} geometryIndex Index of this XKTGeometry in {@link XKTModel#geometriesList}.
     * @param {Float64Array} positions Non-quantized 3D vertex positions.
     * @param {Int8Array} normalsOctEncoded Oct-encoded vertex normals.
     * @param {Uint32Array} indices Indices to organize the vertex positions and normals into triangles.
     * @param {Uint32Array} edgeIndices Indices to organize the vertex positions into edges.
     */
    constructor(geometryId,
                primitiveType,
                geometryIndex,
                positions,
                normalsOctEncoded,
                indices,
                edgeIndices) {

        /**
         * Unique ID of this XKTGeometry in {@link XKTModel#geometries}.
         *
         * @type {Number}
         */
        this.geometryId = geometryId;

        /**
         * The type of primitive - "triangles" | "points" | "lines".
         *
         * @type {String}
         */
        this.primitiveType = primitiveType;

        /**
         * Index of this XKTGeometry in {@link XKTModel#geometriesList}.
         *
         * @type {Number}
         */
        this.geometryIndex = geometryIndex;

        /**
         * The number of {@link XKTMesh}s that reference this XKTGeometry.
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
         * This array is later created from {@link XKTGeometry#positions} by {@link XKTModel#finalize}.
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

        /**
         * When {@link XKTGeometry#primitiveType} is "triangles", this is ````true```` when this geometry is a watertight mesh.
         *
         * Set by {@link XKTModel#finalize}.
         *
         * @type {boolean}
         */
        this.solid = false;
    }

    /**
     * Convenience property that is ````true```` when {@link XKTGeometry#numInstances} is greater that one.
     * @returns {boolean}
     */
    get reused() {
        return (this.numInstances > 1);
    }
}

export {XKTGeometry};