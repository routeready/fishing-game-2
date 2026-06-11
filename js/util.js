'use strict';
// Shared namespace. Scenes register themselves into RT.scenes; main.js drives them.
const RT = { scenes: {} };

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }

// Deterministic RNG for daily content / lake layouts.
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

// Minutes-since-midnight -> {h, m, ap} 12h clock.
function fmtClock(min) {
  min = Math.floor(min);
  let h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return { h, m, ap };
}

function money(n) {
  n = Math.round(n);
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtLb(w) { return (Math.round(w * 10) / 10).toFixed(1); }

// Keyboard vs touch wording for on-screen hints (touch.js sets RT.touch).
function kt(kbd, tch) { return RT.touch ? tch : kbd; }
