import nodeResolve from 'rollup-plugin-node-resolve';
import minify from 'rollup-plugin-minify-es';

export default {
    input: './index.js',
    output: [
        {
            file: './dist/xeokit-xkt-tools.es.js',
            format: 'es',
            name: 'bundle'
        },
        {
            file: './dist/xeokit-xkt-tools.cjs.js',
            format: 'cjs',
            name: 'bundle2'
        }
    ],
    plugins: [
        nodeResolve(),
       // minify()
    ]
}