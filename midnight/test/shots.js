'use strict';
// PNG screenshots for visual review:  npm i canvas && node midnight/test/shots.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas } = require('canvas');

const cnv = createCanvas(720, 1558);
cnv.addEventListener = () => {};
cnv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 1558 });
cnv.style = {};

let rafCb = null;
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, parseInt, parseFloat,
  navigator: {},
  localStorage: { getItem() { return null; }, setItem() {} },
  document: { getElementById() { return cnv; }, addEventListener() {} },
  requestAnimationFrame(cb) { rafCb = cb; },
};
sandbox.window = sandbox;
sandbox.window.innerWidth = 390;
sandbox.window.innerHeight = 844;
sandbox.window.devicePixelRatio = 1;
sandbox.window.addEventListener = () => {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), sandbox, { filename: 'game.js' });

const $ = (e) => vm.runInContext(e, sandbox);
let ts = 0;
function step(n) { for (let i = 0; i < (n || 1); i++) { ts += 16.7; const cb = rafCb; rafCb = null; cb(ts); } }

const outDir = path.join(__dirname, 'shots');
fs.mkdirSync(outDir, { recursive: true });
function snap(name) {
  fs.writeFileSync(path.join(outDir, name + '.png'), cnv.toBuffer('image/png'));
  console.log('  wrote ' + name + '.png');
}

step(30);
snap('title');

// gameplay: stage a busy frame
$('MR.input.tapped = true');
step(1);
$(`(function(){
  const R = MR.G.run;
  R.cash = 1325; R.mult = 3; R.dist = 4200; R.graceT = 0; R.spotted = 0.55;
  R.ents.length = 0;
  const by = R.dist;
  R.ents.push({ kind: 'rock', x: 220, d: by + 700, r: 40 });
  R.ents.push({ kind: 'rock', x: 320, d: by + 780, r: 30 });
  R.ents.push({ kind: 'bale', x: 480, d: by + 420, bob: 0 });
  R.ents.push({ kind: 'bale', x: 480, d: by + 530, bob: 2 });
  R.ents.push({ kind: 'girl', x: 250, d: by + 1050, bob: 1 });
  R.ents.push({ kind: 'cop', x: 420, d: by + 880, vx: 0, a: Math.PI * 0.62, spin: 0, cone: 260 });
  R.nextSpawn = 1e12;
})()`);
step(3);
snap('play');

// death screen
$(`(function(){
  const R = MR.G.run;
  R.ents.length = 0;
  R.ents.push({ kind: 'rock', x: R.x, d: R.dist, r: 40 });
})()`);
step(40);
snap('dead');
console.log('done');
