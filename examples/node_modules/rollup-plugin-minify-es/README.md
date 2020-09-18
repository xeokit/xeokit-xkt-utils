# rollup-plugin-minify-es [![Travis Build Status][travis-img]][travis]

[Rollup](https://github.com/rollup/rollup) plugin to minify generated bundle.

## Install

```sh
npm i rollup-plugin-minify-es -D
```

## Usage

```js
import { rollup } from 'rollup';
import minify from 'rollup-plugin-minify-es';

rollup({
    entry: 'main.js',
    plugins: [
        minify()
    ]
});
```

## Options

```js
minify(options)
```

`options` – default: `{}`, type: `object`. [UglifyJS API options](https://github.com/mishoo/UglifyJS2/tree/harmony#api-reference)

`minifier` – default: `require('minify-js').minify`, type: `function`. Module to use as a minifier. You can use other versions (or forks) of UglifyJS instead default one.


```js
import { rollup } from 'rollup';
import minify from 'rollup-plugin-minify';
import { minify } from 'minify-es';

rollup({
    entry: 'main.js',
    plugins: [
        minify({}, minify)
    ]
});
```

## Examples

### Comments

If you'd like to preserve comments (for licensing for example), then you can specify a function to do this like so:

```js
minify({
  output: {
    comments: function(node, comment) {
        var text = comment.value;
        var type = comment.type;
        if (type == "comment2") {
            // multiline comment
            return /@preserve|@license|@cc_on/i.test(text);
        }
    }
  }
});
```

See [UglifyJS documentation](https://github.com/mishoo/UglifyJS2/tree/harmony#keeping-comments-in-the-output) for further reference.

# License

MIT
