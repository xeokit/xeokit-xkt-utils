const XKTModel = require("../dist/xeokit-xkt-utils.cjs.js");

const assert = require('assert');

describe('Procedurally generate and validate an .XKT ArrayBuffer', () => {

    const xktModel = new XKTModel();

    xktModel.createPrimitive({
        primitiveId: "legPrimitive",
        primitiveType: "triangles",
        positions: [
            1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1,
            -1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, -1,
            -1, -1, -1, -1, -1, 1, -1, 1, 1, -1
        ],
        normals: [
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, -1, 0, 0, -1, 0, 0,
            -1, 0, 0, -1
        ],
        indices: [
            0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ],
        color: [255, 0, 0],
        opacity: 255
    });

    xktModel.createEntity({
        entityId: "leg1",
        primitiveIds: ["legPrimitive"],
        position: [-4, -6, -4],
        scale: [1, 3, 1],
        rotation: [0, 0, 0]
    });

    xktModel.createEntity({
        entityId: "leg2",
        primitiveIds: ["legPrimitive"],
        position: [4, -6, -4],
        scale: [1, 3, 1],
        rotation: [0, 0, 0]
    });

    xktModel.createEntity({
        entityId: "leg3",
        primitiveIds: ["legPrimitive"],
        position: [4, -6, 4],
        scale: [1, 3, 1],
        rotation: [0, 0, 0]
    });

    xktModel.createEntity({
        entityId: "leg4",
        primitiveIds: ["legPrimitive"],
        position: [-4, -6, 4],
        scale: [1, 3, 1],
        rotation: [0, 0, 0]
    });

    xktModel.createEntity({
        entityId: "top",
        primitiveIds: ["legPrimitive"],
        position: [0, -3, 0],
        scale: [6, 0.5, 6],
        rotation: [0, 0, 0]
    });

    xktModel.finalize();

    const xktArrayBuffer = writeXKTModelToArrayBuffer(xktModel);

    const xktArrayBufferValid = validateXKTArrayBuffer(xktArrayBuffer, xktModel);

    it('ArrayBuffer should be valid', () => {
        assert.equal(xktArrayBufferValid, true);
    });
});
