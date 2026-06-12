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

// Lighten (k>0) or darken (k<0) a #rrggbb color.
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = k < 0 ? 0 : 255, a = Math.abs(k);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// Chunky pixel fish centered at (x,y), facing right. len ≈ total length in px.
function drawFish(c, x, y, len, col) {
  const L = Math.max(7, Math.round(len * 0.74));   // body
  const tl = Math.max(2, Math.round(len * 0.22));  // tail
  const hh = Math.max(2, Math.round(L * 0.22));    // half height
  const nose = Math.round(x + (L + tl) / 2);
  const dark = shade(col, -0.35), lite = shade(col, 0.3);
  for (let r = -hh; r <= hh; r++) {
    const wRow = Math.round(L * Math.sqrt(Math.max(0, 1 - (r / (hh + 0.6)) * (r / (hh + 0.6)))));
    c.fillStyle = r < -hh * 0.34 ? dark : (r > hh * 0.34 ? lite : col);
    c.fillRect(nose - wRow, Math.round(y) + r, wRow, 1);
  }
  c.fillStyle = dark;
  const tx = nose - L;
  for (let i = 0; i < tl; i++) {
    const th = 1 + Math.round((i / tl) * hh * 1.5);
    c.fillRect(tx - i, Math.round(y) - th, 1, th * 2);
  }
  c.fillRect(nose - Math.round(L * 0.66), Math.round(y) - hh - 2, Math.round(L * 0.3), 2); // dorsal
  c.fillRect(nose - Math.round(L * 0.34), Math.round(y) - Math.round(hh * 0.6), 1, Math.max(2, Math.round(hh * 1.2))); // gill
  if (len >= 12) {
    c.fillStyle = '#fff'; c.fillRect(nose - Math.round(L * 0.2), Math.round(y) - 1, 2, 2);
    c.fillStyle = '#101010'; c.fillRect(nose - Math.round(L * 0.2) + 1, Math.round(y) - 1, 1, 1);
  }
}

// 8x8 pixel icons for HUD chips and menu rows.
function drawIcon(c, name, x, y) {
  if (name === 'can') {
    c.fillStyle = '#c0c8d0'; c.fillRect(x + 1, y, 5, 1); c.fillRect(x + 1, y + 6, 5, 1);
    c.fillStyle = '#f0c020'; c.fillRect(x + 1, y + 1, 5, 5);
    c.fillStyle = '#a08010'; c.fillRect(x + 1, y + 3, 5, 1);
  } else if (name === 'siren') {
    c.fillStyle = '#888'; c.fillRect(x, y + 5, 8, 2);
    c.fillStyle = '#f03030'; c.fillRect(x + 1, y + 1, 3, 4);
    c.fillStyle = '#3060f0'; c.fillRect(x + 4, y + 1, 3, 4);
  } else if (name === 'rod') {
    c.strokeStyle = '#d8c8a8'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y + 7); c.lineTo(x + 6, y); c.stroke();
    c.fillStyle = '#cfe8e8'; c.fillRect(x + 6, y + 1, 1, 3);
  } else if (name === 'boat') {
    c.fillStyle = '#b03028'; c.fillRect(x, y + 4, 8, 3);
    c.fillStyle = '#d8d0c0'; c.fillRect(x + 1, y + 5, 6, 1);
    c.fillStyle = '#403830'; c.fillRect(x + 2, y + 2, 2, 2);
  } else if (name === 'coin') {
    c.fillStyle = '#ffd040'; c.fillRect(x + 1, y + 1, 6, 6); c.fillRect(x + 2, y, 4, 1); c.fillRect(x + 2, y + 7, 4, 1);
    c.fillStyle = '#a08010'; c.fillRect(x + 3, y + 2, 2, 4);
  }
}

// Rotating gold starburst (legendary catches).
function starburst(c, x, y, t) {
  c.fillStyle = '#ffd040';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.8;
    const r1 = 18 + (i % 2 ? 9 : 0) + Math.sin(t * 3 + i) * 2;
    for (let r = 12; r < r1; r += 2) {
      c.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.55), 1, 1);
    }
  }
}
