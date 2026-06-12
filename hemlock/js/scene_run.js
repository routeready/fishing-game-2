'use strict';
// Night smuggling run: drive the boat up the lake, dodge shoals and OPP
// spotlights, land the keys. Caught = the shipment swims and the heat spikes.
HM.scenes.run = (function () {
  const LANE_L = 220, LANE_R = 1060;
  let keys, bx, bvx, distLeft, total, rocks, patrols, spotted, done, won, t, wake;

  function enter(args) {
    keys = args.keys || 1;
    bx = VW / 2; bvx = 0;
    total = 2600; distLeft = total;
    spotted = 0; done = false; won = false; t = 0; wake = 0;
    // seeded layout, denser per key carried
    const r = mulberry32(G.market.seed + keys * 7);
    rocks = [];
    for (let i = 0; i < 26 + keys * 4; i++) {
      rocks.push({ x: LANE_L + r() * (LANE_R - LANE_L), d: 300 + r() * (total - 400), r: 26 + r() * 26 });
    }
    patrols = [];
    const n = 2 + (keys >= 3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      patrols.push({
        d: 500 + i * (total - 700) / n + r() * 200,
        x: LANE_L + r() * (LANE_R - LANE_L), vx: (r() < 0.5 ? -1 : 1) * (70 + r() * 50),
        a: r() * TAU, spin: 0.5 + r() * 0.5,
      });
    }
    SFX.motor();
  }

  function speed() { return G.save.biz.coke.up.hull ? 360 : 290; }
  function coneLen() { return (G.save.biz.coke.up.paint ? 170 : 230) * (G.market.event.fx.fog ? 0.7 : 1); }

  function finish(caught) {
    done = true; won = !caught;
    if (caught) {
      SFX.raid(); HM.addShake(10, 0.6); HM.addFlash('#ff4a4a', 0.4);
      HM.addHeat(25);
      G.save.records.cleanStreak = 0;
      persist();
    } else {
      G.save.inv.kgRaw += keys;
      persist();
      SFX.fanfare();
      partBurst(VW / 2, VH / 2, ['#9adfff', '#fff'], 26);
    }
  }

  function update(dt) {
    if (done) return;
    t += dt;
    // steer: keys or pointer
    let steer = 0;
    if (HM.held('left')) steer -= 1;
    if (HM.held('right')) steer += 1;
    if (steer === 0 && HM.mouse.x > 0 && Math.abs(HM.mouse.x - bx) > 14) steer = HM.mouse.x > bx ? 1 : -1;
    bvx += steer * 1300 * dt;
    bvx *= (1 - 4.2 * dt);
    bx = clamp(bx + bvx * dt, LANE_L, LANE_R);
    distLeft -= speed() * dt;
    wake += dt;
    if (wake > 0.05) { wake = 0; partPuff(bx + rnd(-6, 6), VH - 130 + 18, 'rgba(180,210,255,0.18)'); }
    if (Math.random() < dt * 1.5) SFX.motor();

    // rocks
    for (const rk of rocks) {
      const ry = VH - 150 - (rk.d - (total - distLeft));
      if (ry > VH - 190 && ry < VH - 90 && Math.abs(rk.x - bx) < rk.r + 18) {
        rk.d = -9999;
        if (keys > 1) { keys--; toast('SHOAL! ONE KEY OVERBOARD', '#ff8a7a'); }
        else toast('SHOAL! HULL TOOK A BITE', '#ff8a7a');
        SFX.splash(); HM.addShake(8, 0.4); bvx = (bx > rk.x ? 1 : -1) * 420;
      }
    }
    // patrols + spotlights
    let inCone = false;
    for (const p of patrols) {
      p.x += p.vx * dt;
      if (p.x < LANE_L || p.x > LANE_R) p.vx *= -1;
      p.a += p.spin * dt;
      const py = VH - 150 - (p.d - (total - distLeft));
      if (py < -100 || py > VH + 100) continue;
      // cone hit test: boat vs sector
      const dx = bx - p.x, dy = (VH - 130) - py;
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < coneLen()) {
        let ang = Math.atan2(dy, dx) - p.a;
        while (ang > Math.PI) ang -= TAU;
        while (ang < -Math.PI) ang += TAU;
        if (Math.abs(ang) < 0.38) inCone = true;
      }
    }
    if (inCone) {
      spotted += dt * 0.9;
      if (Math.random() < dt * 3) SFX.radio();
      if (spotted >= 1) return finish(true);
    } else spotted = Math.max(0, spotted - dt * 0.5);

    if (distLeft <= 0) finish(false);
  }

  function draw(c) {
    // night water
    c.fillStyle = vgrad(c, 0, 0, VW, VH, [[0, '#060c1e'], [1, '#0a1430']]);
    c.fillRect(0, 0, VW, VH);
    const scroll = (total - distLeft);
    c.save();
    for (let i = 0; i < 40; i++) {
      const ly = ((i * 53 + scroll * 0.9) % (VH + 40)) - 20;
      c.globalAlpha = 0.08 + 0.05 * Math.sin(t * 2 + i);
      c.fillStyle = '#3a5a9a';
      fillRR(c, (i * 167) % VW, ly, 50 + (i % 4) * 22, 3, 2, c.fillStyle);
    }
    c.restore();
    // shore strips
    c.fillStyle = '#0a1626';
    c.fillRect(0, 0, LANE_L - 60, VH); c.fillRect(LANE_R + 60, 0, VW - LANE_R - 60, VH);
    const rp = mulberry32(3);
    for (let i = 0; i < 30; i++) {
      pine(c, rp() * (LANE_L - 70), ((i * 97 + scroll * 0.6) % (VH + 80)) - 40, 30 + rp() * 30, '#0e1f33');
      pine(c, LANE_R + 70 + rp() * (VW - LANE_R - 80), ((i * 131 + scroll * 0.6) % (VH + 80)) - 40, 30 + rp() * 30, '#0e1f33');
    }
    // moon
    withGlow(c, '#fff8e0', 30, () => { c.fillStyle = 'rgba(244,236,212,0.9)'; c.beginPath(); c.arc(VW * 0.85, 70, 20, 0, TAU); c.fill(); });

    // rocks
    for (const rk of rocks) {
      const ry = VH - 150 - (rk.d - scroll);
      if (ry < -60 || ry > VH + 60) continue;
      c.fillStyle = '#22303f';
      c.beginPath(); c.ellipse(rk.x, ry, rk.r, rk.r * 0.62, 0, 0, TAU); c.fill();
      c.fillStyle = '#31414f';
      c.beginPath(); c.ellipse(rk.x - rk.r * 0.22, ry - rk.r * 0.2, rk.r * 0.5, rk.r * 0.3, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(200,225,255,0.18)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(rk.x, ry, rk.r + 7, (rk.r + 7) * 0.62, 0, 0, TAU); c.stroke();
    }
    // patrols
    for (const p of patrols) {
      const py = VH - 150 - (p.d - scroll);
      if (py < -300 || py > VH + 300) continue;
      // spotlight cone
      c.save();
      c.translate(p.x, py);
      c.rotate(p.a);
      const cl = coneLen();
      const grd = c.createLinearGradient(0, 0, cl, 0);
      grd.addColorStop(0, 'rgba(255,250,210,0.4)');
      grd.addColorStop(1, 'rgba(255,250,210,0)');
      c.fillStyle = grd;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, cl, -0.38, 0.38); c.closePath(); c.fill();
      c.restore();
      // hull
      c.save(); c.translate(p.x, py);
      fillRR(c, -26, -10, 52, 20, 9, '#dde4ec');
      fillRR(c, -14, -16, 26, 10, 4, '#aab6c4');
      const strobe = Math.floor(t * 5) % 2;
      withGlow(c, strobe ? '#ff4a4a' : '#4a8aff', 10, () => {
        c.fillStyle = strobe ? '#ff4a4a' : '#4a8aff';
        c.fillRect(-5, -20, 4, 4); c.fillRect(1, -20, 4, 4);
      });
      c.restore();
    }
    // player boat
    const byy = VH - 130;
    c.save();
    c.translate(bx, byy);
    c.rotate(clamp(bvx / 900, -0.3, 0.3));
    c.fillStyle = '#1c2c40';
    c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(16, -8, 13, 22); c.lineTo(-13, 22); c.quadraticCurveTo(-16, -8, 0, -30); c.closePath(); c.fill();
    c.fillStyle = '#2c4058';
    fillRR(c, -9, -6, 18, 16, 5, '#2c4058');
    c.restore();

    // spotted meter
    if (spotted > 0.02) {
      const w = 360;
      fillRR(c, VW / 2 - w / 2, 110, w, 22, 11, 'rgba(8,12,22,0.85)');
      UI.bar(c, VW / 2 - w / 2 + 4, 114, w - 8, 14, spotted, '#ff5a5a', { glow: spotted > 0.6 });
      const fl = Math.floor(t * 6) % 2 === 0;
      if (fl) txtGlow(c, 'SPOTTED!', VW / 2, 100, { size: 20, weight: 900, color: '#ff5a5a', glow: '#ff5a5a', blur: 12, align: 'center' });
    }
    // progress
    txt(c, 'KEYS ABOARD: ' + keys, 40, 50, { size: 16, weight: 800, color: '#9adfff' });
    UI.bar(c, 40, 64, 240, 12, scroll / total, '#9adfff');
    txt(c, 'STEER: A/D, ARROWS, OR POINT', 40, 100, { size: 12, weight: 600, color: 'rgba(190,210,235,0.45)' });

    if (done) {
      if (won) {
        resultCard(c, 'LANDED', ['+' + keys + ' KG RAW, DRY AND QUIET.', 'CUT IT AT THE DOCK.'], '#9adfff', () => setScene('biz_dock'));
      } else {
        resultCard(c, 'BUSTED ON THE WATER', ['THE SHIPMENT WENT OVER THE SIDE.', '+25 HEAT. BLANCHARD IS THRILLED.'], '#ff5a5a', () => setScene('biz_dock'));
      }
    }
    vignette(c);
  }

  return { enter, update, draw };
})();
