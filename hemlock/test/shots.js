'use strict';
// Renders PNG screenshots of key scenes for visual review.
// Requires the optional `canvas` package:  npm i canvas && node hemlock/test/shots.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas } = require('canvas');

const W = 1280, H = 720;
const cnv = createCanvas(W, H);
const ctx2d = cnv.getContext('2d');

const store = {};
let rafCb = null;
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
  navigator: {},
  localStorage: {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  },
  document: {
    getElementById() { return cnv; },
    addEventListener() {},
    hidden: false,
    body: { style: {}, classList: { add() {}, contains() { return false; } } },
  },
  requestAnimationFrame(cb) { rafCb = cb; },
  performance: { now: () => Date.now() },
};
sandbox.window = sandbox;
sandbox.window.innerWidth = W;
sandbox.window.innerHeight = H;
sandbox.window.devicePixelRatio = 1;
sandbox.window.addEventListener = () => {};
// node-canvas lacks addEventListener / getBoundingClientRect on the canvas
cnv.addEventListener = () => {};
cnv.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });
cnv.style = {};
vm.createContext(sandbox);

const root = path.join(__dirname, '..');
const files = ['util.js', 'audio.js', 'gfx.js', 'ui.js', 'data.js', 'save.js',
  'scene_title.js', 'scene_island.js', 'scene_biz.js', 'scene_minigames.js',
  'scene_market.js', 'scene_run.js', 'scene_heat.js', 'main.js'];
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), sandbox, { filename: f });
}

const $ = (expr) => vm.runInContext(expr, sandbox);
let ts = 0;
function step(n) {
  for (let i = 0; i < (n || 1); i++) { ts += 16.7; const cb = rafCb; rafCb = null; cb(ts); }
}

const outDir = path.join(__dirname, 'shots');
fs.mkdirSync(outDir, { recursive: true });
function snap(name) {
  fs.writeFileSync(path.join(outDir, name + '.png'), cnv.toBuffer('image/png'));
  console.log('  wrote ' + name + '.png');
}

// seed a mid-game save so scenes have content
$('HM.modal = null');
$(`(function(){
  const S = HM.G.save;
  S.cash = 12450; S.heat = 62;
  S.records.earned = 48000; S.records.bestSale = 2100; S.records.bestCombo = 7;
  S.records.days = 11; S.records.cooks = 9; S.records.booms = 1; S.records.raids = 1; S.records.cleanStreak = 3;
  S.rank = 2;
  S.inv = { shine: 8, opium: 14, heroin: 2, meth: 5, kgRaw: 1, coke: 3 };
  S.biz.still = { lvl: 2, t0: Date.now() - 50000, stored: 4 };
  S.biz.poppy.plots = [
    { st: 'ready', t0: 0 }, { st: 'grow', t0: Date.now() - 60000 }, { st: 'empty', t0: 0 },
  ];
  S.biz.lab = { lvl: 1, job: { t0: Date.now() - 80000, dur: 150000, n: 1, q: 1.1 }, up: {} };
  S.biz.meth = { lvl: 1, up: {} };
  S.biz.coke = { lvl: 1, up: {} };
  S.biz.lodge.lvl = 1;
  S.biz.lodge.lastTick = Date.now() - 120000;
  S.biz.lodge.girls = [
    Object.assign(lodgeCandidate(11), { mood: 84 }),
    Object.assign(lodgeCandidate(22), { mood: 41 }),
  ];
})()`);

const shots = [
  ['title', 'title', null],
  ['island', 'island', null],
  ['market', 'market', null],
  ['biz_lodge', 'lodge', null],
  ['biz_still', 'still', null],
  ['biz_farm', 'farm', null],
  ['harvest', 'harvest', { plot: 0 }],
  ['methcook', 'methcook', null],
  ['run', 'run', { keys: 3 }],
  ['raid', 'raid', null],
];
for (const [scene, name, args] of shots) {
  vm.runInContext('HM.modal = null; HM.setScene(' + JSON.stringify(scene) + (args ? ',' + JSON.stringify(args) : '') + ')', sandbox);
  if (scene === 'methcook' || scene === 'harvest' || scene === 'run') $("HM.Keys.pressed.act = true"); // start minigames
  step(scene === 'raid' ? 100 : 40); // settle animations / fade-in
  snap(name);
}
console.log('done');
