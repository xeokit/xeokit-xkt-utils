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
     * @param {*} cfg Configuration for the XKTGeometry.
     * @param {Number} cfg.geometryId Unique ID of the geometry in {@link XKTModel#geometries}.
     * @param {String} cfg.primitiveType Type of this geometry - "triangles", "points" or "lines" so far.
     * @param {Number} cfg.geometryIndex Index of this XKTGeometry in {@link XKTModel#geometriesList}.
     * @param {Float64Array} cfg.positions Non-quantized 3D vertex positions.
     * @param {Int8Array} cfg.normalsOctEncoded Oct-encoded vertex normals.
     * @param {Uint8Array} cfg.colorsCompressed Integer RGB vertex colors.
     * @param {Uint32Array} cfg.indices Indices to organize the vertex positions and normals into triangles.
     * @param {Uint32Array} cfg.edgeIndices Indices to organize the vertex positions into edges.
     */
    constructor(cfg) {

        /**
         * Unique ID of this XKTGeometry in {@link XKTModel#geometries}.
         *
         * @type {Number}
         */
        this.geometryId = cfg.geometryId;

        /**
         * The type of primitive - "triangles" | "points" | "lines".
         *
         * @type {String}
         */
        this.primitiveType = cfg.primitiveType;

        /**
         * Index of this XKTGeometry in {@link XKTModel#geometriesList}.
         *
         * @type {Number}
         */
        this.geometryIndex = cfg.geometryIndex;

        /**
         * The number of {@link XKTMesh}s that reference this XKTGeometry.
         *
         * @type {Number}
         */
        this.numInstances = 0;

        /**
         * Non-quantized 3D vertex positions.
         *
         * Defined for all primitive types.
         *
         * @type {Float64Array}
         */
        this.positions = cfg.positions;

        /**
         * Quantized vertex positions.
         *
         * Defined for all primitive types.
         *
         * This array is later created from {@link XKTGeometry#positions} by {@link XKTModel#finalize}.
         *
         * @type {Uint16Array}
         */
        this.positionsQuantized = new Uint16Array(cfg.positions.length);

        /**
         * Oct-encoded vertex normals.
         *
         * Defined only for triangle primitives. Ignored for points and lines.
         *
         * @type {Int8Array}
         */
        this.normalsOctEncoded = cfg.normalsOctEncoded;

        /**
         * Compressed RGB vertex colors.
         *
         * Defined only for point primitives. Ignored for triangles and lines.
         *
         * @type {Float32Array}
         */
        this.colorsCompressed = cfg.colorsCompressed;

        /**
         * Indices that organize the vertex positions and normals as triangles.
         *
         * Defined only for triangle and lines primitives. Ignored for points.
         *
         * @type {Uint32Array}
         */
        this.indices = cfg.indices;

        /**
         * Indices that organize the vertex positions as edges.
         *
         * Defined only for triangle primitives. Ignored for points and lines.
         *
         * @type {Uint32Array}
         */
        this.edgeIndices = cfg.edgeIndices;

        /**
         * When {@link XKTGeometry#primitiveType} is "triangles", this is ````true```` when this geometry is a watertight mesh.
         *
         * Defined only for triangle primitives. Ignored for points and lines.
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