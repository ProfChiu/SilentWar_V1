/* Minimal assertion harness. No deps. Prints "<N> passed, <N> failed",
 * exits nonzero on failure. */
'use strict';
var passed = 0, failed = 0, name = '';
function suite(n) { name = n; }
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL: ' + msg); }
}
function eq(a, b, msg) {
  var same = JSON.stringify(a) === JSON.stringify(b);
  ok(same, msg + '\n    expected ' + JSON.stringify(b) + '\n    got      ' + JSON.stringify(a));
}
function throws(fn, msg) {
  try { fn(); ok(false, msg + ' (did not throw)'); }
  catch (e) { ok(true, msg); }
}
function done() {
  console.log(name + ': ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}
module.exports = { suite: suite, ok: ok, eq: eq, throws: throws, done: done };
