// Rollup plugins

import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
// import swc from 'rollup-plugin-swc';
import pkg from './package.json';
const path = require('path');

const product = process.env.NODE_ENV.trim() === 'prd';
const FILEMANE = pkg.name;
const sourceMap = !product;

const banner = `/*!\n * ${pkg.name} v${pkg.version}\n  */`;
// let outro = pkg.name + ' v' + pkg.version;
// outro = `typeof console !== 'undefined' && console.log('${outro}');`;
const plugins = [
    json(),
    nodeResolve(),
    commonjs(),
    // swc({
    //     // rollup: {
    //     //     exclude: 'path/to/exclude/',
    //     // },
    //     jsc: {
    //         parser: {
    //             syntax: 'ecmascript'
    //         },
    //         target: 'es5'
    //     },
    //     'sourceMaps': true
    // })
    babel({
        babelHelpers: 'bundled'
        // exclude: ['node_modules/**']
    })
];
const external = [];
const globals = {

};
const name = 'polyextrude';
export default [
    {
        input: path.join(__dirname, './index.js'),
        plugins: plugins,
        // sourceMap: true,
        external,
        output:
        {
            'format': 'umd',
            'name': name,
            'file': `dist/${FILEMANE}.js`,
            'sourcemap': sourceMap,
            'extend': true,
            'banner': banner,
            // 'outro': outro,
            'globals': globals
        }
    },
    {
        input: path.join(__dirname, './index.js'),
        plugins: plugins.concat([terser()]),
        // sourceMap: true,
        external,
        output:
        {
            'format': 'umd',
            'name': name,
            'file': `dist/${FILEMANE}.min.js`,
            'sourcemap': false,
            'extend': true,
            'banner': banner,
            // 'outro': outro,
            'globals': globals
        }
    },
    {
        input: path.join(__dirname, './index.js'),
        plugins: plugins,
        // sourceMap: true,
        external,
        output:
        {
            'format': 'es',
            'name': name,
            'file': `dist/${FILEMANE}.mjs`,
            'sourcemap': false,
            'extend': true,
            'banner': banner,
            // 'outro': outro,
            'globals': globals
        }
    }
];
