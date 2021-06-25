import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: './index.dist.js',
    output: [
        {
            file: './dist/xeokit-xkt-utils.es.js',
            include: '/node_modules/',
            format: 'es',
            name: 'bundle'
        }        ,
        {
            file: './dist/xeokit-xkt-utils.cjs.js',
            include: '/node_modules/',
            format: 'cjs',
            name: 'bundle2'
        }
    ],
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs()
    ]
}