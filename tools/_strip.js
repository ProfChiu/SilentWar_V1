/* Remove /* *​/ and // comments so a source scan tests code, not prose. */
'use strict';
module.exports = function strip(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
};
