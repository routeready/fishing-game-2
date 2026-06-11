'use strict';
// Headless smoke test: stubs the DOM/canvas/audio, boots the game,
// and drives a full trip — dock, boat, anchor, cast, hook, land,
// beer, breathalyzer, summary — asserting scene flow and no crashes.
// Run: node test/smoke.js

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ---- DOM stubs ----
const listeners = {};
const noop = () => {};
const ctx2d = new Proxy({}, {
  get(t, prop) {
    if (prop === 'measureText') return () => ({ width: 0 });
    if (prop === 'createLinearGradient') return () => ({ addColorStop: noop });
    if (typeof prop === 'string') return t[prop] !== undefined ? t[prop] : noop;
    return noop;
  },
  set(t, prop, v) { t[prop] = v; return true; },
});
const canvas = { width: 320, height: 224, style: {}, getContext: () => ctx2d };

global.window = global;
global.document = { getElementById: () => canvas };
global.addEventListener = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
global.removeEventListener = noop;
global.innerWidth = 1280; global.innerHeight = 800;
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
global.AudioContext = function () {
  this.state = 'running';
  this.currentTime = 0;
  this.sampleRate = 22050;
  this.destination = {};
  this.resume = noop;
  const node = () => ({
    connect: noop, start: noop, stop: noop, type: '', loop: false,
    frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop },
    Q: { value: 0 },
    gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop },
    buffer: null,
  });
  this.createOscillator = node;
  this.createBiquadFilter = node;
  this.createGain = node;
  this.createBufferSource = node;
  this.createBuffer = () => ({ getChannelData: () => new Float32Array(8) });
};

let rafCb = null;
global.requestAnimationFrame = (fn) => { rafCb = fn; return 1; };
global.performance = { now: () => 0 };

// ---- load game scripts in <script> order ----
const root = path.join(__dirname, '..');
const files = ['util.js', 'font.js', 'audio.js', 'data.js', 'save.js',
  'scene_menu.js', 'scene_boat.js', 'scene_fish.js', 'main.js'];
let src = '';
for (const f of files) src += fs.readFileSync(path.join(root, 'js', f), 'utf8') + '\n;\n';
// top-level consts in eval'd code stay scoped to the eval — export what the test needs
src += '\nglobalThis.__X = { RT, dist, TRIP_END };\n';
(0, eval)(src);

const { RT, dist, TRIP_END } = global.__X;
const G = RT.G;

// ---- frame driver ----
let now = 0;
function step(frames = 1) {
  for (let i = 0; i < frames; i++) {
    now += 1000 / 60;
    const cb = rafCb; rafCb = null;
    cb(now);
  }
}
function key(code, downFrames = 1) {
  for (const fn of listeners.keydown) fn({ code, preventDefault: noop });
  step(downFrames);
  for (const fn of listeners.keyup) fn({ code, preventDefault: noop });
  step(1);
}
function press(code) { key(code, 1); }

// ---- the run ----
step(2);
assert.strictEqual(G.sceneName, 'title', 'boots to title');

press('Enter');
assert.strictEqual(G.sceneName, 'dock', 'title -> dock');

press('Enter'); // SET OUT (Snoozy Pond, unlocked)
assert.strictEqual(G.sceneName, 'boat', 'dock -> boat');
assert.ok(G.trip && G.trip.world, 'trip + world created');

const B = G.trip.world.boat;
const x0 = B.x, y0 = B.y;
key('ArrowUp', 90);
assert.ok(dist(x0, y0, B.x, B.y) > 10, 'boat moves under throttle');

// crack a beer on the water
const buzz0 = G.trip.buzz;
press('KeyB');
assert.ok(G.trip.buzz > buzz0, 'beer raises buzz');

// park on a fishing spot and anchor
const spot = G.trip.world.spots[0];
B.x = spot.x; B.y = spot.y; B.v = 0;
press('Space');
assert.strictEqual(G.sceneName, 'fish', 'anchored into fish scene');
const F = RT.scenes.fish;

// cast: start power, lock power
press('Space');
assert.strictEqual(F.mode, 'power', 'aim -> power');
press('Space');
assert.strictEqual(F.mode, 'fly', 'power -> fly');
step(60);
assert.strictEqual(F.mode, 'wait', 'fly -> wait (lure landed)');

// force the bite and strike it
F.biteIn = 0.001;
step(2);
assert.ok(F.biteWin > 0, 'bite window opened');
press('Space');
assert.strictEqual(F.mode, 'fight', 'hooked up');
assert.ok(F.fish && F.fish.w > 0, 'fish generated');

// reel it in (cheat the distance down, then finish legit)
F.distM = 0.4;
F.tension = 58;
key('Space', 30);
assert.strictEqual(F.mode, 'card', 'fish landed -> card');
assert.strictEqual(G.trip.cooler.length, 1, 'fish in the cooler');
assert.ok(G.trip.cooler[0].val > 0, 'fish has value');
press('Enter');
assert.strictEqual(F.mode, 'aim', 'card -> aim');

// line snap path
press('Space'); press('Space'); step(60);
F.biteIn = 0.001; step(2); press('Space');
assert.strictEqual(F.mode, 'fight', 'second hookup');
F.tension = 100; F.snapAcc = 99;
step(5);
assert.strictEqual(F.mode, 'aim', 'snap loses the fish');

// pull anchor, head home via sundown
press('Escape');
assert.strictEqual(G.sceneName, 'boat', 'fish -> boat');
const cashBefore = G.save.cash;
G.trip.timeMin = TRIP_END - 0.01;
step(5);
assert.strictEqual(G.sceneName, 'summary', 'sundown -> summary');
press('Enter');
assert.strictEqual(G.sceneName, 'dock', 'summary -> dock');
assert.ok(G.save.cash > cashBefore, 'haul cashed in');
assert.strictEqual(G.save.records.streak, 1, 'streak counted');
assert.strictEqual(G.save.board.length, 1, 'haul chalked on leaderboard');
assert.strictEqual(G.save.board[0].name, 'ANON', 'no name entered -> ANON');
assert.strictEqual(G.save.board[0].score, G.save.records.haul, 'board keeps best haul');
assert.ok(store['reelTrouble.v1'], 'save persisted');

// breathalyzer: sober pass and hammered fail
RT.newTrip(0);
G.trip.world = null;
RT.setScene('boat', { fresh: true });
G.trip.buzz = 0;
RT.setScene('breath', { from: 'boat' });
const BR = RT.scenes.breath;
step(60);
for (let i = 0; i < 600 && Math.abs(BR.nx) > 1.5; i++) step(1); // wait for needle near center
press('Space');
assert.strictEqual(BR.done, 'pass', 'sober blow passes');
step(120);
assert.strictEqual(G.sceneName, 'boat', 'pass returns to boat');

G.trip.buzz = 9;
RT.setScene('breath', { from: 'boat' });
step(60);
for (let i = 0; i < 600 && Math.abs(BR.nx) < 25; i++) step(1); // wait for needle far off-center
press('Space');
assert.strictEqual(BR.done, 'fail', 'hammered blow fails');
step(120);
assert.strictEqual(G.sceneName, 'bust', 'fail -> busted');
press('Enter');
assert.strictEqual(G.sceneName, 'dock', 'bust -> dock');
assert.strictEqual(G.save.records.streak, 0, 'bust resets streak');
assert.strictEqual(G.save.records.busts, 1, 'bust recorded');

// menus render without crashing
for (const s of ['shop', 'trophy', 'board', 'ranks', 'report', 'lakes', 'title']) {
  RT.setScene(s);
  step(3);
  press('Escape');
}

// long-soak: random inputs across a whole trip, just checking for crashes
RT.setScene('dock');
RT.newTrip(0);
RT.setScene('boat', { fresh: true });
const codes = ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyB', 'KeyS', 'KeyH', 'Enter'];
for (let i = 0; i < 400; i++) {
  key(codes[i % codes.length], 1 + (i % 7));
  if (G.sceneName === 'dock' || G.sceneName === 'title') break;
}

console.log('SMOKE OK — all assertions passed');
