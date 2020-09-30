/**
 * @desc A box-shaped 3D region within an {@link XKTModel} that contains {@link XKTEntity}s.
 *
 * * Created by {@link XKTModel#finalize}
 * * Stored in {@link XKTModel#tilesList}
 *
 * @class XKTTile
 */
class XKTTile {

    /**
     * Creates a new XKTTile.
     *
     * @private
     * @param aabb
     * @param decodeMatrix
     * @param entities
     */
    constructor(aabb, decodeMatrix, entities) {

        /**
         * Axis-aligned World-space bounding box that encloses the {@link XKTEntity}'s within this Tile.
         *
         * @type {Float64Array}
         */
        this.aabb = aabb;

        /**
         * 4x4 positions de-quantization matrix to decompress the shared {@link XKTPrimitive}s belonging to the {@link XKTEntity}'s within this Tile.
         *
         * @type {Float32Array}
         */
        this.decodeMatrix = decodeMatrix;

        /**
         * The {@link XKTEntity}'s within this XKTTile.
         *
         * @type {XKTEntity[]}
         */
        this.entities = entities;
    }
}

export {XKTTile};