/**
 * A usage of a {@link XKTPrimitive} by an {@link XKTEntity}.
 *
 * * Created by {@link XKTModel#createEntity}
 * * Stored in {@link XKTEntity#primitiveInstances} and {@link XKTModel#primitiveInstancesList}
 *
 * @class XKTPrimitiveInstance
 */
class XKTPrimitiveInstance {

    /**
     * @private
     * @param primitiveInstanceIndex
     * @param primitive
     */
    constructor(primitiveInstanceIndex, primitive) {

        /**
         * Index of this PrimitiveInstance in {@link XKTModel#primitiveInstancesList};
         *
         * @type {Number}
         */
        this.primitiveInstanceIndex = primitiveInstanceIndex;

        /**
         * The instanced {@link XKTPrimitive}.
         *
         * @type {XKTPrimitive}
         */
        this.primitive = primitive;

        /**
         * The owner {@link XKTEntity}.
         *
         * @type {XKTEntity}
         */
        this.entity = null; // Set after instantiation, when the Entity is known
    }
}

export {XKTPrimitiveInstance};