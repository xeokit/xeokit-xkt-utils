/**
 * Creates xeokit {@link Mesh}es and {@link Geometry}s to visualize the boundaries of the {@link XKTTile}s within an {@link XKTModel}.
 */
import {Mesh, PhongMaterial, VBOGeometry} from "../build/xeokit-components.js";

function visualizeXKTModelTileAABBs(scene, model) {
    const tilesList = model.tilesList;
    const numTiles = tilesList.length;
    for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {
        const tile = tilesList [tileIndex];
        createAABBHelper(scene, tile.aabb, [0, 0, 1]);
    }
}

function createAABBHelper(scene, aabb, color = [0, 0, 1]) {

    const xmin = aabb[0];
    const ymin = aabb[1];
    const zmin = aabb[2];
    const xmax = aabb[3];
    const ymax = aabb[4];
    const zmax = aabb[5];

    new Mesh(scene, {
        material: new PhongMaterial(scene, {
            emissive: color,
            diffuse: [0, 0, 0],
            lineWidth: 2
        }),
        geometry: new VBOGeometry(scene, {
            primitive: "lines",
            positions: [
                xmin, ymin, zmin,
                xmin, ymin, zmax,
                xmin, ymax, zmin,
                xmin, ymax, zmax,
                xmax, ymin, zmin,
                xmax, ymin, zmax,
                xmax, ymax, zmin,
                xmax, ymax, zmax
            ],
            indices: [
                0, 1,
                1, 3,
                3, 2,
                2, 0,
                4, 5,
                5, 7,
                7, 6,
                6, 4,
                0, 4,
                1, 5,
                2, 6,
                3, 7
            ]
        })
    });
}

export {visualizeXKTModelTileAABBs};