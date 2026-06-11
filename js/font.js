'use strict';
// 3x5 pixel font. Each glyph is 5 rows of 3-bit masks (bit 2 = left pixel).
const FONT = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 6, 4, 6, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 3, 1], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [7, 1, 3, 1, 7],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 6, 1, 6], '6': [3, 4, 7, 5, 7], '7': [7, 1, 2, 2, 2],
  '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 6],
  '.': [0, 0, 0, 0, 2], ',': [0, 0, 0, 2, 4], '!': [2, 2, 2, 0, 2], '?': [6, 1, 2, 0, 2],
  ':': [0, 2, 0, 2, 0], '-': [0, 0, 7, 0, 0], "'": [2, 4, 0, 0, 0], '/': [1, 1, 2, 4, 4],
  '$': [3, 6, 7, 3, 6], '%': [5, 1, 2, 4, 5], '(': [1, 2, 2, 2, 1], ')': [4, 2, 2, 2, 4],
  '+': [0, 2, 7, 2, 0], '=': [0, 7, 0, 7, 0], '<': [1, 2, 4, 2, 1], '>': [4, 2, 1, 2, 4],
  '*': [5, 2, 7, 2, 5], '"': [5, 5, 0, 0, 0], '#': [5, 7, 5, 7, 5], '_': [0, 0, 0, 0, 7],
  '^': [2, 7, 2, 2, 2], '&': [2, 5, 2, 5, 3], ' ': [0, 0, 0, 0, 0],
};

function text(ctx, str, x, y, color = '#fff', scale = 1) {
  str = String(str).toUpperCase();
  ctx.fillStyle = color;
  let cx = Math.round(x), cy = Math.round(y);
  for (const ch of str) {
    if (ch === '\n') { cx = Math.round(x); cy += 7 * scale; continue; }
    const g = FONT[ch] || FONT['?'];
    for (let r = 0; r < 5; r++) {
      const row = g[r];
      if (!row) continue;
      for (let c = 0; c < 3; c++) {
        if (row & (4 >> c)) ctx.fillRect(cx + c * scale, cy + r * scale, scale, scale);
      }
    }
    cx += 4 * scale;
  }
  return cx - x;
}

function textW(str, scale = 1) { return String(str).length * 4 * scale - scale; }

function textC(ctx, str, cx, y, color = '#fff', scale = 1) {
  text(ctx, str, Math.round(cx - textW(str, scale) / 2), y, color, scale);
}

// Text with a 1px drop shadow — used over busy water.
function textS(ctx, str, x, y, color = '#fff', scale = 1, shadow = '#000') {
  text(ctx, str, x + scale, y + scale, shadow, scale);
  text(ctx, str, x, y, color, scale);
}

function textCS(ctx, str, cx, y, color = '#fff', scale = 1, shadow = '#000') {
  const x = Math.round(cx - textW(str, scale) / 2);
  textS(ctx, str, x, y, color, scale, shadow);
}
