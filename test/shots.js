'use strict';
// Renders PNG screenshots of the main scenes with node-canvas.
// Requires: npm install canvas   (dev-only; the game itself has zero deps)
// Run: node test/shots.js [outDir]

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const outDir = process.argv[2] || path.join(__dirname, 'shots');
fs.mkdirSync(outDir, { recursive: true });

const cvs = createCanvas(320, 224);
cvs.style = {};
const listeners = {};
const noop = () => {};

global.window = global;
global.document = { getElementById: () => cvs };
global.addEventListener = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
global.innerWidth = 1280; global.innerHeight = 800;
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};
global.AudioContext = function () {
  this.state = 'running'; this.currentTime = 0; this.sampleRate = 22050; this.destination = {};
  this.resume = noop;
  const node = () => ({
    connect: noop, start: noop, stop: noop, type: '',
    frequency: { setValueAtTime: noop, exponentialRampToValueAtTime: noop },
    gain: { setValueAtTime: noop, exponentialRampToValueAtTime: noop },
    buffer: null,
  });
  this.createOscillator = node; this.createGain = node; this.createBufferSource = node;
  this.createBuffer = () => ({ getChannelData: () => new Float32Array(8) });
};
let rafCb = null;
global.requestAnimationFrame = (fn) => { rafCb = fn; return 1; };

const root = path.join(__dirname, '..');
const files = ['util.js', 'font.js', 'audio.js', 'data.js', 'save.js',
  'scene_menu.js', 'scene_boat.js', 'scene_fish.js', 'main.js'];
let src = '';
for (const f of files) src += fs.readFileSync(path.join(root, 'js', f), 'utf8') + '\n;\n';
src += '\nglobalThis.__X = { RT, FISH };\n';
(0, eval)(src);
const { RT, FISH } = global.__X;
const G = RT.G;

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
function snap(name) {
  const big = createCanvas(960, 672);
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(cvs, 0, 0, 960, 672);
  fs.writeFileSync(path.join(outDir, name + '.png'), big.toBuffer('image/png'));
  console.log('wrote', name + '.png');
}

step(3);
snap('1-title');

key('Enter');
step(3);
snap('2-dock');

// out on the water with a buzz, near a hot spot, patrol around
G.save.lakes = 3; G.lake = 1;
RT.newTrip(1);
RT.setScene('boat', { fresh: true });
const Wd = G.trip.world, B = Wd.boat;
G.trip.buzz = 5.2; G.trip.maxBuzz = 5.2;
const hot = Wd.spots.find(s => s.isHot) || Wd.spots[0];
B.x = hot.x + 40; B.y = hot.y + 30;
if (Wd.patrols[0]) { Wd.patrols[0].x = B.x + 90; Wd.patrols[0].y = B.y + 40; }
G.trip.susp = 55;
key('ArrowUp', 20);
snap('3-boat');

// fishing: aim with a buzz on
RT.setScene('fish', { spot: hot });
G.trip.cooler.push({ id: 'walleye', name: 'WALLEYE', w: 4.2, val: 61, buzz: 5 });
step(20);
snap('4-fish-aim');

// power bar mid-cast
key('Space', 2);
step(14);
snap('5-fish-power');

// mid-fight with a pike on
const F = RT.scenes.fish;
F.mode = 'wait';
F.lure = { x: 200, y: 70, bob: 0 };
F.power = 0.7;
F.biteIn = 0.001;
step(2);
key('Space', 2);
F.mode = 'fight';
F.fish = { id: 'pike', f: FISH.pike, w: 11.3 };
F.startDist = 26; F.distM = 14; F.run = true; F.runDur = 1; F.tension = 64;
step(3);
snap('6-fish-fight');

// patrol sweep warning while fishing
F.mode = 'wait';
F.lure = { x: 180, y: 80, bob: 0 };
F.sweep.st = 'pass'; F.sweep.t = 2.5; F.sweep.dir = 1;
step(2);
snap('7-fish-patrol');

// breathalyzer, over the limit
G.trip.buzz = 6.5;
RT.setScene('breath', { from: 'boat' });
step(50);
snap('8-breathalyzer');

// weigh-in
G.trip.cooler.push(
  { id: 'largemouth', name: 'LARGEMOUTH BASS', w: 5.1, val: 88, buzz: 6 },
  { id: 'catfish', name: 'CHANNEL CAT', w: 9.9, val: 102, buzz: 7 },
);
RT.setScene('summary');
step(3);
snap('9-summary');

console.log('done ->', outDir);
