import nodeResolve from 'rollup-plugin-node-resolve';
import minify from 'rollup-plugin-minify-es';

export default {
    input: './index.dist.js',
    output: [
        {
            file: './dist/xeokit-xkt-utils.es.js',
            format: 'es',
            name: 'bundle'
        },
        {
            file: './dist/xeokit-xkt-utils.cjs.js',
            format: 'cjs',
            name: 'bundle2'
        }
    ],
    plugins: [
        nodeResolve(),
         minify()
    ]
}