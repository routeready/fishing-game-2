'use strict';
// Management panels for every business, the hideout, and the records wall.
// All share one chrome: dim island backdrop, header card, BACK pill.

function bizChrome(c, title, accent, blurb) {
  // backdrop
  c.fillStyle = vgrad(c, 0, 0, VW, VH, [[0, '#0c1422'], [1, '#070b14']]);
  c.fillRect(0, 0, VW, VH);
  // faint ridge flavor
  c.save(); c.globalAlpha = 0.18;
  const r = mulberry32(5);
  for (let i = 0; i < 26; i++) pine(c, r() * VW, VH - 10 - r() * 40, 50 + r() * 60, '#15243a');
  c.restore();
  // header
  UI.card(c, 60, 36, VW - 120, 86, {});
  txtGlow(c, title, 92, 92, { size: 34, weight: 900, color: accent, glow: accent, blur: 14, spacing: 2 });
  txt(c, blurb, VW - 92, 88, { size: 15, weight: 600, color: 'rgba(190,205,230,0.55)', align: 'right' });
  // back
  if (UI.button(c, 'biz_back', VW - 196, 48, 120, 44, { label: 'BACK', color: '#8aa0c0', ghost: true, size: 16 }) || HM.pressed('back')) {
    SFX.back(); setScene('island');
  }
}

// inventory strip along the bottom
function invStrip(c) {
  const S = G.save;
  const items = [['shine', S.inv.shine], ['opium', S.inv.opium], ['heroin', S.inv.heroin], ['meth', S.inv.meth], ['coke', S.inv.coke]];
  let x = 60;
  const y = VH - 64;
  txt(c, 'STASH:', x, y + 26, { size: 14, weight: 800, color: 'rgba(190,205,230,0.5)' });
  x += 70;
  for (const [id, n] of items) {
    if (n <= 0 && id !== 'shine') continue;
    const p = PRODUCTS[id];
    const w = txtW(c, n + ' ' + p.unit, 14, 800) + 40;
    fillRR(c, x, y, w, 40, 20, 'rgba(10,16,28,0.85)');
    strokeRR(c, x, y, w, 40, 20, rgba(p.color, 0.4), 1);
    c.fillStyle = p.color;
    c.beginPath(); c.arc(x + 18, y + 20, 6, 0, TAU); c.fill();
    txt(c, n + ' ' + p.unit, x + 32, y + 26, { size: 14, weight: 800, color: '#eaf2ff' });
    x += w + 12;
  }
  if (G.save.inv.kgRaw > 0) {
    const w = 140;
    fillRR(c, x, y, w, 40, 20, 'rgba(10,16,28,0.85)');
    txt(c, S.inv.kgRaw + ' KG RAW', x + 20, y + 26, { size: 14, weight: 800, color: '#9adfff' });
  }
}

function upgradeRow(c, bizId, x, y, w) {
  const list = BIZ[bizId].upgrades || [];
  let yy = y;
  txt(c, 'UPGRADES', x, yy, { size: 14, weight: 800, color: 'rgba(190,205,230,0.5)', spacing: 2 });
  yy += 14;
  for (const up of list) {
    const owned = G.save.biz[bizId].up[up.id];
    if (owned) {
      fillRR(c, x, yy, w, 52, 12, 'rgba(125,255,168,0.07)');
      strokeRR(c, x, yy, w, 52, 12, 'rgba(125,255,168,0.3)', 1);
      txt(c, '✓ ' + up.name, x + 18, yy + 24, { size: 16, weight: 800, color: '#7dffa8' });
      txt(c, up.desc, x + 18, yy + 42, { size: 13, weight: 600, color: 'rgba(190,205,230,0.5)' });
    } else if (UI.button(c, 'up_' + bizId + '_' + up.id, x, yy, w, 52,
        { label: up.name + ' — ' + money(up.cost), sub: up.desc, color: BIZ[bizId].accent, size: 16, disabled: G.save.cash < up.cost })) {
      HM.buyUpgrade(bizId, up);
    }
    yy += 62;
  }
  return yy;
}

// ---------- THE STILL ----------
HM.scenes.biz_still = {
  enter() {},
  update(dt) {},
  draw(c) {
    bizChrome(c, 'THE STILL', '#e8c46a', BIZ.still.blurb);
    const S = G.save, st = S.biz.still, now = Date.now();
    const tier = stillTier(S);
    const acc = stillAccrue(S, now);
    const stored = st.stored + acc.jugs;

    UI.card(c, 60, 150, 560, 360, { title: 'PRODUCTION' });
    // big copper pot art
    const cx = 200, cy = 330;
    c.save();
    withGlow(c, '#e8c46a', 16, () => {
      c.fillStyle = '#c08038';
      c.beginPath(); c.ellipse(cx, cy, 64, 72, 0, 0, TAU); c.fill();
    });
    c.fillStyle = '#a06a2a'; c.beginPath(); c.ellipse(cx, cy - 78, 26, 20, 0, 0, TAU); c.fill();
    c.strokeStyle = '#d89848'; c.lineWidth = 9;
    c.beginPath(); c.moveTo(cx + 24, cy - 84); c.bezierCurveTo(cx + 110, cy - 100, cx + 120, cy - 10, cx + 88, cy + 30); c.stroke();
    // drip
    const dripK = (now / 1000 * 1.4) % 1;
    c.fillStyle = '#f0e0a0';
    c.beginPath(); c.arc(cx + 88, cy + 36 + dripK * 26, 4, 0, TAU); c.fill();
    fillRR(c, cx + 70, cy + 66, 36, 30, 5, '#8a6a3a');
    c.restore();
    if (Math.random() < 0.04) partPuff(cx, cy - 96, 'rgba(230,225,210,0.3)');

    // numbers
    txt(c, 'JUGS READY', 360, 220, { size: 14, weight: 700, color: 'rgba(190,205,230,0.55)', spacing: 2 });
    txtGlow(c, stored + ' / ' + tier.cap, 360, 262, { size: 38, weight: 900, color: '#e8c46a', glow: '#7a5a1a', blur: 10 });
    const per = tier.dur * 1000;
    const prog = stored >= tier.cap ? 1 : ((now - acc.newT0) % per) / per;
    txt(c, stored >= tier.cap ? 'STORAGE FULL' : 'NEXT JUG IN ' + fmtDur((per - (now - acc.newT0) % per) / 1000), 360, 292, { size: 14, weight: 600, color: '#c4d2e8' });
    UI.bar(c, 360, 304, 220, 14, prog, '#e8c46a', { glow: stored >= tier.cap });
    txt(c, '1 JUG / ' + tier.dur + 'S  ·  WORTH ~' + money(HM.priceOf('shine') * tier.mult), 360, 344, { size: 13, weight: 600, color: 'rgba(190,205,230,0.5)' });

    if (UI.button(c, 'still_collect', 360, 380, 220, 58,
        { label: 'COLLECT ' + stored + ' JUG' + (stored === 1 ? '' : 'S'), color: '#e8c46a', size: 17, disabled: stored <= 0 })) {
      const n = HM.collectStill(now);
      if (n > 0) { partFloat('+' + n + ' SHINE', 470, 380, '#e8c46a', { glow: true }); toast('SELL IT AT THE TOWN STRIP', '#e8c46a'); }
    }
    txt(c, 'MOONSHINE SELLS AT THE TOWN STRIP. PETE IS THIRSTY.', 90, 480, { size: 14, weight: 600, color: 'rgba(190,205,230,0.5)' });

    // upgrades = next tier
    UI.card(c, 660, 150, 560, 360, { title: 'IMPROVEMENTS' });
    let yy = 210;
    for (let i = 1; i < BIZ.still.tiers.length; i++) {
      const tr = BIZ.still.tiers[i];
      if (st.lvl > i) {
        fillRR(c, 690, yy, 500, 52, 12, 'rgba(125,255,168,0.07)');
        txt(c, '✓ ' + tr.name, 708, yy + 32, { size: 16, weight: 800, color: '#7dffa8' });
      } else if (st.lvl === i) {
        if (UI.button(c, 'still_tier_' + i, 690, yy, 500, 52,
            { label: tr.name + ' — ' + money(tr.cost), sub: tr.dur + 'S/JUG · CAP ' + tr.cap + (tr.mult > 1 ? ' · PRICE +50%' : ''), color: '#e8c46a', size: 16, disabled: S.cash < tr.cost })) {
          HM.buyStillTier();
        }
      } else {
        fillRR(c, 690, yy, 500, 52, 12, 'rgba(120,130,150,0.06)');
        txt(c, tr.name + ' — ' + money(tr.cost), 708, yy + 32, { size: 16, weight: 700, color: 'rgba(190,205,230,0.3)' });
      }
      yy += 64;
    }
    invStrip(c);
    vignette(c);
  },
};

// ---------- POPPY FIELD ----------
HM.scenes.biz_farm = {
  enter() {},
  update(dt) {},
  draw(c) {
    bizChrome(c, 'POPPY FIELD', '#ff7eb0', BIZ.poppy.blurb);
    const S = G.save, P = S.biz.poppy, now = Date.now();
    UI.card(c, 60, 150, 760, 470, { title: 'PLOTS — ' + S.inv.opium + ' OZ POPPY GUM IN THE SHED' });
    for (let i = 0; i < BIZ.poppy.plotCosts.length; i++) {
      const px = 92 + (i % 3) * 240, py = 210 + Math.floor(i / 3) * 190;
      const p = P.plots[i];
      fillRR(c, px, py, 216, 168, 14, p ? 'rgba(90,64,48,0.5)' : 'rgba(60,70,90,0.18)');
      strokeRR(c, px, py, 216, 168, 14, p ? 'rgba(255,126,176,0.35)' : 'rgba(255,255,255,0.08)', 1.5);
      if (!p) {
        if (i === P.plots.length) {
          if (UI.button(c, 'plot_buy_' + i, px + 28, py + 58, 160, 52,
              { label: 'CLEAR PLOT', sub: money(BIZ.poppy.plotCosts[i]), color: '#ff7eb0', disabled: S.cash < BIZ.poppy.plotCosts[i] })) {
            HM.buyPlot();
          }
        } else {
          txt(c, 'OVERGROWN', px + 108, py + 90, { size: 15, weight: 700, color: 'rgba(190,205,230,0.25)', align: 'center' });
        }
        continue;
      }
      // soil rows + flowers by state
      const gk = p.st === 'ready' ? 1 : p.st === 'grow' ? clamp((now - p.t0) / (growDur(S) * 1000), 0, 1) : 0;
      for (let rI = 0; rI < 3; rI++) {
        c.fillStyle = 'rgba(40,28,20,0.8)';
        fillRR(c, px + 18, py + 26 + rI * 34, 180, 14, 7, c.fillStyle);
        if (p.st !== 'empty') {
          for (let f = 0; f < 7; f++) {
            const fx = px + 30 + f * 26, fy = py + 32 + rI * 34;
            const h = 4 + gk * 16;
            c.strokeStyle = '#3a8a48'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.sin(G.t * 2 + f + rI) * 2, fy - h); c.stroke();
            if (gk > 0.4) {
              c.fillStyle = gk >= 1 ? '#ff5a8a' : '#d88ab8';
              c.beginPath(); c.arc(fx + Math.sin(G.t * 2 + f + rI) * 2, fy - h, gk >= 1 ? 5 : 3, 0, TAU); c.fill();
            }
          }
        }
      }
      if (p.st === 'empty') {
        if (UI.button(c, 'plot_plant_' + i, px + 38, py + 118, 140, 38, { label: 'PLANT — $' + BIZ.poppy.seed, color: '#ff7eb0', size: 14, disabled: S.cash < BIZ.poppy.seed })) {
          HM.plantPlot(i, now);
        }
      } else if (p.st === 'grow') {
        UI.bar(c, px + 24, py + 132, 168, 12, gk, '#ff7eb0');
        txt(c, fmtDur((growDur(S) * 1000 - (now - p.t0)) / 1000), px + 108, py + 158, { size: 13, weight: 700, color: '#ffb4d0', align: 'center' });
      } else {
        if (UI.button(c, 'plot_harv_' + i, px + 28, py + 118, 160, 40, { label: 'HARVEST!', color: '#ffd24a', size: 16, badge: true })) {
          setScene('harvest', { plot: i });
        }
      }
    }
    UI.card(c, 860, 150, 360, 320, {});
    upgradeRow(c, 'poppy', 890, 196, 300);
    txt(c, '10 OZ GUM = 1 COOK', 890, 420, { size: 14, weight: 700, color: 'rgba(190,205,230,0.5)' });
    txt(c, 'AT THE BUNKHOUSE LAB', 890, 440, { size: 14, weight: 700, color: 'rgba(190,205,230,0.5)' });
    invStrip(c);
    vignette(c);
  },
};

// ---------- BUNKHOUSE LAB ----------
HM.scenes.biz_lab = {
  enter() {},
  update(dt) { if (G.save.biz.lab.job && Math.random() < dt * 3) partPuff(330, 300, 'rgba(196,154,255,0.25)'); },
  draw(c) {
    bizChrome(c, 'BUNKHOUSE LAB', '#c49aff', BIZ.lab.blurb);
    const S = G.save, L = S.biz.lab, now = Date.now();
    UI.card(c, 60, 150, 560, 400, { title: 'THE COOK' });
    // glassware art
    const bx = 200, by = 400;
    c.save();
    c.strokeStyle = 'rgba(220,210,255,0.7)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(bx - 40, by - 110); c.lineTo(bx - 40, by - 40); c.lineTo(bx - 70, by); c.lineTo(bx - 10, by); c.lineTo(bx - 40, by - 40); c.stroke();
    c.fillStyle = rgba('#c49aff', 0.5);
    c.beginPath(); c.moveTo(bx - 62, by - 6); c.lineTo(bx - 18, by - 6); c.lineTo(bx - 40, by - 36); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(220,210,255,0.5)';
    c.beginPath(); c.arc(bx + 60, by - 50, 36, 0, TAU); c.stroke();
    c.fillStyle = rgba('#c49aff', 0.35);
    c.beginPath(); c.arc(bx + 60, by - 50, 36, 0.3, Math.PI - 0.3); c.fill();
    if (L.job) {
      const bk = (G.t * 2) % 1;
      c.fillStyle = rgba('#e0ccff', 0.8);
      c.beginPath(); c.arc(bx + 44 + bk * 10, by - 60 - bk * 28, 3 + bk * 2, 0, TAU); c.fill();
    }
    c.restore();

    txt(c, 'POPPY GUM: ' + S.inv.opium + ' OZ', 360, 230, { size: 17, weight: 800, color: '#ffb4d0' });
    if (L.job) {
      const k = clamp((now - L.job.t0) / L.job.dur, 0, 1);
      txt(c, k >= 1 ? 'BATCH READY' : 'COOKING…', 360, 280, { size: 15, weight: 700, color: '#c49aff' });
      UI.bar(c, 360, 296, 220, 16, k, '#c49aff', { glow: k >= 1 });
      txt(c, 'QUALITY ' + Math.round(L.job.q * 100) + '% · ' + L.job.n + ' BATCH' + (L.job.n > 1 ? 'ES' : ''), 360, 340, { size: 13, weight: 600, color: 'rgba(190,205,230,0.6)' });
      if (k < 1) txt(c, fmtDur((L.job.dur - (now - L.job.t0)) / 1000) + ' LEFT', 360, 360, { size: 13, weight: 600, color: 'rgba(190,205,230,0.6)' });
      if (UI.button(c, 'lab_collect', 360, 380, 220, 56, { label: 'COLLECT BATCH', color: '#c49aff', size: 16, disabled: k < 1 })) {
        const n = HM.collectLab(now);
        if (n > 0) partFloat('+' + n + ' HEROIN', 470, 380, '#c49aff', { glow: true });
      }
    } else {
      txt(c, 'EACH COOK EATS ' + BIZ.lab.opiumPer + ' OZ OF GUM.', 360, 280, { size: 14, weight: 600, color: 'rgba(190,205,230,0.6)' });
      txt(c, 'YOUR HANDS ON THE NEEDLES SET THE QUALITY.', 360, 302, { size: 14, weight: 600, color: 'rgba(190,205,230,0.6)' });
      if (UI.button(c, 'lab_start', 360, 330, 220, 58, { label: 'START A COOK', sub: BIZ.lab.opiumPer + ' OZ GUM', color: '#c49aff', size: 17, disabled: S.inv.opium < BIZ.lab.opiumPer })) {
        setScene('cook');
      }
    }
    UI.card(c, 660, 150, 560, 280, {});
    upgradeRow(c, 'lab', 690, 196, 500);
    invStrip(c);
    vignette(c);
  },
};

// ---------- CAMPER LAB (METH) ----------
HM.scenes.biz_meth = {
  enter() {},
  update(dt) {},
  draw(c) {
    bizChrome(c, 'CAMPER LAB', '#7dffb8', BIZ.meth.blurb);
    const S = G.save;
    UI.card(c, 60, 150, 560, 400, { title: 'COOK SHIFT' });
    // camper art
    const cx = 230, cy = 330;
    c.save();
    fillRR(c, cx - 110, cy - 70, 220, 90, 22, '#cfd4dc');
    fillRR(c, cx - 110, cy - 70, 220, 26, 20, '#9aa4b0');
    withGlow(c, '#7dffb8', 18, () => {
      c.fillStyle = rgba('#7dffb8', 0.9);
      fillRR(c, cx - 66, cy - 38, 44, 26, 5, c.fillStyle);
      fillRR(c, cx + 22, cy - 38, 44, 26, 5, c.fillStyle);
    });
    c.fillStyle = '#22262e';
    c.beginPath(); c.arc(cx - 58, cy + 26, 16, 0, TAU); c.arc(cx + 58, cy + 26, 16, 0, TAU); c.fill();
    c.fillStyle = '#454c58';
    c.beginPath(); c.arc(cx - 58, cy + 26, 7, 0, TAU); c.arc(cx + 58, cy + 26, 7, 0, TAU); c.fill();
    c.restore();
    if (Math.random() < 0.05) partPuff(cx + 96, cy - 80, 'rgba(125,255,184,0.2)');

    txt(c, 'SUPPLIES: ' + money(BIZ.meth.supplies) + ' A COOK', 92, 480, { size: 15, weight: 700, color: '#c4d2e8' });
    txt(c, 'HOLD THE BURNER IN THE GREEN. DO NOT REDLINE HER.', 92, 506, { size: 14, weight: 600, color: 'rgba(190,205,230,0.55)' });
    if (UI.button(c, 'meth_cook', 380, 200, 200, 60, { label: 'FIRE UP', sub: money(BIZ.meth.supplies) + ' SUPPLIES', color: '#7dffb8', size: 18, disabled: S.cash < BIZ.meth.supplies })) {
      if (HM.spend(BIZ.meth.supplies)) setScene('methcook');
    }
    txt(c, 'COOKS: ' + S.records.cooks + '   EXPLOSIONS: ' + S.records.booms, 380, 290, { size: 13, weight: 700, color: 'rgba(190,205,230,0.5)' });

    UI.card(c, 660, 150, 560, 320, {});
    upgradeRow(c, 'meth', 690, 196, 500);
    invStrip(c);
    vignette(c);
  },
};

// ---------- THE LODGE ----------
HM.scenes.biz_lodge = {
  enter() {},
  update(dt) {},
  draw(c) {
    bizChrome(c, 'THE LODGE', '#ff6ea8', BIZ.lodge.blurb);
    const S = G.save, L = S.biz.lodge, now = Date.now();
    const cap = L.up.wing ? 6 : BIZ.lodge.maxGirls;
    const lodgeX = G.market.event.fx.lodge || 1;

    // income card
    UI.card(c, 60, 150, 380, 200, { title: 'THE TILL' });
    const pend = L.pend + lodgeRate(S) * Math.max(0, now - L.lastTick) / 1000 * lodgeX;
    txtGlow(c, money(pend), 90, 240, { size: 40, weight: 900, color: '#ff8ec0', glow: '#80254a', blur: 12 });
    txt(c, money(lodgeRate(S) * 60 * lodgeX) + ' / MIN', 90, 270, { size: 14, weight: 700, color: 'rgba(190,205,230,0.6)' });
    if (UI.button(c, 'lodge_collect', 90, 286, 320, 48, { label: 'COLLECT', color: '#ff6ea8', size: 16, disabled: pend < 1 })) {
      const got = HM.collectLodge(now);
      if (got > 0) earn(got, 250, 300);
    }

    // staff card
    UI.card(c, 60, 370, 700, 300, { title: 'THE GIRLS (' + L.girls.length + '/' + cap + ')' });
    let yy = 432;
    if (!L.girls.length) txt(c, 'NOBODY HOME. HIRE FROM THE ROSTER →', 92, 460, { size: 15, weight: 600, color: 'rgba(190,205,230,0.5)' });
    L.girls.forEach((g, i) => {
      portrait(c, 110, yy + 18, 24, g.face, '#1a1018');
      txt(c, g.name, 148, yy + 12, { size: 17, weight: 900, color: '#ffd0e4' });
      txt(c, '$' + g.rate + '/MIN', 148, yy + 32, { size: 13, weight: 700, color: 'rgba(190,205,230,0.6)' });
      const mcol = g.mood > 60 ? '#7dffa8' : g.mood > 35 ? '#ffb04a' : '#ff5a5a';
      UI.bar(c, 280, yy + 4, 160, 14, g.mood / 100, mcol);
      txt(c, 'MOOD', 280, yy + 34, { size: 11, weight: 700, color: 'rgba(190,205,230,0.45)', spacing: 1 });
      if (UI.button(c, 'girl_gift_' + i, 470, yy - 4, 110, 38, { label: 'GIFT $200', color: '#ff6ea8', size: 13, disabled: S.cash < 200 })) HM.girlAction(i, 'gift');
      if (UI.button(c, 'girl_spa_' + i, 592, yy - 4, 110, 38, { label: 'SPA $500', color: '#ff6ea8', size: 13, disabled: S.cash < 500 })) HM.girlAction(i, 'spa');
      yy += 64;
    });
    if (L.girls.length && UI.button(c, 'lodge_tub', 470, 612, 232, 42, { label: 'FIX HOT TUB — $1,000', sub: 'ALL MOODS +15', color: '#ff6ea8', size: 14, disabled: S.cash < 1000 })) {
      HM.girlAction(0, 'tub');
    }

    // hiring roster
    UI.card(c, 800, 150, 420, 350, { title: "TODAY'S ROSTER" });
    let ry = 212;
    for (const seed of G.market.roster) {
      const cand = lodgeCandidate(seed);
      const hired = L.girls.some(g => g.seed === seed);
      portrait(c, 840, ry + 16, 22, cand.face, '#1a1018');
      txt(c, cand.name + ' · $' + cand.rate + '/MIN', 876, ry + 6, { size: 15, weight: 900, color: hired ? 'rgba(255,208,228,0.4)' : '#ffd0e4' });
      const bio = cand.bio.length > 44 ? cand.bio.slice(0, 43) + '…' : cand.bio;
      txt(c, bio, 876, ry + 26, { size: 11.5, weight: 600, color: 'rgba(190,205,230,0.5)' });
      if (hired) txt(c, 'HIRED', 1150, ry + 18, { size: 13, weight: 900, color: '#7dffa8', align: 'center' });
      else if (UI.button(c, 'hire_' + seed, 1098, ry - 2, 104, 40, { label: money(cand.fee), color: '#ff6ea8', size: 13, disabled: S.cash < cand.fee || L.girls.length >= cap })) {
        HM.hireGirl(cand);
      }
      ry += 64;
    }
    txt(c, 'ROSTER TURNS OVER EVERY MORNING.', 830, ry + 18, { size: 12, weight: 600, color: 'rgba(190,205,230,0.4)' });

    // upgrades
    UI.card(c, 800, 520, 420, 150, {});
    let uy = 552;
    for (const up of BIZ.lodge.upgrades) {
      const owned = L.up[up.id];
      if (owned) { txt(c, '✓ ' + up.name, 830, uy + 16, { size: 14, weight: 800, color: '#7dffa8' }); }
      else if (UI.button(c, 'up_lodge_' + up.id, 824, uy - 6, 372, 36, { label: up.name + ' — ' + moneyK(up.cost), color: '#ff6ea8', size: 13, disabled: S.cash < up.cost, tip: up.desc })) {
        HM.buyUpgrade('lodge', up);
      }
      uy += 42;
    }
    vignette(c);
  },
};

// ---------- THE DOCK (COCAINE) ----------
HM.scenes.biz_dock = (function () {
  let keys = 1;
  return {
    enter() { keys = 1; },
    update(dt) {},
    draw(c) {
      bizChrome(c, 'THE DOCK', '#9adfff', BIZ.coke.blurb);
      const S = G.save;
      UI.card(c, 60, 150, 560, 420, { title: 'NIGHT RUN' });
      txt(c, 'BUY KEYS ON THE MAINLAND. BOAT THEM BACK. DODGE THE SPOTLIGHTS.', 92, 222, { size: 14, weight: 600, color: 'rgba(190,205,230,0.6)' });
      txt(c, 'GET CAUGHT AND THE SHIPMENT SWIMS.', 92, 244, { size: 14, weight: 600, color: 'rgba(190,205,230,0.6)' });

      txt(c, 'KEYS THIS RUN', 92, 300, { size: 14, weight: 800, color: 'rgba(190,205,230,0.5)', spacing: 2 });
      if (UI.button(c, 'keys_minus', 92, 316, 56, 56, { label: '–', size: 26, color: '#9adfff', disabled: keys <= 1 })) keys--;
      txtGlow(c, keys, 192, 356, { size: 40, weight: 900, color: '#9adfff', glow: '#1a4a6a', blur: 10, align: 'center' });
      if (UI.button(c, 'keys_plus', 236, 316, 56, 56, { label: '+', size: 26, color: '#9adfff', disabled: keys >= 5 })) keys++;
      const cost = keys * BIZ.coke.keyCost;
      txt(c, 'COST: ' + money(cost), 320, 350, { size: 17, weight: 800, color: S.cash >= cost ? '#7dffa8' : '#ff8a7a' });

      if (UI.button(c, 'run_launch', 92, 400, 300, 62, { label: 'LAUNCH THE RUN', sub: money(cost) + ' UP FRONT', color: '#9adfff', size: 18, disabled: S.cash < cost })) {
        if (HM.spend(cost)) setScene('run', { keys });
      }
      txt(c, 'RAW ON HAND: ' + S.inv.kgRaw + ' KG', 92, 500, { size: 16, weight: 800, color: '#9adfff' });
      if (UI.button(c, 'cut_go', 320, 472, 270, 50, { label: 'CUT PRODUCT', sub: '1 KG → UNITS', color: '#9adfff', size: 16, disabled: S.inv.kgRaw <= 0 })) {
        setScene('cut');
      }
      UI.card(c, 660, 150, 560, 320, {});
      upgradeRow(c, 'coke', 690, 196, 500);
      invStrip(c);
      vignette(c);
    },
  };
})();

// ---------- HIDEOUT ----------
HM.scenes.biz_hideout = {
  enter() {},
  update(dt) {},
  draw(c) {
    bizChrome(c, 'HIDEOUT', '#8aa0c0', 'WHERE THE SMART MONEY SLEEPS.');
    const S = G.save;
    UI.card(c, 60, 150, 580, 300, { title: 'STASH & COUNSEL' });
    // stash
    const st = STASH_TIERS[S.stash];
    txt(c, 'STASH: ' + st.name + ' — ' + Math.round(st.prot * 100) + '% OF PRODUCT SURVIVES A RAID', 92, 222, { size: 14, weight: 700, color: '#c4d2e8' });
    if (S.stash + 1 < STASH_TIERS.length) {
      const nx = STASH_TIERS[S.stash + 1];
      if (UI.button(c, 'stash_up', 92, 240, 500, 50, { label: 'UPGRADE: ' + nx.name + ' — ' + money(nx.cost), sub: Math.round(nx.prot * 100) + '% PROTECTED', color: '#8aa0c0', size: 15, disabled: S.cash < nx.cost })) HM.buyStash();
    } else txt(c, 'THE OLD MINE. NOBODY FINDS THE OLD MINE.', 92, 268, { size: 14, weight: 700, color: '#7dffa8' });
    const lw = LAWYER_TIERS[S.lawyer];
    txt(c, 'LAWYER: ' + lw.name + ' — KEEP ' + Math.round(lw.keep * 100) + '% OF CASH IN A RAID', 92, 332, { size: 14, weight: 700, color: '#c4d2e8' });
    if (S.lawyer + 1 < LAWYER_TIERS.length) {
      const nx = LAWYER_TIERS[S.lawyer + 1];
      if (UI.button(c, 'lawyer_up', 92, 350, 500, 50, { label: 'RETAIN: ' + nx.name + ' — ' + money(nx.cost), sub: 'KEEP ' + Math.round(nx.keep * 100) + '%', color: '#8aa0c0', size: 15, disabled: S.cash < nx.cost })) HM.buyLawyer();
    } else txt(c, 'THE SHARK SENDS A FRUIT BASKET EVERY RAID.', 92, 378, { size: 14, weight: 700, color: '#7dffa8' });

    UI.card(c, 680, 150, 540, 300, { title: 'COOLING OFF' });
    const bcost = BRIBE_BASE * (1 + S.bribes);
    if (UI.button(c, 'bribe', 710, 212, 480, 56, { label: 'BRIBE CONSTABLE BLANCHARD — ' + money(bcost), sub: 'HEAT -30 · PRICE DOUBLES EACH TIME TODAY', color: '#ffb04a', size: 15, disabled: S.cash < bcost })) HM.bribe();
    const laying = Date.now() < S.layLowUntil;
    if (UI.button(c, 'laylow', 710, 282, 480, 56, { label: laying ? 'LAYING LOW (' + fmtDur((S.layLowUntil - Date.now()) / 1000) + ')' : 'LAY LOW', sub: 'HEAT -15 · NO SALES FOR 10 MIN', color: '#8aa0c0', size: 15, disabled: laying })) HM.layLow();
    txt(c, 'HEAT ALSO FADES A LITTLE EVERY MORNING.', 710, 380, { size: 13, weight: 600, color: 'rgba(190,205,230,0.5)' });
    invStrip(c);
    vignette(c);
  },
};

// ---------- RECORDS ----------
HM.scenes.stats = {
  enter() {},
  update(dt) {},
  draw(c) {
    bizChrome(c, 'RECORDS', '#ffd24a', 'THE WALL AT THE LEGION NOBODY TALKS ABOUT.');
    const R = G.save.records;
    const rows = [
      ['TOTAL EARNED', money(R.earned)],
      ['BEST SINGLE SALE', money(R.bestSale)],
      ['BEST HARVEST COMBO', 'X' + R.bestCombo],
      ['DAYS OPERATING', R.days + 1],
      ['COOKS RUN', R.cooks],
      ['CAMPERS DETONATED', R.booms],
      ['RAIDS SURVIVED', R.raids],
      ['CLEAN STREAK', R.cleanStreak + ' DAYS (BEST ' + R.bestStreak + ')'],
    ];
    UI.card(c, 240, 150, 800, 470, { title: RANKS[G.save.rank].name });
    rows.forEach((r, i) => {
      const y = 230 + i * 48;
      txt(c, r[0], 290, y, { size: 16, weight: 700, color: 'rgba(190,205,230,0.6)', spacing: 1 });
      txt(c, String(r[1]), 990, y, { size: 18, weight: 900, color: '#ffd24a', align: 'right' });
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.fillRect(290, y + 14, 700, 1);
    });
    // next rank
    const nr = RANKS[G.save.rank + 1];
    if (nr) {
      txt(c, 'NEXT RANK: ' + nr.name + ' AT ' + money(nr.at) + ' EARNED', 640, 598, { size: 14, weight: 700, color: 'rgba(190,205,230,0.5)', align: 'center' });
      UI.bar(c, 340, 568, 600, 12, clamp(R.earned / nr.at, 0, 1), '#ffd24a');
    }
    vignette(c);
  },
};
