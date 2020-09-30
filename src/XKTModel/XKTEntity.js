import {math} from "./lib/math.js";

/**
 * An object within an {@link XKTModel}.
 *
 * * Created by {@link XKTModel#createEntity}
 * * Stored in {@link XKTModel#entities} and {@link XKTModel#entitiesList}
 * * Has one or more {@link XKTPrimitiveInstance}s, each having an {@link XKTPrimitive}
 * * May either share all of its ````XKTPrimitives````s with other ````XKTEntity````s, or exclusively own all of its ````XKTPrimitive````s
 *
 * @class XKTEntity
 */
class XKTEntity {

    /**
     * @private
     * @param entityId
     * @param matrix
     * @param primitiveInstances
     */
    constructor(entityId, matrix, primitiveInstances) {

        /**
         * Unique ID of this ````XKTEntity```` in {@link XKTModel#entities}.
         *
         * For a BIM model, this will be an IFC product ID.
         *
         * @type {String}
         */
        this.entityId = entityId;

        /**
         * Index of this ````XKTEntity```` in {@link XKTModel#entitiesList}.
         *
         * Set by {@link XKTModel#finalize}.
         *
         * @type {Number}
         */
        this.entityIndex = 0;

        /**
         * The 4x4 modeling transform matrix.
         *
         * Transform is relative to the center of the {@link XKTTile} that contains this Entity.
         *
         * When the ````XKTEntity```` shares its {@link XKTPrimitive}s with other ````XKTEntity````s, this matrix is used to transform the
         * shared Primitives into World-space for this Entity. When this Entity does not share its ````XKTPrimitive````s,
         * then this matrix is ignored.
         *
         * @type {Number[]}
         */
        this.matrix = matrix;

        /**
         * A list of {@link XKTPrimitiveInstance}s that indicate which {@link XKTPrimitive}s are used by this Entity.
         *
         * @type {XKTPrimitiveInstance[]}
         */
        this.primitiveInstances = primitiveInstances;

        /**
         * World-space axis-aligned bounding box (AABB) that encloses the {@link XKTPrimitive#positions} of
         * the {@link XKTPrimitive}s that are used by this ````XKTEntity````.
         *
         * Set by {@link XKTModel#finalize}.
         *
         * @type {Float32Array}
         */
        this.aabb = math.AABB3();

        /**
         * Indicates if this ````XKTEntity```` shares {@link XKTPrimitive}s with other {@link XKTEntity}'s.
         *
         * Set by {@link XKTModel#finalize}.
         *
         * Note that when an ````XKTEntity```` shares ````XKTPrimitives````, it shares **all** of its ````XKTPrimitives````. An ````XKTEntity````
         * never shares only some of its ````XKTPrimitives```` - it always shares either the whole set or none at all.
         *
         * @type {Boolean}
         */
        this.hasReusedPrimitives = false;
    }
}

export {XKTEntity};