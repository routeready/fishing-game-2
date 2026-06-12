'use strict';
// Headless smoke test for Midnight Run:  node midnight/test/smoke.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function ok(cond, name) {
  if (cond) console.log('  PASS  ' + name);
  else { failures++; console.error('  FAIL  ' + name); }
}

const store = {};
const gradStub = { addColorStop() {} };
const ctx2d = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', globalAlpha: 1,
  font: '', textAlign: 'left', shadowColor: '', shadowBlur: 0,
  fillRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
  ellipse() {}, quadraticCurveTo() {}, fill() {}, stroke() {}, save() {}, restore() {},
  translate() {}, rotate() {}, scale() {}, setTransform() {}, fillText() {},
  createLinearGradient() { return gradStub; }, createRadialGradient() { return gradStub; },
};
const canvas = {
  width: 720, height: 1280, style: {},
  getContext() { return ctx2d; },
  addEventListener() {},
  getBoundingClientRect() { return { left: 0, top: 0, width: 720, height: 1280 }; },
};

let rafCb = null;
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, parseInt, parseFloat,
  navigator: {},
  localStorage: {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
  },
  document: { getElementById() { return canvas; }, addEventListener() {} },
  requestAnimationFrame(cb) { rafCb = cb; },
};
sandbox.window = sandbox;
sandbox.window.innerWidth = 390;
sandbox.window.innerHeight = 844;   // iPhone-ish portrait
sandbox.window.devicePixelRatio = 2;
sandbox.window.addEventListener = () => {};
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), sandbox, { filename: 'game.js' });
const $ = (e) => vm.runInContext(e, sandbox);

let ts = 0;
function step(n) {
  for (let i = 0; i < (n || 1); i++) { ts += 16.7; const cb = rafCb; rafCb = null; cb(ts); }
}

// boot
ok($('MR.G.mode') === 'title', 'boots to title');
ok($('MR.VH') >= 1200, 'portrait viewport derived from window aspect (VH=' + $('MR.VH') + ')');
step(5);
ok($('MR.G.t') > 0, 'loop advances');

// tap to start
$('MR.input.tapped = true');
step(1);
ok($('MR.G.mode') === 'play', 'tap starts a run');
step(120); // 2 seconds of cruising
ok($('MR.G.run.dist') > 0, 'boat moves');
ok($('MR.G.run.ents.length') > 0, 'world spawns entities');

// steering toward a thumb position
$('MR.input.x = 200');
const x0 = $('MR.G.run.x');
step(30);
ok($('MR.G.run.x') < x0, 'boat steers toward thumb');
$('MR.input.x = null');

// bale pickup pays mult * 25
$(`(function(){
  const R = MR.G.run;
  R.mult = 3; R.cash = 0; R.ents.length = 0; R.graceT = 0;
  R.ents.push({ kind: 'bale', x: R.x, d: R.dist, bob: 0 });
})()`);
step(2);
ok($('MR.G.run.cash') === 75, 'bale pays 25 x mult (got ' + $('MR.G.run.cash') + ')');

// girl raises mult, capped at 5
$(`(function(){
  const R = MR.G.run;
  R.mult = 5; R.ents.length = 0;
  R.ents.push({ kind: 'girl', x: R.x, d: R.dist, bob: 0 });
})()`);
step(2);
ok($('MR.G.run.mult') === 5, 'multiplier capped at 5');

// rock = sunk
$(`(function(){
  const R = MR.G.run;
  R.ents.length = 0;
  R.ents.push({ kind: 'rock', x: R.x, d: R.dist, r: 40 });
})()`);
step(2);
ok($('MR.G.mode') === 'dead' && $('MR.G.run.deadBy') === 'rock', 'rock sinks the run');
ok(!!store['midnightRun.v1'], 'score persisted');
ok(JSON.parse(store['midnightRun.v1']).best === 75, 'best haul saved (got ' + JSON.parse(store['midnightRun.v1']).best + ')');

// restart after cooldown
step(60);
$('MR.input.tapped = true');
step(1);
ok($('MR.G.mode') === 'play', 'tap restarts after death');

// spotlight: park a cop aimed straight at the boat -> busted
$(`(function(){
  const R = MR.G.run;
  R.graceT = 0; R.ents.length = 0; R.nextSpawn = 1e12;
  R.ents.push({ kind: 'cop', x: R.x, d: R.dist + 150, vx: 0, a: Math.PI / 2, spin: 0, cone: 400 });
})()`);
let frames = 0;
while ($('MR.G.mode') === 'play' && frames < 300) {
  // hold the cop glued to the boat's position/heading every frame
  $(`(function(){
    const R = MR.G.run;
    const e = R.ents[0];
    if (e) { e.x = R.x; e.d = R.dist + 150; e.a = Math.PI / 2; }
  })()`);
  step(1); frames++;
}
ok($('MR.G.mode') === 'dead' && $('MR.G.run.deadBy') === 'cops', 'spotlight bust after ~1.1s in the cone (' + frames + ' frames)');

// soak: random thumb input across restarts
let crashed = false;
try {
  for (let i = 0; i < 600; i++) {
    if (i % 7 === 0) $('MR.input.tapped = true');
    $('MR.input.x = Math.random() < 0.7 ? Math.random() * 720 : null');
    step(1);
  }
} catch (e) { crashed = true; console.error(e.message); }
ok(!crashed, '600-frame random input soak');

// isolation
ok(Object.keys(store).every(k => !k.startsWith('reelTrouble') && !k.startsWith('hemlock')), 'no fishing-game or hemlock keys touched');

if (failures) { console.error('\n' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('\nALL SMOKE TESTS PASSED');
