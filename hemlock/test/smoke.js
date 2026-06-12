'use strict';
// Headless smoke test for Hemlock Island. Stubs the DOM/canvas/audio, loads
// every game file into one vm context, then drives the economy directly via
// the HM.* action functions. Production timers are wall-clock timestamps, so
// tests rewind t0 fields instead of waiting.
//
//   node hemlock/test/smoke.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function ok(cond, name) {
  if (cond) console.log('  PASS  ' + name);
  else { failures++; console.error('  FAIL  ' + name); }
}

// ---------- DOM / canvas stubs ----------
const store = {};   // localStorage backing
const gradStub = { addColorStop() {} };
function makeCtx() {
  const c = {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt',
    globalAlpha: 1, font: '', textAlign: 'left', textBaseline: 'alphabetic',
    shadowColor: '', shadowBlur: 0, shadowOffsetY: 0, letterSpacing: '0px',
    fillRect() {}, strokeRect() {}, clearRect() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    fill() {}, stroke() {}, clip() {},
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    fillText() {}, strokeText() {},
    measureText(s) { return { width: String(s).length * 8 }; },
    createLinearGradient() { return gradStub; },
    createRadialGradient() { return gradStub; },
  };
  return c;
}
const ctx2d = makeCtx();
const canvas = {
  width: 1280, height: 720,
  style: {},
  getContext() { return ctx2d; },
  addEventListener() {},
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
};
ctx2d.canvas = canvas;

let rafCb = null;
const sandbox = {
  console,
  Math, Date, JSON, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN,
  navigator: {},
  localStorage: {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
  },
  document: {
    getElementById() { return canvas; },
    addEventListener() {},
    hidden: false,
    body: { style: {}, classList: { add() {}, contains() { return false; } } },
  },
  requestAnimationFrame(cb) { rafCb = cb; },
  performance: { now: () => Date.now() },
};
sandbox.window = sandbox;
sandbox.window.innerWidth = 1280;
sandbox.window.innerHeight = 720;
sandbox.window.devicePixelRatio = 1;
sandbox.window.addEventListener = () => {};
vm.createContext(sandbox);

// ---------- load the game ----------
const root = path.join(__dirname, '..');
const files = ['util.js', 'audio.js', 'gfx.js', 'ui.js', 'data.js', 'save.js',
  'scene_title.js', 'scene_island.js', 'scene_biz.js', 'scene_minigames.js',
  'scene_market.js', 'scene_run.js', 'scene_heat.js', 'main.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(root, 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}
console.log('loaded ' + files.length + ' files');

const $ = (expr) => vm.runInContext(expr, sandbox);

// frame stepper
let ts = 0;
function step(n) {
  for (let i = 0; i < (n || 1); i++) {
    ts += 16.7;
    const cb = rafCb; rafCb = null;
    cb(ts);
  }
}

// ---------- boot ----------
ok($('HM.G.sceneName') === 'title', 'boots to title');
step(5);
ok($('HM.G.t') > 0, 'loop advances');

$('HM.modal = null'); // dismiss any offline modal
$("HM.setScene('island')");
step(5);
ok($('HM.G.sceneName') === 'island', 'island hub runs');

// ---------- moonshine ----------
$('HM.G.save.cash = 100000');
ok($('HM.buyStillTier()') === true, 'still built');
ok($('HM.G.save.biz.still.lvl') === 1, 'still lvl 1');
$('HM.G.save.biz.still.t0 = Date.now() - 10*60*1000'); // rewind 10 min
const jugs = $('HM.collectStill()');
ok(jugs === 6, 'still capped at 6 jugs after 10 min (got ' + jugs + ')');
ok($('HM.G.save.inv.shine') === 6, 'shine in inventory');

const cashBefore = $('HM.G.save.cash');
const heatBefore = $('HM.G.save.heat');
const sale = $("HM.sellTo('barfly','shine',6)");
ok(sale && sale.qty === 6, 'sold 6 jugs to Pete');
ok($('HM.G.save.cash') > cashBefore, 'cash went up');
ok($('HM.G.save.heat') >= heatBefore, 'heat ticked');
ok(JSON.parse(store['hemlock.v1']).records.earned > 0, 'sale persisted to hemlock.v1');

// ---------- poppy / heroin chain ----------
ok($('HM.buyPlot()') === true, 'plot cleared');
ok($('HM.plantPlot(0)') === true, 'plot planted');
ok($('HM.G.save.biz.poppy.plots[0].st') === 'grow', 'plot growing');
$('HM.G.save.biz.poppy.plots[0].t0 = Date.now() - 200*1000'); // past 180s grow
step(2); // econTick flips it
ok($('HM.G.save.biz.poppy.plots[0].st') === 'ready', 'plot ready after rewind');
const gum = $('HM.harvestPayout(0,{good:4,perfect:5,bestCombo:6})');
ok(gum >= 14, 'harvest yield with combo (got ' + gum + ')');
ok($('HM.G.save.inv.opium') === gum, 'gum banked');
ok($('HM.G.save.records.bestCombo') === 6, 'combo record tracked');

$('HM.G.save.inv.opium = 10');
ok($('HM.buyLab()') === true, 'lab built');
ok($('HM.startLabJob(1.1)') === true, 'cook started');
ok($('HM.G.save.inv.opium') === 0, 'cook consumed 10 oz');
ok($('HM.collectLab()') === 0, 'cannot collect early');
$('HM.G.save.biz.lab.job.t0 = Date.now() - 200*1000');
ok($('HM.collectLab()') === 1, 'batch collected after rewind');
ok($('HM.G.save.inv.heroin') === 1, 'heroin in inventory');

// quality floor with CLEAN GEAR
$('HM.G.save.biz.lab.up.gear = true');
$('HM.G.save.inv.opium = 10');
$('HM.startLabJob(0.5)');
ok($('HM.G.save.biz.lab.job.q') >= 0.8, 'clean gear floors quality at 80%');
$('HM.G.save.biz.lab.job = null');

// ---------- meth ----------
$('HM.G.save.records.earned = 100');
ok($('HM.buyMeth()') === false, 'camper gated until $500 earned');
$('HM.G.save.records.earned = 600');
ok($('HM.buyMeth()') === true, 'camper bought');
const bags = $('HM.methPayout(0.95, false)');
ok(bags === 5, 'pure batch pays 4+1 bags (got ' + bags + ')');
const heatPre = $('HM.G.save.heat');
const boom = $('HM.methPayout(0, true)');
ok(boom === 0 && $('HM.G.save.heat') > heatPre, 'explosion: no bags, heat up');
ok($('HM.G.save.records.booms') === 1, 'boom recorded');

// ---------- coke ----------
ok($('HM.buyCoke()') === true, 'mainland contact bought');
$('HM.G.save.inv.kgRaw = 2');
const units = $('HM.cutPayout(2, 0, true)');
ok(units === Math.round(8 * 1.6), 'sweet-spot cut yields 13 units (got ' + units + ')');
ok($('HM.G.save.inv.kgRaw') === 0, 'raw consumed');

// ---------- lodge ----------
$('HM.G.save.cash = 100000');
ok($('HM.buyLodge()') === true, 'lodge open');
ok($('HM.hireGirl(lodgeCandidate(123))') === true, 'hired a girl');
ok($('lodgeCandidate(123).name') === $('lodgeCandidate(123).name'), 'candidates deterministic by seed');
$('HM.G.save.biz.lodge.lastTick = Date.now() - 10*60*1000');
const lodgeCash = $('HM.collectLodge()');
ok(lodgeCash > 0, 'lodge income accrued offline-style (got $' + lodgeCash + ')');
const cap0 = $('HM.G.save.biz.lodge.girls.length');
$('HM.hireGirl(lodgeCandidate(5)); HM.hireGirl(lodgeCandidate(6)); HM.hireGirl(lodgeCandidate(7)); HM.hireGirl(lodgeCandidate(8))');
ok($('HM.G.save.biz.lodge.girls.length') === 3, 'roster capped at 3 without second wing');

// ---------- heat / raid math ----------
$('HM.G.save.cash = 1000; HM.G.save.stash = 2; HM.G.save.lawyer = 1; HM.G.save.inv.shine = 10');
const losses = $('raidLosses(HM.G.save)');
ok(losses.cashLost === 350, 'lawyer keeps 65% of cash (lost ' + losses.cashLost + ')');
ok(losses.invLost.shine === 5, 'buried drums protect 50% of product');

$('HM.G.save.heat = 0; HM.addHeat(30)');
ok($('HM.G.save.heat') > 0 && $('HM.G.save.heat') <= 60, 'addHeat applies (event multiplier allowed)');
$('HM.G.save.heat = 120; HM.addHeat(0)');
ok($('HM.G.save.heat') <= 100, 'heat clamped to 100');

// bribe / lay low
$('HM.G.save.cash = 50000; HM.G.save.heat = 80; HM.G.save.bribes = 0');
ok($('HM.bribe()') === true && $('HM.G.save.heat') === 50, 'bribe -30 heat');
ok($('HM.layLow()') === true, 'lay low starts');
ok($("HM.sellTo('barfly','shine',1)") === null, 'sales blocked while laying low');
$('HM.G.save.layLowUntil = 0');

// ---------- daily market determinism ----------
const m1 = $("JSON.stringify(dailyMarket('2026-06-12').prices)");
const m2 = $("JSON.stringify(dailyMarket('2026-06-12').prices)");
const m3 = $("JSON.stringify(dailyMarket('2026-06-13').prices)");
ok(m1 === m2, 'same date, same prices');
ok(m1 !== m3, 'different date, different prices');

// ---------- offline gains ----------
const og = $(`(function(){
  const s = defaultSave();
  s.biz.still.lvl = 1; s.biz.still.t0 = Date.now() - 10*60*1000;
  s.biz.lodge.lvl = 1; s.biz.lodge.lastTick = Date.now() - 60*60*1000;
  s.biz.lodge.girls = [{ name:'X', rate: 10, mood: 100, face: {} }];
  s.lastSeen = Date.now() - 60*60*1000;
  return offlineGains(s, Date.now());
})()`);
ok(og && og.jugs === 6, 'offline: still jugs capped at storage');
ok(og && og.lodge >= 590 && og.lodge <= 610, 'offline: lodge ~$600/hr at $10/min (got ' + (og && og.lodge) + ')');

// ---------- every scene survives enter + 3 frames ----------
$('HM.G.save.biz.poppy.plots[0] = { st: "ready", t0: 0 }');
$('HM.G.save.inv.kgRaw = 1');
const scenes = [
  ['title', null], ['island', null], ['biz_still', null], ['biz_farm', null],
  ['biz_lab', null], ['biz_meth', null], ['biz_lodge', null], ['biz_dock', null],
  ['biz_hideout', null], ['stats', null], ['market', null],
  ['harvest', { plot: 0 }], ['cook', null], ['methcook', null], ['cut', null],
  ['run', { keys: 2 }], ['inspect', { back: 'island' }], ['raid', null],
];
for (const [name, args] of scenes) {
  try {
    vm.runInContext('HM.setScene(' + JSON.stringify(name) + (args ? ',' + JSON.stringify(args) : '') + ')', sandbox);
    step(3);
    ok(true, 'scene ' + name + ' runs');
  } catch (e) {
    ok(false, 'scene ' + name + ' crashed: ' + e.message);
  }
}

// ---------- random input soak ----------
$('HM.modal = null');
$("HM.setScene('island')");
try {
  for (let i = 0; i < 400; i++) {
    vm.runInContext(`
      HM.mouse.x = Math.random() * 1280;
      HM.mouse.y = Math.random() * 720;
      HM.mouse.down = Math.random() < 0.3;
      HM.mouse.pressed = Math.random() < 0.2;
      HM.mouse.released = Math.random() < 0.2;
      HM.Keys.pressed[['act','ok','back','up','down','left','right'][Math.floor(Math.random()*7)]] = true;
    `, sandbox);
    step(1);
    // random clicks navigate anywhere; whatever scene we land in must hold up
  }
  ok(true, '400-frame random input soak');
} catch (e) {
  ok(false, 'soak crashed in scene ' + $('HM.G.sceneName') + ': ' + e.message);
}

// ---------- isolation guard ----------
ok(Object.keys(store).every(k => !k.startsWith('reelTrouble')), 'no reelTrouble.* keys touched');
ok(!!store['hemlock.v1'], 'hemlock.v1 saved');

// ---------- verdict ----------
if (failures) { console.error('\n' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('\nALL SMOKE TESTS PASSED');
