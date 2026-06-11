'use strict';
const W = 320, H = 224;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');

// ---------- global game state ----------
const G = {
  save: loadSave(),
  daily: dailyReport(),
  trip: null,        // live trip state, null at the dock
  scene: null,
  sceneName: '',
  t: 0,              // global seconds, for animation
  lake: 0,           // selected lake index
  toast: null,       // { txt, t, col }
  earl: { t: rnd(10, 20), txt: null, ttl: 0, offer: false, offerT: 0 },
};
RT.G = G;

// ---------- canvas scaling ----------
function fit() {
  // On touch devices reserve room for the on-screen controls (portrait puts
  // them below the canvas; landscape overlays the corners) and allow
  // fractional scale so the game fills small phone screens.
  const touch = document.body && document.body.classList && document.body.classList.contains('touch');
  const portrait = window.innerHeight > window.innerWidth;
  const reserve = touch ? (portrait ? 165 : 12) : 30;
  let s = Math.min(window.innerWidth / W, (window.innerHeight - reserve) / H);
  s = s >= 2 ? Math.floor(s) : Math.max(0.75, s);
  cvs.style.width = (W * s) + 'px';
  cvs.style.height = (H * s) + 'px';
}
window.addEventListener('resize', fit);
fit();

// ---------- input ----------
const Keys = { held: {}, pressed: {} };
RT.Keys = Keys;
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'lay', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right', Space: 'act', Enter: 'ok', Escape: 'back',
  KeyB: 'beer', KeyH: 'hold', KeyY: 'yes', KeyN: 'no', KeyM: 'mute',
};
// Down-arrow doubles as 'down'; S is "lay low" but also menu-down for comfort.
window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  SFX.unlock();
  if (!Keys.held[k]) Keys.pressed[k] = true;
  Keys.held[k] = true;
  if (e.code === 'ArrowDown') { if (!Keys.held.down) Keys.pressed.down = true; Keys.held.down = true; }
  if (e.code === 'KeyS') { if (!Keys.held.down) Keys.pressed.down = true; Keys.held.down = true; }
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  Keys.held[k] = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') Keys.held.down = false;
});

function pressed(k) { return !!Keys.pressed[k]; }
function held(k) { return !!Keys.held[k]; }

// ---------- scene manager ----------
function setScene(name, args) {
  G.sceneName = name;
  G.scene = RT.scenes[name];
  if (G.scene.enter) G.scene.enter(args || {});
}
RT.setScene = setScene;

// ---------- trip lifecycle ----------
function newTrip(lakeIdx) {
  const lake = LAKES[lakeIdx];
  G.trip = {
    lake: lakeIdx,
    timeMin: TRIP_START,
    buzz: 0, maxBuzz: 0,
    cans: CANS_PER_TRIP,
    drinking: 0,         // seconds left in sip animation
    cooler: [],          // { id, name, w, val, buzz }
    nearMisses: 0,
    holdUsed: false,
    lastCallShown: false,
    over: false,
  };
  return G.trip;
}
RT.newTrip = newTrip;

function coolerCap() { return BOATS[G.save.boat].cooler; }
function coolerVal() { return G.trip ? G.trip.cooler.reduce((s, f) => s + f.val, 0) : 0; }
function buzzMult(b) { return 1 + b * 0.15; }
// 0..1 hand-shake factor: buzz scaled by how smooth your beer brand is.
function shakeAmt() { return G.trip ? (G.trip.buzz / 10) * BEERS[G.save.beer].shake : 0; }
RT.buzzMult = buzzMult; RT.shakeAmt = shakeAmt; RT.coolerCap = coolerCap; RT.coolerVal = coolerVal;

function drink(free) {
  const T = G.trip;
  if (!T || T.drinking > 0) return false;
  if (!free) {
    if (T.cans <= 0) { toast('OUT OF BEER!', '#f88'); SFX.deny(); return false; }
    T.cans--;
  }
  T.drinking = 1.3;
  T.buzz = Math.min(10, T.buzz + BEERS[G.save.beer].buzz);
  T.maxBuzz = Math.max(T.maxBuzz, T.buzz);
  SFX.beer();
  setTimeout(() => SFX.gulp(), 350);
  return true;
}
RT.drink = drink;

// Advance the trip clock; returns true when sundown ends the trip.
function tripTick(dt) {
  const T = G.trip;
  if (!T || T.over) return false;
  T.timeMin += dt;                       // 1 game-minute per real second
  T.buzz = Math.max(0, T.buzz - 0.055 * dt);
  if (T.drinking > 0) T.drinking -= dt;
  if (!T.lastCallShown && T.timeMin >= LAST_CALL) {
    T.lastCallShown = true;
    toast('LAST CALL! SUN IS GOING DOWN', '#ffd040');
    SFX.horn();
  }
  if (T.timeMin >= TRIP_END) { T.over = true; return true; }
  return false;
}
RT.tripTick = tripTick;

function endTrip(busted) {
  const T = G.trip, R = G.save.records;
  R.trips++;
  if (busted) {
    R.busts++;
    R.streak = 0;
  } else {
    const total = Math.round(coolerVal());
    G.save.cash += total;
    R.haul = Math.max(R.haul, total);
    R.buzz = Math.max(R.buzz, T.maxBuzz);
    R.streak++;
    R.bestStreak = Math.max(R.bestStreak, R.streak);
    if (total > 0) {
      // leaderboard: best single-trip haul, one slot per name
      const name = G.save.name || 'ANON';
      const b = G.save.board;
      const e = b.find(x => x.name === name);
      if (e) e.score = Math.max(e.score, total);
      else b.push({ name, score: total });
      b.sort((a, z) => z.score - a.score);
      G.save.board = b.slice(0, 8);
    }
  }
  persist();
}
RT.endTrip = endTrip;

// ---------- toasts ----------
function toast(txt, col) { G.toast = { txt, t: 2.6, col: col || '#fff' }; }
RT.toast = toast;

// ---------- Earl, the drunk AI buddy ----------
function earlSay(txt, ttl) {
  G.earl.txt = txt;
  G.earl.ttl = ttl || 4;
  G.earl.offer = false;
}
RT.earlSay = earlSay;

function earlUpdate(dt) {
  const E = G.earl;
  if (E.ttl > 0) {
    E.ttl -= dt;
    if (E.offer) {
      E.offerT -= dt;
      if (pressed('yes')) {
        E.offer = false; E.ttl = 0;
        if (drink(true)) earlSay("EARL: ATTA BOY! IT'S FREE IF YOU DON'T REMEMBER IT.", 3.5);
      } else if (pressed('no') || E.offerT <= 0) {
        E.offer = false; E.ttl = 0;
        earlSay('EARL: MORE FOR ME THEN.', 2.5);
      }
    }
    if (E.ttl <= 0) E.txt = null;
    return;
  }
  E.t -= dt;
  if (E.t <= 0) {
    E.t = rnd(16, 32);
    if (G.trip && Math.random() < 0.3 && G.trip.drinking <= 0) {
      E.txt = EARL_OFFER; E.ttl = 8; E.offer = true; E.offerT = 8;
    } else {
      earlSay(pick(EARL_LINES), 4.5);
    }
  }
}
RT.earlUpdate = earlUpdate;

function earlDraw() {
  const E = G.earl;
  if (!E.txt) return;
  const w = Math.min(300, textW(E.txt) + 10);
  panel(ctx, Math.round(W / 2 - w / 2), H - 60, w, 13);
  textC(ctx, E.txt, W / 2, H - 56, E.offer ? '#ffe080' : '#cfe8e8');
}
RT.earlDraw = earlDraw;

// ---------- shared HUD bits ----------
function panel(c, x, y, w, h) {
  c.fillStyle = '#101820'; c.fillRect(x, y, w, h);
  c.fillStyle = '#3a5a60'; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1);
  c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
}
RT.panel = panel;

function drawClock(x, y) {
  const T = G.trip;
  const cl = fmtClock(T ? T.timeMin : TRIP_START);
  text(ctx, 'TIME', x, y, '#fff');
  text(ctx, cl.ap, x, y + 6, '#ffd040');
  text(ctx, cl.h + ':' + pad2(cl.m), x + 14, y + 5, '#fff', 2);
}
RT.drawClock = drawClock;

function drawWind(x, y) {
  text(ctx, 'WIND', x, y, '#fff');
  panel(ctx, x, y + 6, 14, 14);
  const d = G.daily.windDir, s = G.daily.windSpd;
  const cx = x + 7, cy = y + 13;
  if (s === 0) { text(ctx, '-', cx - 1, cy - 2, '#9fd'); return; }
  ctx.strokeStyle = '#9fd'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(d) * 4, cy - Math.sin(d) * 4);
  ctx.lineTo(cx + Math.cos(d) * 4, cy + Math.sin(d) * 4);
  ctx.stroke();
  ctx.fillStyle = '#9fd';
  ctx.fillRect(Math.round(cx + Math.cos(d) * 4) - 1, Math.round(cy + Math.sin(d) * 4) - 1, 2, 2);
}
RT.drawWind = drawWind;

// Buzz thermometer, riffing on the temperature gauge in old fishing games.
function drawBuzz(x, y) {
  const T = G.trip; if (!T) return;
  const pct = T.buzz / 10;
  // bulb + stem
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y, 3, 14);
  ctx.fillStyle = '#301818'; ctx.fillRect(x + 2, y + 1, 1, 12);
  const fillH = Math.round(12 * pct);
  ctx.fillStyle = T.buzz > BUZZ_LIMIT ? '#f03030' : '#f0a030';
  if (fillH > 0) ctx.fillRect(x + 2, y + 13 - fillH, 1, fillH);
  ctx.fillStyle = '#f03030'; ctx.fillRect(x, y + 13, 5, 4); // bulb
  text(ctx, Math.round(T.buzz * 10) / 10 + '', x + 8, y + 2, T.buzz > BUZZ_LIMIT ? '#f66' : '#fff', 2);
  text(ctx, 'BUZZ', x + 8, y + 13, '#ffd040');
  if (T.buzz > BUZZ_LIMIT && Math.floor(G.t * 2) % 2 === 0) textS(ctx, 'OVER LIMIT', x - 24, y + 23, '#f44');
}
RT.drawBuzz = drawBuzz;

function drawWeatherIcon(x, y) {
  panel(ctx, x, y, 16, 16);
  const id = G.daily.weather.id;
  if (id === 'CLEAR') {
    ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 5, y + 5, 6, 6);
    ctx.fillRect(x + 7, y + 2, 2, 2); ctx.fillRect(x + 7, y + 12, 2, 2);
    ctx.fillRect(x + 2, y + 7, 2, 2); ctx.fillRect(x + 12, y + 7, 2, 2);
  } else if (id === 'OVERCAST') {
    ctx.fillStyle = '#aab8c0'; ctx.fillRect(x + 3, y + 6, 10, 4); ctx.fillRect(x + 5, y + 4, 6, 2);
  } else if (id === 'BREEZY') {
    ctx.fillStyle = '#9fd';
    ctx.fillRect(x + 3, y + 5, 9, 1); ctx.fillRect(x + 5, y + 8, 9, 1); ctx.fillRect(x + 3, y + 11, 7, 1);
  } else { // FOG
    ctx.fillStyle = '#cfd8d8';
    ctx.fillRect(x + 2, y + 4, 12, 2); ctx.fillRect(x + 2, y + 8, 12, 2); ctx.fillRect(x + 2, y + 12, 12, 2);
  }
}
RT.drawWeatherIcon = drawWeatherIcon;

function drawCooler(x, y) {
  const T = G.trip; if (!T) return;
  // cooler box
  ctx.fillStyle = '#d04030'; ctx.fillRect(x, y + 2, 9, 6);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y + 1, 9, 2);
  text(ctx, T.cooler.length + '/' + coolerCap(), x + 12, y + 2, T.cooler.length >= coolerCap() ? '#f66' : '#fff');
  // beer can
  ctx.fillStyle = '#f0c020'; ctx.fillRect(x + 38, y + 1, 5, 7);
  ctx.fillStyle = '#c0c8d0'; ctx.fillRect(x + 38, y + 1, 5, 1); ctx.fillRect(x + 38, y + 7, 5, 1);
  text(ctx, 'X' + T.cans, x + 46, y + 2, T.cans === 0 ? '#f66' : '#fff');
  const v = Math.round(coolerVal());
  if (v > 0) text(ctx, money(v), x + 68, y + 2, '#8f8');
}
RT.drawCooler = drawCooler;

function toastDraw() {
  if (!G.toast) return;
  G.toast.t -= 1 / 60;
  if (G.toast.t <= 0) { G.toast = null; return; }
  if (G.toast.t > 2.2 && Math.floor(G.t * 8) % 2 === 0) return; // flash in
  textCS(ctx, G.toast.txt, W / 2, 30, G.toast.col, 1);
}

// Dusk: 0 at start, 1 at sundown. Used to tint water/sky.
function duskK() {
  const T = G.trip;
  if (!T) return 0;
  return clamp((T.timeMin - 18 * 60) / (TRIP_END - 18 * 60), 0, 1);
}
RT.duskK = duskK;

// ---------- main loop ----------
let last = 0, acc = 0;
const STEP = 1 / 60;
function frame(ts) {
  if (!last) last = ts;
  let dt = (ts - last) / 1000;
  last = ts;
  if (dt > 0.1) dt = 0.1;
  acc += dt;
  while (acc >= STEP) {
    if (pressed('mute')) toast(SFX.toggleMute() ? 'MUTED' : 'SOUND ON', '#9fd');
    G.t += STEP;
    G.scene.update(STEP);
    Keys.pressed = {};
    acc -= STEP;
  }
  G.scene.draw();
  toastDraw();
  requestAnimationFrame(frame);
}

setScene('title');
requestAnimationFrame(frame);
