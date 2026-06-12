'use strict';
// Title: a dusk vista of the island — water reflection, pines, one neon light
// burning at the Lodge — with the logo glowing over it.
HM.scenes.title = (function () {
  let t = 0;

  function enter() { t = 0; }

  function update(dt) {
    t += dt;
    if (Math.random() < dt * 2) partEmber(rnd(80, VW - 80), rnd(VH * 0.55, VH * 0.75), '#cfe87a');
    if (Math.random() < dt / 9) SFX.loon();
  }

  function draw(c) {
    // dusk sky, always — the postcard hour
    const sky = skyAt(20.2);
    c.fillStyle = vgrad(c, 0, 0, VW, VH * 0.62, [[0, sky.top], [1, sky.bot]]);
    c.fillRect(0, 0, VW, VH * 0.62);
    // moon
    withGlow(c, '#fff8e0', 40, () => {
      c.fillStyle = '#fff4d8';
      c.beginPath(); c.arc(VW * 0.78, VH * 0.16, 34, 0, TAU); c.fill();
    });
    // stars
    c.fillStyle = 'rgba(255,255,255,0.7)';
    const r = mulberry32(7);
    for (let i = 0; i < 60; i++) {
      const sx = r() * VW, sy = r() * VH * 0.4;
      c.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.8 + i));
      c.fillRect(sx, sy, 2, 2);
    }
    c.globalAlpha = 1;
    cloud(c, VW * 0.2 + Math.sin(t * 0.05) * 30, VH * 0.12, 1.6, 0.1);
    cloud(c, VW * 0.6 + Math.cos(t * 0.04) * 40, VH * 0.22, 2.2, 0.08);

    // island silhouette band
    const hy = VH * 0.62;
    c.fillStyle = '#0d1626';
    c.beginPath();
    c.moveTo(0, hy);
    c.bezierCurveTo(VW * 0.2, hy - 60, VW * 0.3, hy - 24, VW * 0.45, hy - 40);
    c.bezierCurveTo(VW * 0.6, hy - 58, VW * 0.75, hy - 18, VW, hy - 36);
    c.lineTo(VW, hy); c.closePath(); c.fill();
    const rp = mulberry32(13);
    for (let i = 0; i < 42; i++) {
      const px = rp() * VW, ph = 26 + rp() * 40;
      pine(c, px, hy - 14 - rp() * 36, ph, '#0a1220');
    }
    // the lodge's neon, far off
    const nx = VW * 0.68, ny = hy - 52;
    const flick = Math.sin(t * 11) > -0.85 ? 1 : 0.25;
    withGlow(c, '#ff6ea8', 24 * flick, () => {
      c.fillStyle = rgba('#ff6ea8', 0.9 * flick);
      c.fillRect(nx, ny, 16, 10);
    });

    // water + reflections
    c.fillStyle = vgrad(c, 0, hy, VW, VH - hy, [[0, '#1a2440'], [1, '#0a101e']]);
    c.fillRect(0, hy, VW, VH - hy);
    c.save();
    c.globalAlpha = 0.3;
    for (let i = 0; i < 26; i++) {
      const ly = hy + 14 + i * 14 + Math.sin(t * 1.2 + i) * 2;
      const lw = 60 + Math.sin(t * 0.7 + i * 2.4) * 40;
      c.fillStyle = i % 3 === 0 ? '#3a4a78' : '#222e52';
      fillRR(c, VW * 0.5 - lw + Math.sin(t * 0.4 + i) * 80, ly, lw * 2, 3, 2, c.fillStyle);
    }
    // moon path
    c.globalAlpha = 0.18;
    c.fillStyle = '#fff4d8';
    for (let i = 0; i < 18; i++) {
      const ly = hy + 8 + i * 16;
      const lw = 26 - i + Math.sin(t * 1.5 + i) * 8;
      c.fillRect(VW * 0.78 - lw / 2, ly, lw, 3);
    }
    c.restore();

    // logo
    const ly = VH * 0.3;
    c.save();
    c.translate(0, Math.sin(t * 1.1) * 4);
    txtGlow(c, 'HEMLOCK', VW / 2, ly, { size: 110, weight: 900, color: '#f2f6ff', glow: '#4a9eff', blur: 34, align: 'center', spacing: 10 });
    txtGlow(c, 'ISLAND', VW / 2, ly + 78, { size: 64, weight: 900, color: '#ffd24a', glow: '#ff9a3a', blur: 28, align: 'center', spacing: 26 });
    txt(c, 'A NORTHERN ONTARIO CRIME TYCOON', VW / 2, ly + 116, { size: 18, weight: 600, color: 'rgba(220,232,255,0.75)', align: 'center', spacing: 4 });
    c.restore();

    vignette(c);

    if (UI.button(c, 'title_play', VW / 2 - 140, VH * 0.74, 280, 64,
        { label: G.save.records.earned > 0 ? 'BACK TO WORK' : 'INHERIT THE ISLAND', color: '#ffd24a', size: 21 })) {
      setScene('island');
    }
    txt(c, 'FORTY BUCKS, A ROTTEN DOCK, AND A FAMILY REPUTATION TO REBUILD.', VW / 2, VH * 0.9,
      { size: 15, weight: 500, color: 'rgba(190,205,230,0.55)', align: 'center' });
    txt(c, 'M: MUTE', VW - 24, VH - 18, { size: 13, weight: 600, color: 'rgba(190,205,230,0.4)', align: 'right' });
  }

  return { enter, update, draw };
})();
