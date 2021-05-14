import nodeResolve from 'rollup-plugin-node-resolve';
import minify from 'rollup-plugin-minify-es';

export default {
    input: './index.tests.js',
    output: {
        file: './tests/build/xeokit-components.js',
        format: 'es',
        name: 'bundle'
    },
    plugins: [
        nodeResolve(),
        // minify()
    ]
}