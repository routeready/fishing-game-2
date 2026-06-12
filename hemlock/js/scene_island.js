'use strict';
// The hub: a living map of Hemlock Island. Sky runs on the real clock,
// businesses animate their state, and everything clickable glows on hover.
HM.scenes.island = (function () {
  let t = 0;

  const NODES = [
    { id: 'still',   x: 215,  y: 520, name: 'THE STILL' },
    { id: 'farm',    x: 360,  y: 375, name: 'POPPY FIELD' },
    { id: 'lab',     x: 545,  y: 450, name: 'BUNKHOUSE LAB' },
    { id: 'trailer', x: 735,  y: 360, name: 'CAMPER LAB' },
    { id: 'lodge',   x: 965,  y: 420, name: 'THE LODGE' },
    { id: 'market',  x: 660,  y: 565, name: 'TOWN STRIP' },
    { id: 'hideout', x: 400,  y: 615, name: 'HIDEOUT' },
    { id: 'dock',    x: 1055, y: 600, name: 'THE DOCK' },
  ];

  function lockInfo(id) {
    const S = G.save;
    switch (id) {
      case 'still':   return S.biz.still.lvl > 0 ? null : { cost: BIZ.still.tiers[0].cost, buy: HM.buyStillTier, blurb: BIZ.still.blurb };
      case 'farm':    return S.biz.poppy.plots.length > 0 ? null : { cost: BIZ.poppy.plotCosts[0], buy: HM.buyPlot, blurb: BIZ.poppy.blurb };
      case 'lab':     return S.biz.lab.lvl > 0 ? null : { cost: BIZ.lab.cost, buy: HM.buyLab, blurb: BIZ.lab.blurb };
      case 'trailer': return S.biz.meth.lvl > 0 ? null : { cost: BIZ.meth.cost, buy: HM.buyMeth, blurb: BIZ.meth.blurb, extra: 'REQUIRES SOME EARNINGS FIRST' };
      case 'lodge':   return S.biz.lodge.lvl > 0 ? null : { cost: BIZ.lodge.cost, buy: HM.buyLodge, blurb: BIZ.lodge.blurb };
      case 'dock':    return S.biz.coke.lvl > 0 ? null : { cost: BIZ.coke.cost, buy: HM.buyCoke, blurb: BIZ.coke.blurb };
      default: return null;
    }
  }

  function badge(id) {
    const S = G.save, now = Date.now();
    if (id === 'still' && S.biz.still.lvl > 0) {
      const acc = stillAccrue(S, now);
      return S.biz.still.stored + acc.jugs > 0;
    }
    if (id === 'farm') return HM.flags.plotsReady > 0 || S.biz.poppy.plots.some(p => p.st === 'empty');
    if (id === 'lab') return HM.flags.labDone;
    if (id === 'lodge' && S.biz.lodge.lvl > 0) return S.biz.lodge.pend + lodgeRate(S) * Math.max(0, now - S.biz.lodge.lastTick) / 1000 >= 25;
    return false;
  }

  function accentOf(id) {
    return { still: '#e8c46a', farm: '#ff7eb0', lab: '#c49aff', trailer: '#7dffb8', lodge: '#ff6ea8', market: '#ffd24a', hideout: '#8aa0c0', dock: '#9adfff' }[id];
  }

  function enter() { t = 0; }

  function update(dt) {
    t += dt;
    const hour = dayHour(), nk = nightK(hour);
    if (nk > 0.5 && Math.random() < dt * 1.2) partEmber(rnd(150, 1150), rnd(380, 660));
    if (nk > 0.6 && Math.random() < dt / 12) SFX.cricket();
    // still smoke
    if (G.save.biz.still.lvl > 0 && Math.random() < dt * 2.2) partPuff(215, 470, 'rgba(220,220,230,0.3)');
    // meth cooking glow puffs while camper owned
    if (G.save.biz.meth.lvl > 0 && Math.random() < dt * 0.6) partPuff(760, 322, 'rgba(125,255,184,0.16)');
  }

  // ---------- landscape ----------
  function landscape(c, hour) {
    const sky = skyAt(hour), nk = nightK(hour);
    // sky
    c.fillStyle = vgrad(c, 0, 0, VW, 300, [[0, sky.top], [1, sky.bot]]);
    c.fillRect(0, 0, VW, 300);
    // sun / moon arc
    const dayFrac = clamp((hour - 6) / 14, 0, 1);
    const sx = lerp(80, VW - 80, dayFrac), sy = 220 - Math.sin(dayFrac * Math.PI) * 170;
    if (nk < 0.9) {
      withGlow(c, '#ffe9a0', 36, () => {
        c.fillStyle = mix('#fff3c4', '#ff9a50', clamp(Math.abs(dayFrac - 0.5) * 2.2 - 0.3, 0, 1));
        c.beginPath(); c.arc(sx, sy, 26, 0, TAU); c.fill();
      });
    }
    if (nk > 0.4) {
      c.globalAlpha = nk;
      withGlow(c, '#fff8e0', 30, () => {
        c.fillStyle = '#f4ecd4';
        c.beginPath(); c.arc(VW * 0.82, 90, 22, 0, TAU); c.fill();
      });
      c.fillStyle = 'rgba(255,255,255,0.8)';
      const r = mulberry32(99);
      for (let i = 0; i < 40; i++) {
        c.globalAlpha = nk * (0.25 + 0.5 * Math.abs(Math.sin(t + i * 1.7)));
        c.fillRect(r() * VW, r() * 240, 2, 2);
      }
      c.globalAlpha = 1;
    }
    cloud(c, ((t * 7) % (VW + 300)) - 150, 70, 1.8, 0.5 - nk * 0.35);
    cloud(c, ((t * 4 + 500) % (VW + 300)) - 150, 130, 1.2, 0.4 - nk * 0.3);
    cloud(c, ((t * 10 + 900) % (VW + 300)) - 150, 40, 2.4, 0.35 - nk * 0.25);

    // far shore ridge
    c.fillStyle = mix('#28406a', '#0e1830', nk);
    c.beginPath();
    c.moveTo(0, 300);
    c.bezierCurveTo(VW * 0.25, 252, VW * 0.5, 286, VW * 0.7, 262);
    c.bezierCurveTo(VW * 0.85, 246, VW * 0.95, 276, VW, 268);
    c.lineTo(VW, 300); c.closePath(); c.fill();
    const rp = mulberry32(31);
    c.fillStyle = mix('#1e3258', '#0a1226', nk);
    for (let i = 0; i < 50; i++) pine(c, rp() * VW, 296 - rp() * 30, 18 + rp() * 22, c.fillStyle);

    // lake
    c.fillStyle = vgrad(c, 0, 300, VW, 420, [[0, mix('#3a78b0', '#101c3a', nk)], [1, mix('#1e4878', '#080f22', nk)]]);
    c.fillRect(0, 300, VW, 420);
    // shimmer
    c.save();
    for (let i = 0; i < 30; i++) {
      const ly = 312 + i * 13;
      const lw = 40 + Math.sin(t * 0.9 + i * 2.1) * 30;
      const lx = (i * 173 + Math.sin(t * 0.5 + i) * 60) % VW;
      c.globalAlpha = 0.1 + 0.06 * Math.sin(t * 2 + i);
      c.fillStyle = nk > 0.5 ? '#8ab0ff' : '#cfe8ff';
      fillRR(c, lx, ly, lw, 2.5, 1, c.fillStyle);
    }
    c.restore();

    // the island: layered landmass
    const gTop = mix('#4a8a4e', '#16301f', nk), gBot = mix('#2e6238', '#0d2014', nk);
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    c.beginPath();
    c.moveTo(95, 470);
    c.bezierCurveTo(110, 360, 260, 318, 420, 330);
    c.bezierCurveTo(560, 300, 760, 296, 900, 330);
    c.bezierCurveTo(1060, 322, 1180, 390, 1190, 480);
    c.bezierCurveTo(1205, 580, 1080, 668, 900, 678);
    c.bezierCurveTo(700, 700, 420, 700, 280, 668);
    c.bezierCurveTo(140, 640, 86, 560, 95, 470);
    c.closePath();
    c.fillStyle = vgrad(c, 0, 300, VW, 400, [[0, gTop], [1, gBot]]);
    c.fill();
    c.restore();
    // sandy shoreline rim
    c.strokeStyle = mix('#d8c890', '#3a3a2e', nk);
    c.lineWidth = 5; c.globalAlpha = 0.55; c.stroke(); c.globalAlpha = 1;

    // dirt roads: hub at the market, spokes to each node
    c.strokeStyle = mix('#a08858', '#352c1e', nk);
    c.lineWidth = 9; c.lineCap = 'round'; c.globalAlpha = 0.5;
    for (const n of NODES) {
      if (n.id === 'market') continue;
      c.beginPath();
      c.moveTo(660, 565);
      c.quadraticCurveTo((660 + n.x) / 2 + (n.y - 565) * 0.18, (565 + n.y) / 2 - (n.x - 660) * 0.08, n.x, n.y + 18);
      c.stroke();
    }
    c.globalAlpha = 1;

    // scattered pines (seeded so the forest doesn't dance)
    const rt = mulberry32(77);
    const treeCol = mix('#1f4a2a', '#0a1f12', nk);
    for (let i = 0; i < 60; i++) {
      const tx = 130 + rt() * 1000, ty = 360 + rt() * 290;
      // keep clearings around the nodes
      if (NODES.some(n => dist(tx, ty, n.x, n.y) < 72)) continue;
      const sway = Math.sin(t * 1.4 + i) * 1.5;
      pine(c, tx + sway, ty, 24 + rt() * 26, treeCol);
    }
  }

  // ---------- building painters ----------
  function bStill(c, x, y, on, nk) {
    // copper pot + coil
    c.fillStyle = on ? '#c08038' : '#5a5048';
    c.beginPath(); c.ellipse(x, y - 14, 20, 22, 0, 0, TAU); c.fill();
    c.fillStyle = on ? '#a06a2a' : '#4a423c';
    c.beginPath(); c.ellipse(x, y - 30, 9, 8, 0, 0, TAU); c.fill();
    c.strokeStyle = on ? '#d89848' : '#6a6058'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x + 8, y - 32); c.bezierCurveTo(x + 34, y - 38, x + 36, y - 10, x + 26, y + 2); c.stroke();
    c.fillStyle = '#6a5238';
    c.fillRect(x - 24, y + 2, 48, 7); // bench
    if (on && nk > 0.4) withGlow(c, '#ffb050', 16, () => { c.fillStyle = rgba('#ffb050', 0.85); c.fillRect(x - 6, y - 4, 12, 6); });
  }
  function bFarm(c, x, y, S, nk) {
    const plots = S.biz.poppy.plots;
    const now = Date.now();
    for (let i = 0; i < Math.max(1, plots.length); i++) {
      const px = x - 42 + (i % 3) * 42, py = y - 14 + Math.floor(i / 3) * 26;
      fillRR(c, px - 16, py - 8, 34, 18, 4, plots[i] ? mix('#5a4030', '#241a12', nk) : 'rgba(60,50,40,0.35)');
      const p = plots[i];
      if (p && p.st !== 'empty') {
        const k = p.st === 'ready' ? 1 : clamp((now - p.t0) / (growDur(S) * 1000), 0, 1);
        for (let j = 0; j < 5; j++) {
          const fx = px - 12 + j * 7, fh = 4 + k * 9;
          c.strokeStyle = '#3a7a40'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(fx, py + 8); c.lineTo(fx, py + 8 - fh); c.stroke();
          if (k > 0.45) {
            c.fillStyle = k >= 1 ? '#ff5a8a' : '#d88ab8';
            c.beginPath(); c.arc(fx, py + 8 - fh, k >= 1 ? 3.2 : 2.2, 0, TAU); c.fill();
          }
        }
      }
    }
  }
  function bCabin(c, x, y, accent, on, nk, wide) {
    const w = wide ? 76 : 56, h = 34;
    c.fillStyle = mix('#6a4a32', '#2a1e14', nk);
    fillRR(c, x - w / 2, y - h, w, h, 4, c.fillStyle);
    c.fillStyle = mix('#4a3422', '#1c1610', nk);
    c.beginPath(); c.moveTo(x - w / 2 - 7, y - h + 2); c.lineTo(x, y - h - 22); c.lineTo(x + w / 2 + 7, y - h + 2); c.closePath(); c.fill();
    // window
    const wl = on && nk > 0.35;
    if (wl) withGlow(c, '#ffd080', 14, () => { c.fillStyle = '#ffd080'; c.fillRect(x - 8, y - 22, 16, 12); });
    else { c.fillStyle = 'rgba(180,200,230,0.5)'; c.fillRect(x - 8, y - 22, 16, 12); }
    if (accent) { c.fillStyle = accent; c.fillRect(x - w / 2, y - 4, w, 4); }
  }
  function bTrailer(c, x, y, on, nk) {
    const sh = on ? Math.sin(t * 22) * 1.2 : 0;
    c.save(); c.translate(sh, 0);
    fillRR(c, x - 38, y - 30, 76, 30, 10, mix('#c8c8c8', '#4a4f5a', nk * 0.8));
    c.fillStyle = mix('#9aa4b0', '#3a3f48', nk);
    fillRR(c, x - 38, y - 30, 76, 9, 8, c.fillStyle);
    const wl = on || nk > 0.4;
    if (wl) withGlow(c, '#7dffb8', on ? 18 : 8, () => { c.fillStyle = rgba('#7dffb8', on ? 0.95 : 0.5); c.fillRect(x - 22, y - 22, 14, 9); c.fillRect(x + 8, y - 22, 14, 9); });
    c.fillStyle = '#22262e';
    c.beginPath(); c.arc(x - 20, y + 2, 6, 0, TAU); c.arc(x + 20, y + 2, 6, 0, TAU); c.fill();
    c.restore();
  }
  function bLodge(c, x, y, nk) {
    bCabin(c, x - 18, y, null, true, nk, true);
    bCabin(c, x + 30, y + 4, null, true, nk);
    // neon sign
    const flick = Math.sin(t * 9 + 2) > -0.9 ? 1 : 0.3;
    const ny = y - 64;
    c.strokeStyle = '#6a5a4a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 2, ny + 18); c.lineTo(x - 2, y - 38); c.stroke();
    withGlow(c, '#ff6ea8', 20 * flick, () => {
      fillRR(c, x - 36, ny - 6, 68, 24, 6, 'rgba(20,8,16,0.9)');
      txt(c, 'LODGE', x - 2, ny + 11, { size: 15, weight: 900, color: rgba('#ff8ec0', flick), align: 'center', spacing: 2 });
    });
    strokeRR(c, x - 36, ny - 6, 68, 24, 6, rgba('#ff6ea8', 0.8 * flick), 1.5);
  }
  function bMarket(c, x, y, nk) {
    const cols = ['#b05a4a', '#4a7a9a', '#7a6a4a'];
    for (let i = 0; i < 3; i++) {
      const bx = x - 52 + i * 36;
      fillRR(c, bx, y - 30 + (i % 2) * 4, 32, 30 - (i % 2) * 4, 3, mix(cols[i], '#201a16', nk * 0.75));
      c.fillStyle = mix('#e8e0d0', '#3a352c', nk);
      c.fillRect(bx, y - 34 + (i % 2) * 4, 32, 5);
      if (nk > 0.35) withGlow(c, '#ffd080', 10, () => { c.fillStyle = '#ffd080'; c.fillRect(bx + 10, y - 20, 12, 9); });
    }
  }
  function bHideout(c, x, y, nk) {
    c.fillStyle = mix('#4a4438', '#1e1c14', nk);
    c.beginPath(); c.moveTo(x - 28, y); c.lineTo(x, y - 26); c.lineTo(x + 28, y); c.closePath(); c.fill();
    fillRR(c, x - 12, y - 12, 24, 12, 2, mix('#2c2820', '#12100c', nk));
    c.strokeStyle = '#8a8478'; c.lineWidth = 2;
    c.strokeRect(x - 9, y - 9, 18, 9);
  }
  function bDock(c, x, y, on, nk) {
    c.fillStyle = mix('#8a6a48', '#33281a', nk);
    fillRR(c, x - 10, y - 6, 86, 12, 3, c.fillStyle);
    for (let i = 0; i < 4; i++) c.fillRect(x + i * 24, y + 4, 5, 10);
    // boat
    const bob = Math.sin(t * 1.6) * 2;
    c.save(); c.translate(x + 64, y + 16 + bob);
    c.fillStyle = on ? '#3a6a9a' : '#4a5560';
    c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(0, 12, 26, 0); c.lineTo(18, -7); c.lineTo(-16, -7); c.closePath(); c.fill();
    if (on && nk > 0.4) withGlow(c, '#9adfff', 10, () => { c.fillStyle = '#9adfff'; c.fillRect(-4, -12, 6, 5); });
    c.restore();
  }

  function drawNode(c, n, nk) {
    const S = G.save;
    const lock = lockInfo(n.id);
    const accent = accentOf(n.id);
    const hb = UI.hit('node_' + n.id, n.x - 70, n.y - 78, 140, 120, null);
    const k = hb.k;

    c.save();
    if (lock) c.globalAlpha = 0.55;
    c.translate(0, -k * 4);
    // hover ring
    if (k > 0.02) {
      c.save(); c.globalAlpha = k * 0.85;
      withGlow(c, accent, 18, () => {
        c.strokeStyle = rgba(accent, 0.9); c.lineWidth = 2.5;
        c.beginPath(); c.ellipse(n.x, n.y + 14, 64 + k * 4, 24 + k * 2, 0, 0, TAU); c.stroke();
      });
      c.restore();
    }
    const on = !lock;
    if (n.id === 'still') bStill(c, n.x, n.y, on, nk);
    else if (n.id === 'farm') bFarm(c, n.x, n.y, S, nk);
    else if (n.id === 'lab') bCabin(c, n.x, n.y, on ? '#c49aff' : null, on, nk, true);
    else if (n.id === 'trailer') bTrailer(c, n.x, n.y, on && !!S.biz.meth.lvl, nk);
    else if (n.id === 'lodge') { if (on) bLodge(c, n.x, n.y, nk); else bCabin(c, n.x, n.y, null, false, nk, true); }
    else if (n.id === 'market') bMarket(c, n.x, n.y, nk);
    else if (n.id === 'hideout') bHideout(c, n.x, n.y, nk);
    else if (n.id === 'dock') bDock(c, n.x, n.y, on, nk);
    c.restore();

    // label chip
    const lw = txtW(c, n.name, 13, 800) + 22;
    const ly = n.y + 26;
    c.save();
    c.globalAlpha = 0.65 + k * 0.35;
    fillRR(c, n.x - lw / 2, ly, lw, 22, 11, 'rgba(8,12,22,0.85)');
    strokeRR(c, n.x - lw / 2, ly, lw, 22, 11, rgba(accent, 0.3 + 0.6 * k), 1);
    txt(c, n.name, n.x, ly + 15, { size: 13, weight: 800, color: lock ? 'rgba(200,210,230,0.6)' : '#eaf2ff', align: 'center', spacing: 1 });
    c.restore();
    if (lock) {
      const pw = txtW(c, money(lock.cost), 13, 800) + 20;
      fillRR(c, n.x - pw / 2, ly + 26, pw, 20, 10, 'rgba(8,12,22,0.9)');
      txt(c, money(lock.cost), n.x, ly + 40, { size: 13, weight: 800, color: G.save.cash >= lock.cost ? '#7dffa8' : '#ff8a7a', align: 'center' });
    } else if (badge(n.id)) {
      const pulse = 1 + Math.sin(G.t * 6) * 0.18;
      c.save();
      withGlow(c, '#ffd24a', 16, () => {
        c.fillStyle = '#ffd24a';
        c.beginPath(); c.arc(n.x + 46, n.y - 48, 9 * pulse, 0, TAU); c.fill();
      });
      txt(c, '!', n.x + 46, n.y - 44, { size: 13, weight: 900, color: '#241a00', align: 'center' });
      c.restore();
    }

    if (hb.clicked) {
      SFX.click();
      if (lock) {
        openModal({
          title: n.name, accent,
          body: [...wrapLines(lock.blurb, 50), '', 'BUY IN: ' + money(lock.cost) + (lock.extra ? '  (' + lock.extra + ')' : '')],
          buttons: [
            { label: 'BUY ' + money(lock.cost), color: accent, disabled: G.save.cash < lock.cost, cb: () => { lock.buy(); } },
            { label: 'NOT YET', color: '#8aa0c0' },
          ],
        });
      } else {
        const target = { still: 'biz_still', farm: 'biz_farm', lab: 'biz_lab', trailer: 'biz_meth', lodge: 'biz_lodge', market: 'market', hideout: 'biz_hideout', dock: 'biz_dock' }[n.id];
        if (!maybeInspect()) setScene(target);
      }
    }
  }

  // ---------- OPP cruiser ----------
  function cruiser(c, nk) {
    if (G.save.heat < 25) return;
    const k = (t * 0.05) % 1;
    const px = lerp(120, 1160, k), py = 640 + Math.sin(k * 9) * 10;
    c.save();
    fillRR(c, px - 20, py - 12, 40, 12, 4, '#dde4ec');
    fillRR(c, px - 12, py - 19, 22, 9, 3, '#dde4ec');
    const strobe = Math.floor(t * 6) % 2;
    withGlow(c, strobe ? '#ff4a4a' : '#4a8aff', 12, () => {
      c.fillStyle = strobe ? '#ff4a4a' : '#4a8aff';
      c.fillRect(px - 6, py - 23, 5, 4); c.fillRect(px + 1, py - 23, 5, 4);
    });
    if (nk > 0.4) {
      c.globalAlpha = 0.25 * nk;
      c.fillStyle = '#fff8c0';
      c.beginPath(); c.moveTo(px + 20, py - 8); c.lineTo(px + 70, py - 16); c.lineTo(px + 70, py + 2); c.closePath(); c.fill();
    }
    c.restore();
  }

  // ---------- HUD ----------
  function hud(c) {
    const S = G.save;
    // cash card
    UI.card(c, 18, 16, 250, 76, {});
    txt(c, 'CASH', 36, 42, { size: 13, weight: 700, color: 'rgba(190,210,235,0.6)', spacing: 2 });
    const shown = UI.num('cash', S.cash);
    txtGlow(c, money(shown), 36, 74, { size: 30, weight: 900, color: '#7dffa8', glow: '#1a6a3a', blur: 10 });

    // heat
    const hx = 292, hw = 330;
    UI.card(c, hx, 16, hw, 76, {});
    txt(c, 'OPP HEAT', hx + 18, 42, { size: 13, weight: 700, color: 'rgba(190,210,235,0.6)', spacing: 2 });
    const hcol = S.heat < 40 ? '#7dffa8' : S.heat < 75 ? '#ffb04a' : '#ff5a5a';
    UI.bar(c, hx + 18, 52, hw - 96, 18, S.heat / 100, hcol, { glow: S.heat >= 75 });
    txt(c, Math.round(S.heat), hx + hw - 38, 67, { size: 22, weight: 900, color: hcol, align: 'center' });
    if (S.heat >= 75 && Math.floor(G.t * 3) % 2 === 0) {
      txtGlow(c, 'RAID RISK', hx + hw - 38, 36, { size: 11, weight: 900, color: '#ff5a5a', glow: '#ff5a5a', blur: 8, align: 'center' });
    }
    if (Date.now() < S.layLowUntil) txt(c, 'LAYING LOW ' + fmtDur((S.layLowUntil - Date.now()) / 1000), hx + 18, 86, { size: 11, weight: 700, color: '#9ab' });

    // day / event chip
    const ev = G.market.event;
    const dw = 360;
    UI.card(c, VW - dw - 18, 16, dw, 76, {});
    txt(c, 'DAY ' + (S.records.days + 1) + ' — ' + ev.name, VW - dw + 0, 42, { size: 15, weight: 800, color: '#ffd24a', spacing: 1 });
    txt(c, 'HOT TODAY: ' + PRODUCTS[G.market.hot].name + ' (2X)', VW - dw + 0, 64, { size: 13, weight: 700, color: PRODUCTS[G.market.hot].color });
    txt(c, RANKS[S.rank].name, VW - dw + 0, 84, { size: 12, weight: 700, color: 'rgba(190,210,235,0.55)', spacing: 1 });

    // next goal carrot
    const goal = nextGoal();
    if (goal) {
      const gtxt = 'NEXT: ' + goal.name + ' — ' + money(goal.cost - S.cash) + ' TO GO';
      const gw = txtW(c, gtxt, 14, 700) + 36;
      fillRR(c, 18, VH - 46, gw, 30, 15, 'rgba(8,12,22,0.85)');
      strokeRR(c, 18, VH - 46, gw, 30, 15, 'rgba(255,210,74,0.35)', 1);
      txt(c, gtxt, 36, VH - 26, { size: 14, weight: 700, color: '#ffd24a' });
    }
    // stats button
    if (UI.button(c, 'hud_stats', VW - 130, VH - 52, 112, 36, { label: 'RECORDS', color: '#8aa0c0', size: 14, ghost: true })) {
      setScene('stats');
    }
  }

  function draw(c) {
    const hour = dayHour(), nk = nightK(hour);
    landscape(c, hour);
    // nodes sorted by y for painter's order
    const sorted = [...NODES].sort((a, b) => a.y - b.y);
    for (const n of sorted) drawNode(c, n, nk);
    cruiser(c, nk);
    // fog event haze
    if (G.market.event.fx.fog) {
      c.fillStyle = 'rgba(190,205,220,0.13)';
      c.fillRect(0, 0, VW, VH);
      cloud(c, (t * 18) % (VW + 400) - 200, 480, 4.5, 0.1);
      cloud(c, (t * 12 + 600) % (VW + 400) - 200, 600, 5.5, 0.09);
    }
    vignette(c);
    hud(c);
  }

  return { enter, update, draw };
})();
