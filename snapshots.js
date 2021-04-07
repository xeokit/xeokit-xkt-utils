const PercyScript = require('@percy/script');
const httpServer = require('http-server');

PercyScript.run(async (page, percySnapshot) => {

    async function testPage(pageName) {
        await page.goto('http://localhost:8080/tests/' + pageName);
        await page.waitFor(() => !!document.querySelector('#percyLoaded'));
        await percySnapshot(pageName, {
            widths: [1280],

        });
    }

    let server = httpServer.createServer();

    server.listen(8080);

    console.log(`Server started`);

    await testPage('convert_glTF_doublePrecision_MAP.html');
    await testPage('convert_glTF_Duplex.html');
    await testPage('convert_glTF_IfcOpenHouse2x3.html');
    await testPage('convert_glTF_IfcOpenHouse4.html');
    await testPage('convert_glTF_lines.html');
    await testPage('convert_glTF_MAP.html');
    await testPage('convert_glTF_PBR_GearboxPropellerTurbine.html');
    await testPage('convert_glTF_PBR_ReciprocatingSaw.html');
    await testPage('convert_glTF_pointCloud_MAP.html');
    await testPage('convert_glTF_Schependomlaan.html');
    await testPage('generate_batching_lines.html');
    await testPage('generate_batching_PBR_metallicVsRoughness.html');
    await testPage('generate_batching_points.html');
    await testPage('generate_batching_stairCase.html');
    await testPage('generate_batching_triangles.html');
    await testPage('generate_buildBoxGeometry.html');
    await testPage('generate_buildBoxLinesGeometry.html');
    await testPage('generate_buildCylinderGeometry.html');
    await testPage('generate_buildGeometries.html');
    await testPage('generate_buildGridGeometry.html');
    await testPage('generate_buildPlaneGeometry.html');
    await testPage('generate_buildSphereGeometry.html');
    await testPage('generate_buildTorusGeometry.html');
    await testPage('generate_buildVectorTextGeometry.html');
    await testPage('generate_instancing_batching_triangles.html');
    await testPage('generate_instancing_lines.html');
    await testPage('generate_instancing_PBR_metallicVsRoughness.html');
    await testPage('generate_instancing_points.html');
    await testPage('generate_instancing_stairCase.html');
    await testPage('generate_instancing_triangles.html');

    server.close();
});

