import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    input: "@xeokit/xeokit-sdk/dist/xeokit-sdk.es.js",
    output: {
        file: './assets/libs/xeokit-sdk.es.js',
        format: 'es',
        name: 'bundle'
    },
    plugins: [
        nodeResolve()
    ]
}