'use strict';
// MIDNIGHT RUN — one-thumb endless smuggling boat on a northern Ontario lake.
// Drag to steer. Grab the bales, pick up the girls, dodge the rocks and the
// OPP spotlights. Everything is canvas + WebAudio; no assets, no deps.

// ---------- virtual viewport (portrait, fills the screen) ----------
const VW = 720;
let VH = 1280;
const TAU = Math.PI * 2;

const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');

function fit() {
  const w = window.innerWidth, h = window.innerHeight;
  VH = Math.round(VW * Math.max(1.2, Math.min(2.3, h / w)));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const s = Math.min(w / VW, h / VH);
  cvs.style.width = Math.round(VW * s) + 'px';
  cvs.style.height = Math.round(VH * s) + 'px';
  cvs.width = Math.round(VW * s * dpr);
  cvs.height = Math.round(VH * s * dpr);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
}
window.addEventListener('resize', fit);
fit();

// ---------- tiny utils ----------
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
function money(n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function txt(c, s, x, y, size, weight, color, align, glow) {
  c.save();
  c.font = (weight || 700) + ' ' + size + 'px system-ui, sans-serif';
  c.textAlign = align || 'center';
  c.fillStyle = color;
  if (glow) { c.shadowColor = glow; c.shadowBlur = size * 0.6; }
  c.fillText(s, x, y);
  c.restore();
}

// ---------- audio (synth only) ----------
const SFX = (function () {
  let ac = null, muted = false;
  try { muted = localStorage.getItem('midnightRun.mute') === '1'; } catch (e) { /* private mode */ }
  function a() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f0, f1, dur, type, vol, when = 0) {
    const x = a(); if (!x || muted) return;
    const t = x.currentTime + when;
    const o = x.createOscillator(), g = x.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(x.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, when = 0) {
    const x = a(); if (!x || muted) return;
    const t = x.currentTime + when;
    const len = Math.max(1, Math.floor(dur * x.sampleRate));
    const buf = x.createBuffer(1, len, x.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = x.createBufferSource(); n.buffer = buf;
    const g = x.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(g); g.connect(x.destination);
    n.start(t);
  }
  return {
    unlock() { a(); },
    toggleMute() { muted = !muted; try { localStorage.setItem('midnightRun.mute', muted ? '1' : '0'); } catch (e) {} return muted; },
    cash() { tone(1318, 1318, 0.06, 'square', 0.08); tone(1760, 1760, 0.14, 'square', 0.09, 0.06); },
    girl() { [880, 1108, 1318].forEach((f, i) => tone(f, f, 0.09, 'triangle', 0.09, i * 0.06)); },
    radio() { tone(1200, 1150, 0.04, 'square', 0.05); tone(900, 950, 0.05, 'square', 0.05, 0.07); },
    siren() { tone(720, 980, 0.22, 'sine', 0.12); tone(980, 720, 0.22, 'sine', 0.12, 0.24); },
    crash() { tone(150, 40, 0.5, 'sawtooth', 0.2); hiss(0.5, 0.18); },
    splash() { hiss(0.3, 0.12); tone(300, 80, 0.25, 'sine', 0.1); },
    busted() { [392, 370, 349, 311].forEach((f, i) => tone(f, f, 0.22, 'sawtooth', 0.14, i * 0.18)); },
    best() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.13, 'square', 0.1, i * 0.09)); },
    tap() { tone(900, 1200, 0.05, 'triangle', 0.07); },
  };
})();

// ---------- save ----------
const SAVE_KEY = 'midnightRun.v1';
function loadBest() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { best: 0, runs: 0 }; }
  catch (e) { return { best: 0, runs: 0 }; }
}
function saveBest(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }

// ---------- input ----------
const input = { x: null, down: false, tapped: false, left: false, right: false };
function px(e) {
  const r = cvs.getBoundingClientRect();
  return (e.clientX - r.left) * VW / Math.max(1, r.width);
}
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); SFX.unlock();
  input.down = true; input.tapped = true; input.x = px(e);
});
cvs.addEventListener('pointermove', (e) => { if (input.down) input.x = px(e); });
window.addEventListener('pointerup', () => { input.down = false; input.x = null; });
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
  if (e.code === 'Space' || e.code === 'Enter') { input.tapped = true; SFX.unlock(); }
  if (e.code === 'KeyM') SFX.toggleMute();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
});

// ---------- game state ----------
const SHORE = 84;                       // water margin each side
const G = {
  mode: 'title',                        // title | play | dead
  t: 0,
  save: loadBest(),
  shake: 0, flash: 0, flashCol: '#fff',
  parts: [],                            // particles + floaters
  best: false,
  run: null,
};

function newRun() {
  G.run = {
    x: VW / 2, vx: 0,
    dist: 0, speed: 300,
    cash: 0, mult: 1,
    spotted: 0,                         // 0..1 caught meter
    nextSpawn: 400,
    ents: [],                           // {kind, x, d, ...} d = world distance
    deadBy: null,
    t: 0,
    graceT: 1.5,                        // spawn protection at start
  };
}

// ---------- particles ----------
function partBurst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), sp = rnd(60, speed || 320);
    G.parts.push({ kind: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, ttl: rnd(0.4, 0.9), r: rnd(3, 7), color: Array.isArray(color) ? pick(color) : color });
  }
}
function partFloat(s, x, y, color, size) {
  G.parts.push({ kind: 'txt', s, x, y, vy: -90, t: 0, ttl: 1.1, color, size: size || 30 });
}
function partWake(x, y) {
  G.parts.push({ kind: 'wake', x, y, t: 0, ttl: 0.8, r: rnd(6, 12) });
}
function partsTick(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.t += dt;
    if (p.t >= p.ttl) { G.parts.splice(i, 1); continue; }
    if (p.kind === 'dot') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
    if (p.kind === 'txt') { p.y += p.vy * dt; p.vy *= (1 - 1.5 * dt); }
    if (p.kind === 'wake') { p.r += 36 * dt; p.y += G.run ? G.run.speed * dt : 0; }
  }
}
function partsDraw(c) {
  for (const p of G.parts) {
    const k = 1 - p.t / p.ttl;
    c.save();
    c.globalAlpha = Math.min(1, k * 2);
    if (p.kind === 'dot') {
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.r * k, 0, TAU); c.fill();
    } else if (p.kind === 'txt') {
      txt(c, p.s, p.x, p.y, p.size, 900, p.color, 'center', p.color);
    } else {
      c.strokeStyle = 'rgba(190,220,255,' + (0.35 * k) + ')';
      c.lineWidth = 3;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.stroke();
    }
    c.restore();
  }
}

// ---------- spawning ----------
function diffK() { return clamp(G.run.dist / 9000, 0, 1); } // 0 early -> 1 late

function spawnWave() {
  const R = G.run;
  const d = R.dist + VH + 200;          // spawn just past the top of the screen
  const k = diffK();
  const roll = Math.random();
  if (roll < 0.30) {
    // rock cluster
    const n = 1 + Math.floor(rnd(0, 1.6 + k * 1.8));
    const cx = rnd(SHORE + 70, VW - SHORE - 70);
    for (let i = 0; i < n; i++) {
      R.ents.push({ kind: 'rock', x: clamp(cx + rnd(-130, 130), SHORE + 36, VW - SHORE - 36), d: d + rnd(0, 240), r: rnd(26, 44) });
    }
  } else if (roll < 0.30 + 0.26 + k * 0.12) {
    // patrol boat with sweeping spotlight
    R.ents.push({
      kind: 'cop', x: rnd(SHORE + 90, VW - SHORE - 90), d: d + 60,
      vx: pick([-1, 1]) * rnd(50, 90 + k * 70),
      a: rnd(0, TAU), spin: pick([-1, 1]) * rnd(0.55, 0.8 + k * 0.5),
      cone: rnd(230, 280) - k * 30,
    });
  } else if (roll < 0.92) {
    // bale of product (sometimes a line of them)
    const n = Math.random() < 0.35 ? 3 : 1;
    const bx = rnd(SHORE + 60, VW - SHORE - 60);
    for (let i = 0; i < n; i++) R.ents.push({ kind: 'bale', x: bx, d: d + i * 110, bob: rnd(0, TAU) });
  } else {
    // a girl on a dinghy, waving
    R.ents.push({ kind: 'girl', x: rnd(SHORE + 70, VW - SHORE - 70), d, bob: rnd(0, TAU) });
  }
  R.nextSpawn = d + rnd(190, 330) - k * 70;
}

// ---------- run update ----------
function bust(by) {
  const R = G.run;
  if (R.deadBy) return;
  R.deadBy = by;
  G.mode = 'dead';
  G.shake = 26; G.flash = 0.6; G.flashCol = by === 'rock' ? '#ffffff' : '#ff3030';
  if (by === 'rock') { SFX.crash(); SFX.splash(); partBurst(R.x, boatY(), ['#cfe0ff', '#8aa6cc', '#ffffff'], 30, 420); }
  else { SFX.siren(); SFX.busted(); }
  const score = Math.round(R.cash);
  G.save.runs++;
  G.best = score > G.save.best;
  if (G.best) { G.save.best = score; SFX.best(); }
  saveBest(G.save);
}

function boatY() { return VH * 0.78; }

function updatePlay(dt) {
  const R = G.run;
  R.t += dt;
  if (R.graceT > 0) R.graceT -= dt;

  // steer: thumb target or keys
  let steer = 0;
  if (input.left) steer -= 1;
  if (input.right) steer += 1;
  if (steer !== 0) {
    R.vx += steer * 2600 * dt;
  } else if (input.x !== null) {
    const dx = input.x - R.x;
    R.vx += clamp(dx * 14, -2600, 2600) * dt;
  }
  R.vx *= (1 - 5 * dt);
  R.x = clamp(R.x + R.vx * dt, SHORE + 26, VW - SHORE - 26);

  // scroll
  R.speed = 300 + diffK() * 280;
  R.dist += R.speed * dt;
  if (R.dist >= R.nextSpawn - VH) spawnWave();
  if (Math.random() < dt * 8) partWake(R.x + rnd(-10, 10), boatY() + 30);

  // entities
  const by = boatY();
  let inCone = false;
  for (let i = R.ents.length - 1; i >= 0; i--) {
    const e = R.ents[i];
    const ey = by - (e.d - R.dist);          // screen y
    if (ey > VH + 160) { R.ents.splice(i, 1); continue; }
    if (e.kind === 'cop') {
      e.x += e.vx * dt;
      if (e.x < SHORE + 60 || e.x > VW - SHORE - 60) e.vx *= -1;
      e.a += e.spin * dt;
      // cone test against boat
      const dx = R.x - e.x, dy = by - ey;
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < e.cone && R.graceT <= 0) {
        let ang = Math.atan2(dy, dx) - e.a;
        while (ang > Math.PI) ang -= TAU;
        while (ang < -Math.PI) ang += TAU;
        if (Math.abs(ang) < 0.34) inCone = true;
      }
    } else if (ey > -80 && Math.abs(ey - by) < 46 && Math.abs(e.x - R.x) < (e.kind === 'rock' ? e.r + 20 : 46)) {
      if (e.kind === 'rock') {
        if (R.graceT <= 0) return bust('rock');
      } else if (e.kind === 'bale') {
        const v = 25 * R.mult;
        R.cash += v;
        partFloat('+' + money(v), e.x, ey - 30, '#7dffa8');
        partBurst(e.x, ey, '#7dffa8', 8, 220);
        SFX.cash();
        R.ents.splice(i, 1);
      } else if (e.kind === 'girl') {
        R.mult = Math.min(5, R.mult + 1);
        partFloat('X' + R.mult + ' ABOARD!', e.x, ey - 30, '#ff7eb0', 34);
        partBurst(e.x, ey, ['#ff7eb0', '#ffd24a', '#fff'], 16, 300);
        SFX.girl();
        R.ents.splice(i, 1);
      }
    }
  }

  // spotted meter
  if (inCone) {
    R.spotted += dt / 1.1;
    if (Math.random() < dt * 4) SFX.radio();
    if (R.spotted >= 1) return bust('cops');
  } else {
    R.spotted = Math.max(0, R.spotted - dt * 0.7);
  }
}

// ---------- drawing ----------
function drawWater(c, scroll) {
  const g = c.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#0a1230');
  g.addColorStop(1, '#060b1c');
  c.fillStyle = g;
  c.fillRect(0, 0, VW, VH);
  // streaks
  c.save();
  for (let i = 0; i < 34; i++) {
    const y = ((i * 89 + scroll) % (VH + 60)) - 30;
    c.globalAlpha = 0.07 + 0.05 * Math.sin(G.t * 2 + i);
    c.fillStyle = '#4a6ab8';
    rrect(c, (i * 167) % VW, y, 54 + (i % 4) * 26, 4, 2);
    c.fill();
  }
  c.restore();
  // moon + path
  c.save();
  c.shadowColor = '#fff4d0'; c.shadowBlur = 40;
  c.fillStyle = '#f4ecd2';
  c.beginPath(); c.arc(VW * 0.8, 90, 30, 0, TAU); c.fill();
  c.shadowBlur = 0;
  c.globalAlpha = 0.07;
  for (let i = 0; i < 14; i++) {
    const y = 140 + i * (VH / 16);
    c.fillRect(VW * 0.8 - (30 - i) / 2 - 6, y, 36 - i, 5);
  }
  c.restore();
  // shores
  for (const side of [0, 1]) {
    const sx = side === 0 ? 0 : VW - SHORE;
    c.fillStyle = '#070d18';
    c.fillRect(sx, 0, SHORE, VH);
    c.fillStyle = '#0c1626';
    for (let i = 0; i < 12; i++) {
      const ty = ((i * 173 + scroll * 0.6) % (VH + 120)) - 60;
      const tx = side === 0 ? rndSeed(i + side * 31) * (SHORE - 30) : VW - SHORE + 14 + rndSeed(i + side * 31) * (SHORE - 30);
      pineShape(c, tx, ty, 34 + rndSeed(i * 7 + side) * 30);
    }
  }
}
const seedCache = {};
function rndSeed(i) { if (seedCache[i] === undefined) seedCache[i] = Math.random(); return seedCache[i]; }
function pineShape(c, x, baseY, h) {
  const w = h * 0.5;
  c.beginPath();
  c.moveTo(x, baseY - h);
  c.lineTo(x + w / 2, baseY);
  c.lineTo(x - w / 2, baseY);
  c.closePath();
  c.fill();
}

function drawEnts(c) {
  const R = G.run, by = boatY();
  for (const e of R.ents) {
    const ey = by - (e.d - R.dist);
    if (ey < -300 || ey > VH + 300) continue;
    if (e.kind === 'rock') {
      c.fillStyle = '#1f2c3d';
      c.beginPath(); c.ellipse(e.x, ey, e.r, e.r * 0.62, 0, 0, TAU); c.fill();
      c.fillStyle = '#2e4156';
      c.beginPath(); c.ellipse(e.x - e.r * 0.2, ey - e.r * 0.18, e.r * 0.5, e.r * 0.3, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(190,220,255,0.16)'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(e.x, ey, e.r + 8, (e.r + 8) * 0.62, 0, 0, TAU); c.stroke();
    } else if (e.kind === 'bale') {
      const bob = Math.sin(G.t * 2.4 + e.bob) * 4;
      c.save();
      c.translate(e.x, ey + bob);
      c.rotate(Math.sin(G.t * 1.4 + e.bob) * 0.12);
      c.shadowColor = '#7dffa8'; c.shadowBlur = 18;
      c.fillStyle = '#caa56a';
      rrect(c, -24, -18, 48, 36, 8); c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = '#7a5c30'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-24, 0); c.lineTo(24, 0); c.moveTo(0, -18); c.lineTo(0, 18); c.stroke();
      c.restore();
    } else if (e.kind === 'girl') {
      const bob = Math.sin(G.t * 2 + e.bob) * 5;
      c.save();
      c.translate(e.x, ey + bob);
      // dinghy
      c.fillStyle = '#5a4632';
      c.beginPath(); c.moveTo(-34, 10); c.quadraticCurveTo(0, 26, 34, 10); c.lineTo(26, 0); c.lineTo(-26, 0); c.closePath(); c.fill();
      // her: pink dress, waving arm
      c.shadowColor = '#ff7eb0'; c.shadowBlur = 16;
      c.fillStyle = '#ff7eb0';
      rrect(c, -9, -26, 18, 26, 6); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#e8b48c';
      c.beginPath(); c.arc(0, -34, 9, 0, TAU); c.fill();
      const wave = Math.sin(G.t * 6) * 0.5;
      c.strokeStyle = '#e8b48c'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(8, -22); c.lineTo(18, -38 + wave * 8); c.stroke();
      c.fillStyle = '#3a2a1c';
      c.beginPath(); c.arc(0, -38, 7, Math.PI, 0); c.fill();
      c.restore();
    } else if (e.kind === 'cop') {
      // spotlight cone
      c.save();
      c.translate(e.x, ey);
      c.rotate(e.a);
      const grd = c.createLinearGradient(0, 0, e.cone, 0);
      grd.addColorStop(0, 'rgba(255,250,210,0.42)');
      grd.addColorStop(1, 'rgba(255,250,210,0)');
      c.fillStyle = grd;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, e.cone, -0.34, 0.34); c.closePath(); c.fill();
      c.restore();
      // hull
      c.save();
      c.translate(e.x, ey);
      c.fillStyle = '#dde4ec';
      rrect(c, -32, -13, 64, 26, 11); c.fill();
      c.fillStyle = '#aab6c4';
      rrect(c, -18, -22, 32, 13, 5); c.fill();
      const strobe = Math.floor(G.t * 6) % 2;
      c.shadowColor = strobe ? '#ff4a4a' : '#4a8aff'; c.shadowBlur = 14;
      c.fillStyle = strobe ? '#ff4a4a' : '#4a8aff';
      c.fillRect(-7, -27, 6, 5); c.fillRect(1, -27, 6, 5);
      c.restore();
    }
  }
}

function drawBoat(c) {
  const R = G.run, by = boatY();
  c.save();
  c.translate(R.x, by);
  c.rotate(clamp(R.vx / 1400, -0.32, 0.32));
  // motor glow at the stern so the boat pops on the dark water
  c.save();
  c.shadowColor = '#9adfff'; c.shadowBlur = 22;
  c.fillStyle = 'rgba(154,223,255,0.85)';
  rrect(c, -8, 26, 16, 7, 3); c.fill();
  c.restore();
  // hull
  c.fillStyle = '#27405f';
  c.beginPath();
  c.moveTo(0, -42); c.quadraticCurveTo(22, -10, 18, 30); c.lineTo(-18, 30); c.quadraticCurveTo(-22, -10, 0, -42);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(170,205,255,0.6)'; c.lineWidth = 2.5; c.stroke();
  // deck + cargo glow when multiplier is up
  c.fillStyle = '#3a567c';
  rrect(c, -12, -10, 24, 24, 7); c.fill();
  if (R.mult > 1) {
    c.shadowColor = '#ff7eb0'; c.shadowBlur = 14;
    c.fillStyle = '#ff7eb0';
    for (let i = 0; i < R.mult - 1; i++) c.fillRect(-10 + i * 6, 18, 4, 6);
    c.shadowBlur = 0;
  }
  c.restore();
}

function drawHUD(c) {
  const R = G.run;
  // cash
  txt(c, money(R.cash), 28, 64, 44, 900, '#7dffa8', 'left', '#1a5a35');
  if (R.mult > 1) txt(c, 'X' + R.mult, 28, 104, 28, 900, '#ff7eb0', 'left', '#80254a');
  // distance
  txt(c, Math.round(R.dist / 10) + 'M', VW - 28, 64, 30, 800, 'rgba(220,235,255,0.8)', 'right');
  txt(c, 'BEST ' + money(G.save.best), VW - 28, 96, 20, 700, 'rgba(190,210,235,0.45)', 'right');
  // spotted meter
  if (R.spotted > 0.02) {
    const w = VW * 0.5, x = (VW - w) / 2, y = 120;
    c.fillStyle = 'rgba(8,12,22,0.8)';
    rrect(c, x, y, w, 22, 11); c.fill();
    c.save();
    c.shadowColor = '#ff5a5a'; c.shadowBlur = 12;
    c.fillStyle = '#ff5a5a';
    rrect(c, x + 4, y + 4, Math.max(8, (w - 8) * R.spotted), 14, 7); c.fill();
    c.restore();
    if (Math.floor(G.t * 6) % 2 === 0) txt(c, 'SPOTTED!', VW / 2, y - 12, 26, 900, '#ff5a5a', 'center', '#ff5a5a');
  }
}

function drawTitle(c) {
  drawWater(c, G.t * 60);
  // logo
  const bob = Math.sin(G.t * 1.2) * 6;
  txt(c, 'MIDNIGHT', VW / 2, VH * 0.3 + bob, 92, 900, '#f2f6ff', 'center', '#4a9eff');
  txt(c, 'RUN', VW / 2, VH * 0.3 + 84 + bob, 76, 900, '#ffd24a', 'center', '#ff9a3a');
  txt(c, 'HEMLOCK ISLAND AFTER DARK', VW / 2, VH * 0.3 + 130 + bob, 22, 600, 'rgba(220,232,255,0.7)');
  // how to
  const y = VH * 0.52;
  txt(c, 'DRAG TO STEER', VW / 2, y, 26, 800, '#dce8ff');
  txt(c, 'GRAB THE BALES · PICK UP THE GIRLS', VW / 2, y + 40, 22, 600, '#7dffa8');
  txt(c, 'DODGE THE ROCKS AND THE OPP', VW / 2, y + 74, 22, 600, '#ff8a7a');
  if (G.save.best > 0) txt(c, 'BEST HAUL: ' + money(G.save.best), VW / 2, y + 130, 26, 900, '#ffd24a', 'center', '#7a5a1a');
  // pulse start
  const k = 0.75 + Math.abs(Math.sin(G.t * 2.4)) * 0.25;
  txt(c, 'TAP TO RUN', VW / 2, VH * 0.82, 36, 900, 'rgba(255,255,255,' + k + ')', 'center', '#4a9eff');
}

function drawDead(c) {
  const R = G.run;
  // dim
  c.fillStyle = 'rgba(4,7,14,0.66)';
  c.fillRect(0, 0, VW, VH);
  const rock = R.deadBy === 'rock';
  if (!rock) {
    const strobe = Math.floor(G.t * 5) % 2;
    c.fillStyle = strobe ? 'rgba(255,40,40,0.12)' : 'rgba(40,90,255,0.12)';
    c.fillRect(0, 0, VW, VH);
  }
  txt(c, rock ? 'SUNK' : 'BUSTED', VW / 2, VH * 0.3, 96, 900, rock ? '#cfe0ff' : '#ff5a5a', 'center', rock ? '#4a9eff' : '#ff2a2a');
  txt(c, rock ? 'THE LAKE KEEPS THE CARGO.' : 'BLANCHARD GOT YOU ON THE WATER.', VW / 2, VH * 0.3 + 56, 22, 600, 'rgba(220,232,255,0.7)');
  txt(c, 'HAUL', VW / 2, VH * 0.46, 24, 700, 'rgba(190,210,235,0.55)');
  txt(c, money(R.cash), VW / 2, VH * 0.46 + 62, 64, 900, '#7dffa8', 'center', '#1a5a35');
  txt(c, Math.round(R.dist / 10) + 'M AT X' + R.mult, VW / 2, VH * 0.46 + 104, 24, 700, 'rgba(220,232,255,0.6)');
  if (G.best) {
    const k = 1 + Math.sin(G.t * 5) * 0.06;
    c.save();
    c.translate(VW / 2, VH * 0.62);
    c.scale(k, k);
    txt(c, 'NEW BEST!', 0, 0, 44, 900, '#ffd24a', 'center', '#ffd24a');
    c.restore();
  } else if (G.save.best > 0) {
    txt(c, 'BEST ' + money(G.save.best), VW / 2, VH * 0.62, 24, 700, 'rgba(255,210,74,0.7)');
  }
  const k2 = 0.75 + Math.abs(Math.sin(G.t * 2.4)) * 0.25;
  txt(c, 'TAP TO RUN IT BACK', VW / 2, VH * 0.8, 32, 900, 'rgba(255,255,255,' + k2 + ')', 'center', '#4a9eff');
}

// ---------- main loop ----------
let last = 0, acc = 0, deadCooldown = 0;
const STEP = 1 / 60;
function frame(ts) {
  if (!last) last = ts;
  let dt = (ts - last) / 1000;
  last = ts;
  if (dt > 0.1) dt = 0.1;
  acc += dt;
  while (acc >= STEP) {
    G.t += STEP;
    if (G.mode === 'play') updatePlay(STEP);
    if (G.mode === 'title' && input.tapped) { newRun(); G.mode = 'play'; SFX.tap(); }
    if (G.mode === 'dead') {
      deadCooldown += STEP;
      if (input.tapped && deadCooldown > 0.6) { deadCooldown = 0; newRun(); G.mode = 'play'; G.best = false; SFX.tap(); }
    } else deadCooldown = 0;
    partsTick(STEP);
    if (G.shake > 0) G.shake = Math.max(0, G.shake - 60 * STEP);
    if (G.flash > 0) G.flash -= STEP;
    input.tapped = false;
    acc -= STEP;
  }

  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  if (G.mode === 'title') {
    drawTitle(ctx);
  } else {
    drawWater(ctx, G.run.dist);
    drawEnts(ctx);
    drawBoat(ctx);
    partsDraw(ctx);
    drawHUD(ctx);
    if (G.mode === 'dead') drawDead(ctx);
  }
  if (G.mode === 'title') partsDraw(ctx);
  ctx.restore();
  if (G.flash > 0) {
    ctx.globalAlpha = clamp(G.flash, 0, 0.6);
    ctx.fillStyle = G.flashCol;
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }
  // vignette
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(2,5,12,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VW, VH);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// expose for the smoke test
if (typeof module !== 'undefined') module.exports = null;
window.MR = { G, newRun, updatePlay, bust, spawnWave, input, get VH() { return VH; } };
