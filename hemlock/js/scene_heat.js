'use strict';
// Constable Blanchard at the door, and the full red-and-blue season finale.

// ---------- INSPECTION ----------
HM.scenes.inspect = (function () {
  let back, pos, dir, state, line, t; // state: 'sweep' | 'pass' | 'fail'

  function enter(args) {
    back = args.back || 'island';
    pos = 0; dir = 1; state = 'sweep'; t = 0;
    line = pick(INSPECT_LINES);
    SFX.knock();
  }

  function resolve(acc) {
    if (acc > 0.62) {
      state = 'pass';
      HM.addHeat(-3);
      SFX.click();
    } else {
      state = 'fail';
      const S = G.save;
      const fine = Math.max(50, Math.round(S.cash * 0.1));
      earn(-fine, VW / 2, VH / 2 + 40, {});
      // he "confiscates a sample" of whatever there's most of
      let big = null;
      for (const k of ['shine', 'heroin', 'meth', 'coke']) if (S.inv[k] > 0 && (!big || S.inv[k] > S.inv[big])) big = k;
      if (big) { S.inv[big] = Math.max(0, S.inv[big] - Math.ceil(S.inv[big] * 0.15)); }
      HM.addHeat(4);
      persist();
      SFX.deny();
    }
  }

  function update(dt) {
    t += dt;
    if (state !== 'sweep') return;
    pos += dir * 2 * dt;
    if (pos > 1) { pos = 1; dir = -1; }
    if (pos < 0) { pos = 0; dir = 1; }
    if (HM.pressed('act') || HM.mouse.pressed) resolve(1 - Math.abs(pos - 0.5) * 2);
  }

  function draw(c) {
    mgBackdrop(c, '#8aa0c0');
    UI.card(c, VW / 2 - 330, 130, 660, 460, { title: 'KNOCK KNOCK' });
    portrait(c, VW / 2 - 250, 250, 44, BLANCHARD, '#101826');
    let y = 222;
    for (const l of HM.wrapLines(line, 40)) { txt(c, l, VW / 2 - 180, y, { size: 17, weight: 600, color: '#c4d2e8' }); y += 26; }

    if (state === 'sweep') {
      txt(c, 'ACT NATURAL', VW / 2, 360, { size: 24, weight: 900, color: '#eaf2ff', align: 'center', spacing: 3 });
      const bx = VW / 2 - 240, bw = 480, by = 410;
      fillRR(c, bx, by - 20, bw, 40, 20, 'rgba(8,12,22,0.9)');
      fillRR(c, VW / 2 - 44, by - 20, 88, 40, 12, 'rgba(125,255,168,0.25)');
      strokeRR(c, bx, by - 20, bw, 40, 20, 'rgba(255,255,255,0.15)', 1.5);
      const nx = bx + 12 + pos * (bw - 24);
      withGlow(c, '#8aa0c0', 12, () => fillRR(c, nx - 4, by - 32, 8, 64, 4, '#dce8ff'));
      // pay-off escape hatch
      const cost = 500;
      if (UI.button(c, 'inspect_pay', VW / 2 - 130, 480, 260, 48, { label: 'SLIP HIM ' + money(cost), sub: 'SKIP THE CHAT', color: '#ffb04a', size: 15, disabled: G.save.cash < cost })) {
        if (HM.spend(cost)) { state = 'pass'; SFX.chaChing(); }
      }
    } else if (state === 'pass') {
      txtGlow(c, 'HE BOUGHT IT', VW / 2, 380, { size: 34, weight: 900, color: '#7dffa8', glow: '#2a8a4a', blur: 14, align: 'center' });
      txt(c, '"WELL. KEEP THE NOISE DOWN, EH?"', VW / 2, 420, { size: 16, weight: 600, color: '#c4d2e8', align: 'center' });
      if (UI.button(c, 'inspect_ok', VW / 2 - 110, 470, 220, 52, { label: 'BREATHE OUT', color: '#7dffa8', size: 16 }) || HM.pressed('act')) setScene(back);
    } else {
      txtGlow(c, 'HE SNIFFED AROUND', VW / 2, 380, { size: 30, weight: 900, color: '#ff8a7a', glow: '#8a2a1a', blur: 14, align: 'center' });
      txt(c, 'A FINE, A "SAMPLE", AND A LONG LOOK AT YOUR FACE.', VW / 2, 420, { size: 15, weight: 600, color: '#c4d2e8', align: 'center' });
      if (UI.button(c, 'inspect_bad', VW / 2 - 110, 470, 220, 52, { label: 'WAVE GOODBYE', color: '#ff8a7a', size: 16 }) || HM.pressed('act')) setScene(back);
    }
    vignette(c);
  }

  return { enter, update, draw };
})();

// ---------- RAID ----------
HM.scenes.raid = (function () {
  let t, losses, applied, line;

  function enter() {
    t = 0; applied = false;
    line = pick(RAID_LINES);
    losses = raidLosses(G.save);
    SFX.raid();
    HM.addShake(14, 1);
  }

  function apply() {
    if (applied) return;
    applied = true;
    const S = G.save;
    S.cash = Math.max(0, S.cash - losses.cashLost);
    for (const k of Object.keys(losses.invLost)) S.inv[k] = Math.max(0, S.inv[k] - losses.invLost[k]);
    S.heat = 40;
    S.records.raids++;
    S.records.cleanStreak = 0;
    persist();
  }

  function update(dt) {
    t += dt;
    if (t > 1.2) apply();
  }

  function draw(c) {
    c.fillStyle = '#06080e';
    c.fillRect(0, 0, VW, VH);
    // red/blue wash
    const strobe = Math.floor(t * 5) % 2;
    c.fillStyle = strobe ? 'rgba(255,40,40,0.16)' : 'rgba(40,90,255,0.16)';
    c.fillRect(0, 0, VW, VH);
    withGlow(c, strobe ? '#ff4a4a' : '#4a8aff', 60, () => {
      c.fillStyle = strobe ? 'rgba(255,70,70,0.7)' : 'rgba(70,130,255,0.7)';
      c.fillRect(0, 0, VW, 8); c.fillRect(0, VH - 8, VW, 8);
    });

    const k = easeBack(Math.min(1, t / 0.6));
    c.save();
    c.translate(VW / 2, 170); c.scale(k, k);
    txtGlow(c, 'OPP RAID', 0, 0, { size: 86, weight: 900, color: '#ff5a5a', glow: '#ff2a2a', blur: 30, align: 'center', spacing: 8 });
    c.restore();
    if (t > 0.7) {
      txt(c, line, VW / 2, 232, { size: 17, weight: 600, color: '#e8d8d8', align: 'center' });
    }
    if (t > 1.2) {
      UI.card(c, VW / 2 - 290, 280, 580, 380, { title: 'THE DAMAGE' });
      let y = 356;
      txt(c, 'CASH SEIZED', VW / 2 - 240, y, { size: 16, weight: 700, color: 'rgba(220,210,210,0.7)' });
      txt(c, '-' + money(losses.cashLost), VW / 2 + 240, y, { size: 18, weight: 900, color: '#ff8a7a', align: 'right' });
      y += 40;
      let any = false;
      for (const kk of Object.keys(losses.invLost)) {
        if (!losses.invLost[kk]) continue;
        any = true;
        txt(c, PRODUCTS[kk].name + ' CONFISCATED', VW / 2 - 240, y, { size: 16, weight: 700, color: 'rgba(220,210,210,0.7)' });
        txt(c, '-' + losses.invLost[kk] + ' ' + PRODUCTS[kk].unit, VW / 2 + 240, y, { size: 18, weight: 900, color: '#ff8a7a', align: 'right' });
        y += 34;
      }
      if (!any) { txt(c, 'STASH HELD. THEY FOUND NOTHING.', VW / 2 - 240, y, { size: 16, weight: 700, color: '#7dffa8' }); y += 34; }
      txt(c, STASH_TIERS[G.save.stash].name + ' · ' + LAWYER_TIERS[G.save.lawyer].name, VW / 2 - 240, y + 8, { size: 13, weight: 600, color: 'rgba(190,210,235,0.45)' });
      if (UI.button(c, 'raid_ok', VW / 2 - 130, 588, 260, 54, { label: 'REBUILD', color: '#ff5a5a', size: 17 }) || HM.pressed('act')) {
        toast('HEAT RESET TO 40. THE EMPIRE STANDS.', '#8aa0c0');
        setScene('island');
      }
    }
    vignette(c);
  }

  return { enter, update, draw };
})();
