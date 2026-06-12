'use strict';
// Shared namespace. Scenes register into HM.scenes; main.js drives them.
const HM = { scenes: {} };
const VW = 1280, VH = 720;          // virtual resolution, scaled to the window
const TAU = Math.PI * 2;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }

// Easing — all take t in 0..1.
function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
function easeIn(t) { return t * t * t; }
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeBack(t) { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
function easeElastic(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;
}

// Deterministic RNG for daily content / level layouts.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function money(n) {
  n = Math.round(n);
  const neg = n < 0; if (neg) n = -n;
  return (neg ? '-$' : '$') + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Short money for tight HUD chips: $1.2K, $3.4M.
function moneyK(n) {
  n = Math.round(n);
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M';
  if (Math.abs(n) >= 10000) return '$' + (n / 1e3).toFixed(n % 1e3 ? 1 : 0) + 'K';
  return money(n);
}

// Seconds -> "2M 30S" / "1H 12M".
function fmtDur(sec) {
  sec = Math.max(0, Math.ceil(sec));
  if (sec >= 3600) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h + 'H ' + m + 'M'; }
  if (sec >= 60) { const m = Math.floor(sec / 60), s = sec % 60; return m + 'M ' + (s ? s + 'S' : ''); }
  return sec + 'S';
}

// Lighten (k>0) or darken (k<0) a #rrggbb color; alpha optional.
function shade(hex, k, alpha) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = k < 0 ? 0 : 255, a = Math.abs(k);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return alpha === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// #rrggbb with alpha.
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

// Blend two hex colors -> rgb() string.
function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}
