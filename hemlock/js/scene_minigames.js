'use strict';
// The hands-on bits. Short, juicy, all abstract verbs — timing and reflexes,
// never recipes. Each ends on a result card, then returns to its business.

function mgBackdrop(c, accent) {
  c.fillStyle = vgrad(c, 0, 0, VW, VH, [[0, '#0a1020'], [1, '#060a12']]);
  c.fillRect(0, 0, VW, VH);
  c.save();
  c.globalAlpha = 0.06;
  c.fillStyle = accent;
  c.beginPath(); c.arc(VW / 2, VH / 2, 340, 0, TAU); c.fill();
  c.restore();
}

function comboMeter(c, x, y, combo, best) {
  if (combo <= 0) return;
  const k = 1 + Math.min(8, combo) * 0.06;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  txtGlow(c, 'X' + combo + ' COMBO', 0, 0, { size: 26, weight: 900, color: combo >= 5 ? '#ffd24a' : '#7dffa8', glow: combo >= 5 ? '#ffd24a' : '#2a8a4a', blur: 14, align: 'center' });
  c.restore();
  if (best) txt(c, 'BEST X' + best, x, y + 24, { size: 13, weight: 700, color: 'rgba(190,210,235,0.5)', align: 'center' });
}

function resultCard(c, title, lines, accent, onDone) {
  UI.card(c, VW / 2 - 280, VH / 2 - 150, 560, 300, {});
  txtGlow(c, title, VW / 2, VH / 2 - 84, { size: 38, weight: 900, color: accent, glow: accent, blur: 16, align: 'center' });
  lines.forEach((l, i) => txt(c, l, VW / 2, VH / 2 - 36 + i * 30, { size: 18, weight: 600, color: '#c4d2e8', align: 'center' }));
  if (UI.button(c, 'mg_done', VW / 2 - 110, VH / 2 + 76, 220, 54, { label: 'CONTINUE', color: accent, size: 17 }) || HM.pressed('act') || HM.pressed('ok')) {
    onDone();
  }
}

// ---------- HARVEST (poppy pods) ----------
HM.scenes.harvest = (function () {
  let plot, pods, pod, good, perfect, miss, combo, bestCombo, done, gum;
  const POD_N = 12;

  function newPod() {
    pod = { x: rnd(240, VW - 240), y: rnd(220, VH - 180), t: 0, dur: rnd(0.85, 1.15) };
  }
  function enter(args) {
    plot = args.plot;
    pods = POD_N; good = 0; perfect = 0; miss = 0; combo = 0; bestCombo = 0; done = false; gum = 0;
    newPod();
  }

  function judge() {
    const k = pod.t / pod.dur;             // ring closes as k -> 1
    if (k > 0.62 && k < 0.95) {
      const isPerfect = k > 0.76 && k < 0.88;
      if (isPerfect) { perfect++; combo++; partBurst(pod.x, pod.y, ['#ffd24a', '#ff7eb0', '#fff'], 14); partFloat('PERFECT', pod.x, pod.y - 30, '#ffd24a', { glow: true }); }
      else { good++; combo++; partBurst(pod.x, pod.y, '#ff7eb0', 8); partFloat('GOOD', pod.x, pod.y - 30, '#7dffa8'); }
      bestCombo = Math.max(bestCombo, combo);
      SFX.pop(Math.min(8, combo));
      HM.vibrate(15);
    } else {
      miss++; combo = 0;
      partFloat('MISS', pod.x, pod.y - 30, '#ff7d7d');
      SFX.deny();
    }
    pods--;
    if (pods <= 0) {
      gum = HM.harvestPayout(plot, { good, perfect, bestCombo });
      done = true;
      SFX.fanfare();
    } else newPod();
  }

  function update(dt) {
    if (done) return;
    pod.t += dt;
    if (pod.t >= pod.dur) judge(); // ran out = miss
    else if (HM.pressed('act') || HM.mouse.pressed) judge();
  }

  function draw(c) {
    mgBackdrop(c, '#ff7eb0');
    // field rows
    c.save(); c.globalAlpha = 0.25;
    for (let i = 0; i < 7; i++) {
      c.strokeStyle = '#4a3528'; c.lineWidth = 26;
      c.beginPath(); c.moveTo(80, 200 + i * 70); c.lineTo(VW - 80, 200 + i * 70); c.stroke();
    }
    c.restore();
    txt(c, 'TAP WHEN THE RING HITS THE BLOOM', VW / 2, 96, { size: 22, weight: 800, color: '#ffd0e4', align: 'center', spacing: 2 });
    txt(c, 'PODS LEFT: ' + pods, VW / 2, 128, { size: 15, weight: 700, color: 'rgba(190,210,235,0.6)', align: 'center' });
    comboMeter(c, VW / 2, 170, combo, bestCombo);

    if (!done && pod) {
      const k = pod.t / pod.dur;
      const r = lerp(95, 18, k);
      // pod
      const sway = Math.sin(G.t * 3) * 3;
      c.strokeStyle = '#3a8a48'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(pod.x, pod.y + 60); c.quadraticCurveTo(pod.x + sway, pod.y + 30, pod.x + sway, pod.y); c.stroke();
      withGlow(c, '#ff5a8a', 18, () => {
        c.fillStyle = '#ff5a8a';
        c.beginPath(); c.ellipse(pod.x + sway, pod.y, 16, 20, 0, 0, TAU); c.fill();
      });
      c.fillStyle = '#c03060';
      c.beginPath(); c.ellipse(pod.x + sway, pod.y - 14, 7, 5, 0, 0, TAU); c.fill();
      // target band
      c.strokeStyle = rgba('#7dffa8', 0.35); c.lineWidth = 14;
      c.beginPath(); c.arc(pod.x, pod.y, lerp(95, 18, 0.785), 0, TAU); c.stroke();
      // shrinking ring
      const ringCol = k > 0.62 && k < 0.95 ? '#7dffa8' : '#ffd24a';
      withGlow(c, ringCol, 12, () => {
        c.strokeStyle = ringCol; c.lineWidth = 3.5;
        c.beginPath(); c.arc(pod.x, pod.y, r, 0, TAU); c.stroke();
      });
    }
    if (done) {
      resultCard(c, '+' + gum + ' OZ POPPY GUM',
        ['GOOD ' + good + ' · PERFECT ' + perfect + ' · MISS ' + miss, 'BEST COMBO X' + bestCombo],
        '#ff7eb0', () => setScene('biz_farm'));
    }
    vignette(c);
  }

  return { enter, update, draw };
})();

// ---------- LAB COOK (3 stop-the-needle stages) ----------
HM.scenes.cook = (function () {
  const STAGES = ['MASH IT', 'HEAT IT', 'PRESS IT'];
  let stage, pos, dir, speed, scores, done, started;

  function enter() {
    stage = 0; pos = rnd(0, 1); dir = 1; speed = 1.5; scores = []; done = false; started = false;
  }

  function stop() {
    const acc = 1 - Math.abs(pos - 0.5) * 2;        // 1 at center
    scores.push(acc);
    if (acc > 0.92) { partBurst(VW / 2, 400, ['#c49aff', '#fff'], 18); partFloat('NAILED IT', VW / 2, 360, '#ffd24a', { glow: true }); SFX.crit(); }
    else if (acc > 0.6) { partFloat('CLEAN', VW / 2, 360, '#7dffa8'); SFX.click(); }
    else { partFloat('SLOPPY', VW / 2, 360, '#ff9a7a'); SFX.deny(); }
    stage++;
    if (stage >= STAGES.length) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const q = 0.5 + avg * 0.8;                    // 0.5 .. 1.3
      HM.startLabJob(q);
      done = q;
      SFX.bubble();
    } else { pos = rnd(0, 1); speed = 1.5 + stage * 0.55; }
  }

  function update(dt) {
    if (done) return;
    if (!started) { if (HM.pressed('act') || HM.mouse.pressed) started = true; return; }
    pos += dir * speed * dt;
    if (pos > 1) { pos = 1; dir = -1; }
    if (pos < 0) { pos = 0; dir = 1; }
    if (HM.pressed('act') || HM.mouse.pressed) stop();
  }

  function draw(c) {
    mgBackdrop(c, '#c49aff');
    txt(c, 'THE COOK', VW / 2, 96, { size: 22, weight: 800, color: '#e0ccff', align: 'center', spacing: 3 });
    txt(c, started ? 'STOP THE NEEDLE DEAD CENTER' : 'TAP TO START', VW / 2, 128, { size: 15, weight: 700, color: 'rgba(190,210,235,0.6)', align: 'center' });

    // stage pips
    STAGES.forEach((s, i) => {
      const x = VW / 2 - 150 + i * 150;
      const on = i === stage, past = i < stage;
      fillRR(c, x - 64, 170, 128, 40, 20, past ? 'rgba(125,255,168,0.12)' : on ? 'rgba(196,154,255,0.16)' : 'rgba(255,255,255,0.04)');
      strokeRR(c, x - 64, 170, 128, 40, 20, past ? 'rgba(125,255,168,0.5)' : on ? '#c49aff' : 'rgba(255,255,255,0.1)', 1.5);
      txt(c, past ? '✓ ' + s : s, x, 196, { size: 14, weight: 800, color: past ? '#7dffa8' : on ? '#e0ccff' : 'rgba(190,210,235,0.35)', align: 'center' });
      if (i < scores.length) txt(c, Math.round(scores[i] * 100) + '%', x, 232, { size: 13, weight: 700, color: '#c4d2e8', align: 'center' });
    });

    if (!done && started) {
      // the bar
      const bx = VW / 2 - 320, bw = 640, by = 400;
      fillRR(c, bx, by - 22, bw, 44, 22, 'rgba(8,12,22,0.9)');
      // center green band
      const band = 70;
      fillRR(c, VW / 2 - band / 2, by - 22, band, 44, 10, 'rgba(125,255,168,0.2)');
      fillRR(c, VW / 2 - 18, by - 22, 36, 44, 8, 'rgba(255,210,74,0.3)');
      strokeRR(c, bx, by - 22, bw, 44, 22, 'rgba(255,255,255,0.15)', 1.5);
      // needle
      const nx = bx + 14 + pos * (bw - 28);
      withGlow(c, '#c49aff', 16, () => {
        c.fillStyle = '#e0ccff';
        fillRR(c, nx - 4, by - 36, 8, 72, 4, '#e0ccff');
      });
      txt(c, STAGES[stage], VW / 2, by + 86, { size: 28, weight: 900, color: '#e0ccff', align: 'center', spacing: 4 });
    }
    if (done) {
      resultCard(c, 'QUALITY ' + Math.round(done * 100) + '%',
        ['THE BATCH IS BREWING IN THE BUNKHOUSE.', 'COME BACK IN ' + fmtDur(BIZ.lab.dur * HM.cookX()) + '.'],
        '#c49aff', () => setScene('biz_lab'));
    }
    vignette(c);
  }

  return { enter, update, draw };
})();

// ---------- METH COOK (hold-the-temperature) ----------
HM.scenes.methcook = (function () {
  const DUR = 30;
  let t, temp, vel, greenT, redT, done, exploded, bags, started;

  function enter() {
    t = 0; temp = 0.35; vel = 0; greenT = 0; redT = 0; done = false; exploded = false; bags = 0; started = false;
  }

  function zone() {
    // green zone center drifts, width shrinks over the cook
    const wide = G.save.biz.meth.up.glass ? 0.16 : 0.11;
    const w = lerp(wide + 0.08, wide, t / DUR);
    const cz = 0.55 + Math.sin(t * 0.5) * 0.13 + Math.sin(t * 0.23 + 2) * 0.06;
    return { lo: cz - w / 2, hi: cz + w / 2 };
  }

  function finish(boom) {
    done = true; exploded = boom;
    if (boom) {
      HM.methPayout(0, true);
      SFX.boom(); HM.addShake(18, 0.7); HM.addFlash('#fff', 0.5);
      partBurst(VW / 2, 380, ['#7dffb8', '#ffd24a', '#ff9a3a', '#fff'], 50, { speed: 500 });
      for (let i = 0; i < 14; i++) partPuff(VW / 2 + rnd(-60, 60), 380 + rnd(-40, 40), 'rgba(120,130,120,0.5)', true);
      toast(pick(EXPLODE_LINES), '#ff8a7a');
    } else {
      const frac = greenT / DUR;
      bags = HM.methPayout(frac, false);
      if (frac > 0.9) { SFX.jackpot(); partBurst(VW / 2, 380, ['#7dffb8', '#fff'], 30); }
      else SFX.fanfare();
    }
  }

  function update(dt) {
    if (done) return;
    if (!started) { if (HM.pressed('act') || HM.mouse.pressed) { started = true; SFX.sizzle(); } return; }
    t += dt;
    const heatOn = HM.held('act') || HM.mouse.down;
    vel += ((heatOn ? 0.55 : -0.42) + Math.sin(t * 3.7) * 0.07 + rnd(-0.05, 0.05)) * dt * 2.2;
    vel = clamp(vel, -0.45, 0.45);
    temp = clamp(temp + vel * dt * 1.6, 0, 1);
    if (temp <= 0 || temp >= 1) vel = 0;
    const z = zone();
    if (temp >= z.lo && temp <= z.hi) { greenT += dt; if (Math.random() < dt * 4) partEmber(rnd(VW / 2 - 90, VW / 2 + 90), rnd(330, 430), '#7dffb8'); }
    if (temp > 0.92) { redT += dt; if (Math.random() < dt * 10) SFX.sizzle(); if (redT > 1.5) return finish(true); }
    else redT = Math.max(0, redT - dt * 2);
    if (t >= DUR) finish(false);
  }

  function draw(c) {
    mgBackdrop(c, '#7dffb8');
    txt(c, 'CAMPER COOK', VW / 2, 96, { size: 22, weight: 800, color: '#bdffd8', align: 'center', spacing: 3 });
    txt(c, started ? 'HOLD TO HEAT · KEEP HER IN THE GREEN' : 'TAP AND HOLD TO START', VW / 2, 128, { size: 15, weight: 700, color: 'rgba(190,210,235,0.6)', align: 'center' });

    if (!done) {
      // big vertical gauge
      const gx = VW / 2 - 60, gy = 200, gh = 360, gw = 120;
      fillRR(c, gx, gy, gw, gh, 24, 'rgba(8,12,22,0.9)');
      const z = zone();
      const zy = gy + gh - z.hi * gh, zh = (z.hi - z.lo) * gh;
      fillRR(c, gx + 6, zy, gw - 12, zh, 10, 'rgba(125,255,168,0.25)');
      // red top
      fillRR(c, gx + 6, gy + 4, gw - 12, gh * 0.08, 10, rgba('#ff5a5a', 0.3 + (redT > 0 ? redT / 1.5 * 0.5 : 0)));
      strokeRR(c, gx, gy, gw, gh, 24, 'rgba(255,255,255,0.15)', 1.5);
      // mercury
      const my = gy + gh - temp * gh;
      const inGreen = temp >= z.lo && temp <= z.hi;
      const mcol = temp > 0.92 ? '#ff5a5a' : inGreen ? '#7dffb8' : '#ffb04a';
      withGlow(c, mcol, 14, () => fillRR(c, gx + 38, my - 5, gw - 76, 10, 5, mcol));
      // timer + green%
      const left = Math.max(0, DUR - t);
      txt(c, Math.ceil(left) + 'S', VW / 2 + 180, 290, { size: 44, weight: 900, color: '#eaf2ff', align: 'center' });
      txt(c, 'IN THE GREEN', VW / 2 + 180, 340, { size: 13, weight: 700, color: 'rgba(190,210,235,0.55)', align: 'center', spacing: 2 });
      txtGlow(c, Math.round(greenT / DUR * 100) + '%', VW / 2 + 180, 392, { size: 40, weight: 900, color: '#7dffb8', glow: '#1a6a3a', blur: 12, align: 'center' });
      if (redT > 0.2) {
        const fl = Math.floor(G.t * 8) % 2 === 0;
        if (fl) txtGlow(c, 'SHE CANNA TAKE IT!', VW / 2, 630, { size: 30, weight: 900, color: '#ff5a5a', glow: '#ff5a5a', blur: 16, align: 'center' });
        HM.addShake(redT * 4, 0.1);
      }
      // burner flame
      const heatOn = (HM.held('act') || HM.mouse.down) && started;
      if (heatOn) {
        withGlow(c, '#ffb04a', 20, () => {
          c.fillStyle = '#ffd080';
          c.beginPath();
          c.ellipse(VW / 2, gy + gh + 36, 26 + Math.sin(G.t * 20) * 5, 18, 0, 0, TAU);
          c.fill();
        });
      }
    } else if (exploded) {
      resultCard(c, 'KABOOM', ['THE BATCH IS GONE. THE HEAT IS NOT.', '+12 HEAT'], '#ff5a5a', () => setScene('biz_meth'));
    } else {
      resultCard(c, '+' + bags + ' BAGS', [greenT / DUR > 0.9 ? 'PURE BATCH. GORD WANTS A POSTER OF IT.' : 'DECENT PRODUCT. THE BIKERS WON\'T COMPLAIN.', '+' + Math.round(8 * (G.save.biz.meth.up.scrubber ? 0.5 : 1)) + ' HEAT'], '#7dffb8', () => setScene('biz_meth'));
    }
    vignette(c);
  }

  return { enter, update, draw };
})();

// ---------- CUT (purity vs quantity slider) ----------
HM.scenes.cut = (function () {
  let pos, dir, done, units, sweet, bias, started;

  function enter() { pos = 0; dir = 1; done = false; units = 0; sweet = false; started = false; }

  function stop() {
    bias = pos;                       // -1 purity .. +1 quantity
    sweet = Math.abs(pos) < 0.06;
    units = HM.cutPayout(G.save.inv.kgRaw, bias, sweet);
    done = true;
    if (sweet) { SFX.jackpot(); partBurst(VW / 2, 400, ['#9adfff', '#ffd24a', '#fff'], 36); }
    else SFX.fanfare();
  }

  function update(dt) {
    if (done) return;
    if (!started) { if (HM.pressed('act') || HM.mouse.pressed) started = true; return; }
    pos += dir * 1.7 * dt;
    if (pos > 1) { pos = 1; dir = -1; }
    if (pos < -1) { pos = -1; dir = 1; }
    if (HM.pressed('act') || HM.mouse.pressed) stop();
  }

  function draw(c) {
    mgBackdrop(c, '#9adfff');
    txt(c, 'THE CUT', VW / 2, 96, { size: 22, weight: 800, color: '#cfeeff', align: 'center', spacing: 3 });
    txt(c, started ? 'STOP THE BLADE — CENTER IS THE SWEET SPOT' : 'TAP TO START', VW / 2, 128, { size: 15, weight: 700, color: 'rgba(190,210,235,0.6)', align: 'center' });

    if (!done) {
      const bx = VW / 2 - 360, bw = 720, by = 400;
      fillRR(c, bx, by - 26, bw, 52, 26, 'rgba(8,12,22,0.9)');
      // gradient zones
      c.save();
      rrPath(c, bx, by - 26, bw, 52, 26); c.clip();
      const grd = c.createLinearGradient(bx, 0, bx + bw, 0);
      grd.addColorStop(0, 'rgba(196,154,255,0.3)');
      grd.addColorStop(0.5, 'rgba(255,210,74,0.35)');
      grd.addColorStop(1, 'rgba(125,255,184,0.3)');
      c.fillStyle = grd;
      c.fillRect(bx, by - 26, bw, 52);
      c.restore();
      fillRR(c, VW / 2 - 14, by - 26, 28, 52, 8, 'rgba(255,210,74,0.6)');
      strokeRR(c, bx, by - 26, bw, 52, 26, 'rgba(255,255,255,0.15)', 1.5);
      txt(c, 'PURITY', bx - 16, by + 7, { size: 17, weight: 800, color: '#c49aff', align: 'right' });
      txt(c, 'X1.5 PRICE', bx - 16, by + 28, { size: 12, weight: 600, color: 'rgba(196,154,255,0.6)', align: 'right' });
      txt(c, 'QUANTITY', bx + bw + 16, by + 7, { size: 17, weight: 800, color: '#7dffb8' });
      txt(c, 'X2 UNITS', bx + bw + 16, by + 28, { size: 12, weight: 600, color: 'rgba(125,255,184,0.6)' });
      const nx = VW / 2 + pos * (bw / 2 - 20);
      withGlow(c, '#9adfff', 16, () => fillRR(c, nx - 5, by - 42, 10, 84, 5, '#cfeeff'));
      txt(c, G.save.inv.kgRaw + ' KG ON THE TABLE', VW / 2, 520, { size: 17, weight: 800, color: '#9adfff', align: 'center' });
    } else {
      resultCard(c, '+' + units + ' UNITS',
        [sweet ? 'SWEET SPOT. CHEMIST-GRADE GREED.' : bias > 0.3 ? 'STEPPED ON. MORE UNITS, SOFTER PRICE.' : bias < -0.3 ? 'CLEAN. FEWER UNITS, PREMIUM PRICE.' : 'A FAIR CUT.',
          'SELL AT THE TOWN STRIP OR THE MAINLAND.'],
        '#9adfff', () => setScene('biz_dock'));
    }
    vignette(c);
  }

  return { enter, update, draw };
})();
