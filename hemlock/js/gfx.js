'use strict';
// Modern canvas draw layer: typography, rounded cards, gradients, glow,
// landscape painters, procedural portraits, and the particle pools.

const FONT_STACK = 'system-ui, sans-serif';
function F(size, weight) { return (weight || 400) + ' ' + size + 'px ' + FONT_STACK; }

// txt(c,'HELLO',x,y,{size,weight,color,align,baseline,alpha,spacing})
function txt(c, str, x, y, o) {
  o = o || {};
  c.save();
  c.font = F(o.size || 16, o.weight || 400);
  c.fillStyle = o.color || '#fff';
  c.textAlign = o.align || 'left';
  c.textBaseline = o.baseline || 'alphabetic';
  if (o.alpha !== undefined) c.globalAlpha = o.alpha;
  if (o.spacing !== undefined && 'letterSpacing' in c) c.letterSpacing = o.spacing + 'px';
  c.fillText(String(str), x, y);
  c.restore();
}

function txtW(c, str, size, weight) {
  c.save(); c.font = F(size || 16, weight || 400);
  const w = c.measureText(String(str)).width;
  c.restore(); return w;
}

// Glowing text — neon signs, jackpot numbers.
function txtGlow(c, str, x, y, o) {
  o = o || {};
  c.save();
  c.shadowColor = o.glow || o.color || '#fff';
  c.shadowBlur = o.blur || 18;
  txt(c, str, x, y, o);
  c.restore();
}

function rrPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function fillRR(c, x, y, w, h, r, fill) { rrPath(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); }
function strokeRR(c, x, y, w, h, r, col, lw) { rrPath(c, x, y, w, h, r); c.strokeStyle = col; c.lineWidth = lw || 1; c.stroke(); }

function vgrad(c, x, y, w, h, stops) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  for (const [t, col] of stops) g.addColorStop(t, col);
  return g;
}

// Run fn with a drop shadow / glow around whatever it draws.
function withGlow(c, color, blur, fn) {
  c.save(); c.shadowColor = color; c.shadowBlur = blur; fn(); c.restore();
}

// ---------- time of day ----------
// Real-clock hour (fractional). The island lives on your actual day.
function dayHour() { const d = new Date(); return d.getHours() + d.getMinutes() / 60; }

// Sky keyframes: night, dawn, day, golden, dusk, night.
const SKY_KEYS = [
  { h: 0,    top: '#0a1228', bot: '#16224a' },
  { h: 5,    top: '#0a1228', bot: '#16224a' },
  { h: 6.5,  top: '#3a3560', bot: '#e08a6a' },
  { h: 9,    top: '#3d7ab8', bot: '#a8d4e8' },
  { h: 15,   top: '#3d7ab8', bot: '#a8d4e8' },
  { h: 18.5, top: '#4a4a85', bot: '#f0a050' },
  { h: 20.5, top: '#141b3d', bot: '#43306a' },
  { h: 22,   top: '#0a1228', bot: '#16224a' },
  { h: 24,   top: '#0a1228', bot: '#16224a' },
];
function skyAt(hour) {
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
    if (hour >= a.h && hour <= b.h) {
      const t = (hour - a.h) / Math.max(0.001, b.h - a.h);
      return { top: mix(a.top, b.top, t), bot: mix(a.bot, b.bot, t) };
    }
  }
  return { top: SKY_KEYS[0].top, bot: SKY_KEYS[0].bot };
}
// 0 = full day, 1 = full night. Drives window glow / fireflies / headlights.
function nightK(hour) {
  if (hour < 5.5) return 1;
  if (hour < 8) return 1 - (hour - 5.5) / 2.5;
  if (hour < 17.5) return 0;
  if (hour < 21) return (hour - 17.5) / 3.5;
  return 1;
}

// ---------- landscape painters ----------
function pine(c, x, baseY, h, col) {
  const w = h * 0.46;
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, baseY - h);
  c.lineTo(x + w / 2, baseY - h * 0.34);
  c.lineTo(x + w * 0.16, baseY - h * 0.34);
  c.lineTo(x + w * 0.34, baseY);
  c.lineTo(x - w * 0.34, baseY);
  c.lineTo(x - w * 0.16, baseY - h * 0.34);
  c.lineTo(x - w / 2, baseY - h * 0.34);
  c.closePath();
  c.fill();
  c.fillRect(x - h * 0.035, baseY, h * 0.07, h * 0.1);
}

function cloud(c, x, y, s, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(x, y, 46 * s, 15 * s, 0, 0, TAU);
  c.ellipse(x - 28 * s, y + 5 * s, 26 * s, 11 * s, 0, 0, TAU);
  c.ellipse(x + 30 * s, y + 4 * s, 30 * s, 12 * s, 0, 0, TAU);
  c.fill();
  c.restore();
}

// ---------- procedural portraits (flat illustration style) ----------
// spec: { skin, hair, hairCol, shades, lip, stubble, hat }
function portrait(c, x, y, r, spec, bgCol) {
  c.save();
  // backing disc
  rrPath(c, x - r, y - r, r * 2, r * 2, r);
  c.fillStyle = bgCol || '#1c2433';
  c.fill();
  c.clip();
  const skin = spec.skin || '#e8b48c';
  // shoulders
  c.fillStyle = spec.coat || '#2c3648';
  c.beginPath(); c.ellipse(x, y + r * 1.25, r * 0.95, r * 0.6, 0, 0, TAU); c.fill();
  // head
  c.fillStyle = skin;
  c.beginPath(); c.ellipse(x, y - r * 0.08, r * 0.46, r * 0.55, 0, 0, TAU); c.fill();
  // hair
  c.fillStyle = spec.hairCol || '#3a2a1c';
  if (spec.hair === 'long') {
    c.beginPath(); c.ellipse(x, y - r * 0.3, r * 0.52, r * 0.42, 0, Math.PI, 0); c.fill();
    c.fillRect(x - r * 0.52, y - r * 0.3, r * 0.16, r * 0.85);
    c.fillRect(x + r * 0.36, y - r * 0.3, r * 0.16, r * 0.85);
  } else if (spec.hair === 'bun') {
    c.beginPath(); c.ellipse(x, y - r * 0.32, r * 0.5, r * 0.36, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.arc(x, y - r * 0.66, r * 0.17, 0, TAU); c.fill();
  } else if (spec.hair === 'mohawk') {
    c.fillRect(x - r * 0.08, y - r * 0.72, r * 0.16, r * 0.34);
    c.beginPath(); c.ellipse(x, y - r * 0.34, r * 0.48, r * 0.3, 0, Math.PI, 0); c.fill();
  } else if (spec.hair === 'bald') {
    /* nothing up top */
  } else { // short
    c.beginPath(); c.ellipse(x, y - r * 0.3, r * 0.49, r * 0.36, 0, Math.PI, 0); c.fill();
  }
  // eyes / shades
  if (spec.shades) {
    c.fillStyle = '#10141c';
    fillRR(c, x - r * 0.36, y - r * 0.18, r * 0.3, r * 0.16, r * 0.05, '#10141c');
    fillRR(c, x + r * 0.06, y - r * 0.18, r * 0.3, r * 0.16, r * 0.05, '#10141c');
    c.fillRect(x - r * 0.08, y - r * 0.14, r * 0.16, r * 0.04);
  } else {
    c.fillStyle = '#1c1c24';
    c.beginPath(); c.arc(x - r * 0.18, y - r * 0.1, r * 0.05, 0, TAU); c.arc(x + r * 0.18, y - r * 0.1, r * 0.05, 0, TAU); c.fill();
    if (spec.lashes) {
      c.strokeStyle = '#1c1c24'; c.lineWidth = r * 0.03;
      c.beginPath(); c.arc(x - r * 0.18, y - r * 0.12, r * 0.08, Math.PI * 1.15, Math.PI * 1.85);
      c.arc(x + r * 0.18, y - r * 0.12, r * 0.08, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    }
  }
  // mouth
  c.strokeStyle = spec.lip || '#a05848'; c.lineWidth = r * (spec.lip ? 0.09 : 0.05);
  c.beginPath(); c.arc(x, y + r * 0.18, r * 0.14, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
  // stubble
  if (spec.stubble) {
    c.fillStyle = rgba('#3a2a1c', 0.35);
    c.beginPath(); c.ellipse(x, y + r * 0.18, r * 0.3, r * 0.24, 0, 0, Math.PI); c.fill();
  }
  // hat (cop / trucker)
  if (spec.hat) {
    c.fillStyle = spec.hat;
    c.beginPath(); c.ellipse(x, y - r * 0.34, r * 0.5, r * 0.26, 0, Math.PI, 0); c.fill();
    c.fillRect(x - r * 0.56, y - r * 0.36, r * 1.12, r * 0.09);
  }
  c.restore();
  strokeRR(c, x - r, y - r, r * 2, r * 2, r, 'rgba(255,255,255,0.14)', 2);
}

// ---------- particles ----------
// One pooled list, drawn after the scene. Kinds: float (rising text),
// burst (confetti dot), puff (smoke), ember (firefly), debris.
HM.parts = [];

function partFloat(str, x, y, color, opts) {
  opts = opts || {};
  HM.parts.push({
    kind: 'float', str, x, y, color, t: 0, ttl: opts.ttl || 1.4,
    size: opts.size || 22, weight: opts.weight || 800, vy: opts.vy || -55, glow: opts.glow,
  });
}
function partBurst(x, y, color, n, opts) {
  opts = opts || {};
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), sp = rnd(60, opts.speed || 260);
    HM.parts.push({
      kind: 'burst', x, y, color: Array.isArray(color) ? pick(color) : color,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, ttl: rnd(0.5, 1),
      r: rnd(2.5, opts.r || 5), grav: opts.grav === undefined ? 380 : opts.grav,
    });
  }
}
function partPuff(x, y, col, big) {
  HM.parts.push({
    kind: 'puff', x: x + rnd(-4, 4), y, color: col || 'rgba(200,205,215,0.35)',
    vx: rnd(-8, 8), vy: rnd(-30, -16), t: 0, ttl: rnd(1.2, big ? 2.6 : 1.8), r: rnd(4, big ? 16 : 8),
  });
}
function partEmber(x, y, col) {
  HM.parts.push({ kind: 'ember', x, y, color: col || '#cfe87a', vx: rnd(-14, 14), vy: rnd(-10, 4), t: 0, ttl: rnd(1.5, 3), r: rnd(1.2, 2.4) });
}

function partsUpdate(dt) {
  const P = HM.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.t += dt;
    if (p.t >= p.ttl) { P.splice(i, 1); continue; }
    if (p.kind === 'float') { p.y += p.vy * dt; p.vy *= (1 - 1.6 * dt); }
    else if (p.kind === 'burst') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; }
    else if (p.kind === 'puff') { p.x += p.vx * dt; p.y += p.vy * dt; p.r += 9 * dt; }
    else if (p.kind === 'ember') { p.x += p.vx * dt + Math.sin(p.t * 3 + p.r) * 12 * dt; p.y += p.vy * dt; }
  }
}

function partsDraw(c) {
  for (const p of HM.parts) {
    const k = p.t / p.ttl, fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    if (p.kind === 'float') {
      const rise = easeOut(Math.min(1, p.t / 0.25));
      c.save();
      c.globalAlpha = fade;
      if (p.glow) { c.shadowColor = p.color; c.shadowBlur = 16; }
      txt(c, p.str, p.x, p.y, { size: p.size * (0.6 + 0.4 * rise), weight: p.weight, color: p.color, align: 'center' });
      c.restore();
    } else if (p.kind === 'burst') {
      c.save(); c.globalAlpha = fade; c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.r * (1 - k * 0.4), 0, TAU); c.fill(); c.restore();
    } else if (p.kind === 'puff') {
      c.save(); c.globalAlpha = fade * 0.5; c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.restore();
    } else if (p.kind === 'ember') {
      c.save(); c.globalAlpha = fade * (0.5 + 0.5 * Math.sin(p.t * 6));
      c.shadowColor = p.color; c.shadowBlur = 8; c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.restore();
    }
  }
}

// ---------- screen polish ----------
let _vig = null;
function vignette(c) {
  if (!_vig) {
    _vig = c.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 0.95);
    _vig.addColorStop(0, 'rgba(0,0,0,0)');
    _vig.addColorStop(1, 'rgba(2,6,14,0.5)');
  }
  c.fillStyle = _vig;
  c.fillRect(0, 0, VW, VH);
}
