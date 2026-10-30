'use strict';
/* Guards playbook invariant 9: pure rules/data modules must be DOM-free and
 * dice-free; exactly one file may touch the DOM and roll real dice. */
var t = require('./_harness.js');
var fs = require('fs'), path = require('path');
var strip = require('./_strip.js');
t.suite('architecture');

var GAME = path.join(__dirname, '..', 'apps', 'game');
var UI = 'swui.js';

function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (f) {
    var full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (f.endsWith('.js')) out.push(full);
  });
  return out;
}

var files = walk(GAME, []);
t.ok(files.length >= 11, 'found the module set (' + files.length + ' js files)');

files.forEach(function (full) {
  var rel = path.relative(GAME, full);
  var src = strip(fs.readFileSync(full, 'utf8'));
  var isUI = rel === UI;
  if (isUI) return;
  t.ok(src.indexOf('Math.random') === -1, rel + ' has no Math.random');
  t.ok(src.indexOf('document.') === -1, rel + ' does not touch document');
  t.ok(!/\bwindow\.(alert|confirm|prompt)\b/.test(src), rel + ' shows no dialog');
  t.ok(src.indexOf('addEventListener') === -1, rel + ' binds no events');
});

/* The UI file is allowed all of it — but it must be the ONLY one. */
var uiSrc = strip(fs.readFileSync(path.join(GAME, UI), 'utf8'));
t.ok(uiSrc.indexOf('Math.random') > -1, 'swui.js is where real dice live');
t.ok(uiSrc.indexOf('document.') > -1, 'swui.js is where the DOM lives');

/* Rule arithmetic must not be reimplemented in the UI: the ledger and every
 * total come from the pure modules. */
t.ok(uiSrc.indexOf('SWResolution.ledgerLines') > -1 || uiSrc.indexOf('Res.ledgerLines') > -1,
  'swui.js renders ledgers via sw_resolution, it does not format its own');
t.ok(uiSrc.indexOf('Fog.summarize') > -1,
  'swui.js gets every summary through sw_fog, so it cannot leak hidden values');
t.ok(uiSrc.indexOf('Player.next') > -1 && uiSrc.indexOf('applyEffect') === -1,
  'swui.js drives the tape through sw_tapeplayer and applies no effects itself');

/* Every script the shell loads must exist and be in dependency order. */
var html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
var srcs = (html.match(/<script src="([^"]+)"/g) || []).map(function (s) {
  return s.match(/src="([^"]+)"/)[1];
});
t.ok(srcs.length >= 12, 'shell loads the full module set');
srcs.forEach(function (s) {
  t.ok(fs.existsSync(path.join(GAME, s)), 'shell script exists: ' + s);
});
t.ok(srcs.indexOf('rules/sw_resolution.js') < srcs.indexOf('rules/sw_tapeplayer.js'),
  'sw_resolution loads before sw_tapeplayer, which depends on it');
t.eq(srcs[srcs.length - 1], UI, 'swui.js loads last');

/* Syntax check every module, the way node --check would. */
files.forEach(function (full) {
  var rel = path.relative(GAME, full);
  try { new Function(fs.readFileSync(full, 'utf8')); t.ok(true, rel + ' parses'); }
  catch (e) { t.ok(false, rel + ' parses: ' + e.message); }
});

t.done();
