'use strict';

var minifier = require('uglify-es').minify;

function minify(userOptions) {
    var options = Object.assign({ sourceMap: true }, userOptions);
    return {
        name: 'minify',

        transformBundle: function transformBundle(code) {
            var result = minifier(code, options);
            if (result.error) {
              throw result.error;
            }
            return result;
        }
    };
}

module.exports = minify;
