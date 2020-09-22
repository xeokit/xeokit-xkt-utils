/**
 * Creates xeokit {@link Mesh}es and {@link Geometry}s to visually test the given {@link XKTModel}.
 */
import {buildSphereGeometry, Mesh, PhongMaterial, VBOGeometry} from "../build/main.js";

function createMeshesFromXKTModel(scene, model) {

    const primitivesList = model.primitivesList;
    const tilesList = model.tilesList;
    const numPrimitives = primitivesList.length;
    const numTiles = tilesList.length;
    const geometries = [];

    // Create Geometries

    for (let primitiveIndex = 0; primitiveIndex < numPrimitives; primitiveIndex++) {

        const primitive = primitivesList [primitiveIndex];

        const geometry = new VBOGeometry(scene, {
            primitive: "triangles",
            positions: primitive.positions,
            normals: primitive.normals,
            indices: primitive.indices,
            edgeIndices: primitive.edgeIndices
        });

        geometries[primitiveIndex] = geometry;
    }

    // Create Meshes

    for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {

        const tile = tilesList [tileIndex];
        const tileEntities = tile.entities;
        const numTileEntities = tileEntities.length;

        for (let j = 0; j < numTileEntities; j++) {

            const entity = tileEntities[j];
            const entityPrimitiveInstances = entity.primitiveInstances;
            const numEntityPrimitiveInstances = entityPrimitiveInstances.length;

            //createAABBHelper(scene, entity.aabb, [0, 0, 1]);

            for (let k = 0; k < numEntityPrimitiveInstances; k++) {

                const primitiveInstance = entity.primitiveInstances[k];
                const primitive = primitiveInstance.primitive;
                const primitiveIndex = primitive.primitiveIndex;
                const geometry = geometries[primitiveIndex];

                const mesh = new Mesh(scene, {
                    geometry: geometry,
                    matrix: entity.matrix,
                    edges: true,
                    visible: true,
                    opacity: 0.2
                });

                //createAABBHelper(scene, mesh.aabb, [0, 1, 0]);
            }
        }
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

function createPosHelper(scene, rtcCenter) {
    new Mesh(scene, {
        geometry: new VBOGeometry(scene, buildSphereGeometry({
            radius: 0.1,
            heightSegments: 20,
            widthSegments: 20
        })),
        material: new PhongMaterial(scene, {
            emissive: [1, 0, 0],
            diffuse: [0, 0, 0],
            alpha: 0.3
        }),
        position: rtcCenter
    });
}

export {createMeshesFromXKTModel};