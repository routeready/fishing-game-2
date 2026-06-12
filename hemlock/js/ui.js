'use strict';
// Immediate-mode canvas UI. Scenes call UI.button/card/bar every frame;
// hover/press state and animations are tracked here keyed by id.
// main.js feeds HM.mouse = { x, y, down, pressed, released } in virtual coords.

const UI = (function () {
  const anim = {};      // id -> hover anim 0..1
  const nums = {};      // key -> { v } count-up displays
  let hot = null;       // id under the pointer this frame
  let lastHot = null;
  let tipText = null, tipX = 0, tipY = 0;
  let dtNow = 1 / 60;

  function over(x, y, w, h) {
    const m = HM.mouse;
    return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  }

  function begin(dt) {
    dtNow = dt;
    lastHot = hot;
    hot = null;
    tipText = null;
  }

  function end() {
    // pointer cursor when anything interactive is hot
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.cursor = hot ? 'pointer' : 'default';
    }
    if (hot && hot !== lastHot) SFX.hover();
  }

  function hoverK(id, isHot) {
    let a = anim[id] === undefined ? 0 : anim[id];
    a += (isHot ? 8 : -8) * dtNow;
    a = clamp(a, 0, 1);
    anim[id] = a;
    return a;
  }

  // Primary interactive element. opts: { label, sub, color, disabled, size,
  // weight, ghost, badge, align, tip, silent }
  function button(c, id, x, y, w, h, opts) {
    opts = opts || {};
    const m = HM.mouse;
    const isHot = !opts.disabled && !HM.modalBlock && over(x, y, w, h);
    if (isHot) hot = id;
    const k = hoverK(id, isHot);
    const press = isHot && m.down ? 1 : 0;
    const accent = opts.color || '#4a9eff';
    const lift = k * 2 - press * 2;

    c.save();
    c.translate(0, -lift);
    if (k > 0 && !opts.disabled) {
      c.shadowColor = rgba(accent, 0.5 * k);
      c.shadowBlur = 22 * k;
    }
    const base = opts.ghost ? 'rgba(255,255,255,0.05)' : '#1b2434';
    rrPath(c, x, y, w, h, opts.r || 12);
    c.fillStyle = opts.disabled ? 'rgba(120,130,150,0.12)' :
      vgrad(c, x, y, w, h, [[0, shade(opts.ghost ? '#222c3e' : '#243248', k * 0.12)], [1, opts.ghost ? 'rgba(20,26,40,0.6)' : '#161e2c']]);
    c.fill();
    c.shadowBlur = 0;
    rrPath(c, x, y, w, h, opts.r || 12);
    c.strokeStyle = opts.disabled ? 'rgba(150,160,180,0.15)' : rgba(accent, 0.35 + 0.55 * k);
    c.lineWidth = 1.5;
    c.stroke();

    const tcol = opts.disabled ? 'rgba(200,210,225,0.35)' : (opts.labelColor || '#eaf2ff');
    const size = opts.size || Math.min(20, h * 0.4);
    if (opts.sub) {
      txt(c, opts.label, x + w / 2, y + h / 2 - 4, { size, weight: opts.weight || 700, color: tcol, align: 'center', baseline: 'middle' });
      txt(c, opts.sub, x + w / 2, y + h / 2 + size * 0.78, { size: size * 0.62, weight: 500, color: opts.disabled ? 'rgba(200,210,225,0.3)' : rgba(accent, 0.95), align: 'center', baseline: 'middle' });
    } else {
      txt(c, opts.label, x + w / 2, y + h / 2 + 1, { size, weight: opts.weight || 700, color: tcol, align: 'center', baseline: 'middle' });
    }
    if (opts.badge) {
      const bx = x + w - 6, by = y + 6, pulse = 1 + Math.sin(HM.G.t * 6) * 0.15;
      c.save(); c.shadowColor = '#ffd24a'; c.shadowBlur = 14;
      c.fillStyle = '#ffd24a';
      c.beginPath(); c.arc(bx, by, 7 * pulse, 0, TAU); c.fill(); c.restore();
      txt(c, '!', bx, by + 1, { size: 11, weight: 900, color: '#241a00', align: 'center', baseline: 'middle' });
    }
    c.restore();

    if (isHot && opts.tip) { tipText = opts.tip; tipX = m.x; tipY = m.y; }
    const clicked = isHot && m.released;
    if (clicked && !opts.silent) SFX.click();
    return clicked;
  }

  // Invisible hit area (for map nodes that draw themselves). Returns {hot, clicked, k}.
  function hit(id, x, y, w, h, tip) {
    const m = HM.mouse;
    const isHot = !HM.modalBlock && over(x, y, w, h);
    if (isHot) hot = id;
    const k = hoverK(id, isHot);
    if (isHot && tip) { tipText = tip; tipX = m.x; tipY = m.y; }
    const clicked = isHot && m.released;
    return { hot: isHot, clicked, k };
  }

  // Glass card with optional title strip.
  function card(c, x, y, w, h, opts) {
    opts = opts || {};
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 26;
    c.shadowOffsetY = 8;
    rrPath(c, x, y, w, h, opts.r || 16);
    c.fillStyle = opts.fill || 'rgba(16,22,34,0.92)';
    c.fill();
    c.restore();
    rrPath(c, x, y, w, h, opts.r || 16);
    c.strokeStyle = opts.stroke || 'rgba(255,255,255,0.1)';
    c.lineWidth = 1.5;
    c.stroke();
    // top sheen
    c.save();
    rrPath(c, x, y, w, h, opts.r || 16);
    c.clip();
    c.fillStyle = vgrad(c, x, y, w, 50, [[0, 'rgba(255,255,255,0.06)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(x, y, w, 50);
    c.restore();
    if (opts.title) {
      txt(c, opts.title, x + 22, y + 34, { size: 19, weight: 800, color: opts.titleColor || '#eaf2ff', spacing: 1.5 });
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(x + 22, y + 46, w - 44, 1.5);
    }
  }

  // Animated stat bar. opts: { bg, glow, segs }
  function bar(c, x, y, w, h, frac, color, opts) {
    opts = opts || {};
    fillRR(c, x, y, w, h, h / 2, opts.bg || 'rgba(8,12,20,0.8)');
    const fw = Math.max(0, Math.min(w, w * frac));
    if (fw > h * 0.5) {
      c.save();
      if (opts.glow) { c.shadowColor = color; c.shadowBlur = 12; }
      rrPath(c, x, y, fw, h, h / 2);
      c.fillStyle = vgrad(c, x, y, w, h, [[0, shade(color, 0.25)], [1, shade(color, -0.15)]]);
      c.fill();
      c.restore();
    }
    strokeRR(c, x, y, w, h, h / 2, 'rgba(255,255,255,0.12)', 1);
  }

  // Count-up number display: returns the eased shown value for `target`.
  function num(key, target, snap) {
    let n = nums[key];
    if (!n) { n = nums[key] = { v: target }; }
    if (snap) n.v = target;
    const diff = target - n.v;
    if (Math.abs(diff) < 0.5) n.v = target;
    else n.v += diff * Math.min(1, 6 * dtNow);
    return n.v;
  }
  function numPop(key) { const n = nums[key]; return n ? Math.abs((n.target || 0)) : 0; }

  function drawTip(c) {
    if (!tipText) return;
    const w = txtW(c, tipText, 15, 600) + 24;
    let x = clamp(tipX + 16, 8, VW - w - 8), y = clamp(tipY - 44, 8, VH - 40);
    fillRR(c, x, y, w, 32, 8, 'rgba(8,12,20,0.95)');
    strokeRR(c, x, y, w, 32, 8, 'rgba(255,255,255,0.18)', 1);
    txt(c, tipText, x + 12, y + 21, { size: 15, weight: 600, color: '#dce8ff' });
  }

  return { begin, end, button, hit, card, bar, num, numPop, drawTip, over };
})();

// ---------- modal ----------
// HM.modal = { title, body: [lines] | string, portrait, accent, w,
//              buttons: [{ label, color, cb, sub }], onDraw }
// Set HM.modal to open; cleared when a button resolves. Scene input is
// suppressed while open (main.js sets HM.modalBlock during scene update).
function openModal(spec) { spec.t = 0; HM.modal = spec; SFX.open(); }

function drawModal(c, dt) {
  const M = HM.modal;
  if (!M) return;
  M.t = Math.min(1, (M.t || 0) + dt * 5);
  const k = easeBack(M.t);
  c.fillStyle = 'rgba(3,6,12,' + (0.62 * M.t) + ')';
  c.fillRect(0, 0, VW, VH);

  const body = Array.isArray(M.body) ? M.body : (M.body ? [M.body] : []);
  const w = M.w || 560;
  const btns = M.buttons || [{ label: 'OK' }];
  const bodyH = body.length * 26;
  const h = 96 + bodyH + (M.portrait ? 40 : 0) + 78 + (M.onDraw ? (M.drawH || 0) : 0);
  const x = (VW - w) / 2, y = (VH - h) / 2 - 10;

  c.save();
  c.translate(VW / 2, VH / 2);
  c.scale(k, k);
  c.translate(-VW / 2, -VH / 2);

  UI.card(c, x, y, w, h, { title: M.title, titleColor: M.accent || '#eaf2ff' });
  let cy = y + 76;
  if (M.portrait) {
    portrait(c, x + 56, cy + 6, 30, M.portrait, '#141c2c');
    cy += 4;
  }
  const tx = M.portrait ? x + 104 : x + 24;
  const tw = w - (M.portrait ? 128 : 48);
  for (const line of body) {
    txt(c, line, tx, cy, { size: 17, weight: 500, color: '#c4d2e8' });
    cy += 26;
  }
  if (M.portrait) cy = Math.max(cy, y + 76 + 56);
  if (M.onDraw) { M.onDraw(c, x, cy, w); cy += M.drawH || 0; }

  // buttons
  const bw = Math.min(220, (w - 48 - (btns.length - 1) * 14) / btns.length);
  let bx = x + w - 24 - btns.length * bw - (btns.length - 1) * 14;
  const by = y + h - 66;
  btns.forEach((b, i) => {
    if (UI.button(c, 'modal_' + i + '_' + (M.title || ''), bx, by, bw, 46,
        { label: b.label, sub: b.sub, color: b.color || M.accent || '#4a9eff', disabled: b.disabled })) {
      HM.modal = null;
      if (b.cb) b.cb();
    }
    bx += bw + 14;
  });
  c.restore();
}
