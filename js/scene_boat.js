'use strict';
// Top-down boating: pick your water, dodge rocks, mind the patrol.

function genLake(li) {
  const L = LAKES[li];
  const r = mulberry32(G.daily.seed * 7919 + li * 101 + 13);
  const world = { w: L.w, h: L.h, spots: [], rocks: [], buoys: [], patrols: [] };
  world.dock = { x: L.w / 2, y: L.h - 30 };

  const placed = [];
  function place(margin, minGap) {
    for (let tries = 0; tries < 60; tries++) {
      const x = margin + r() * (L.w - margin * 2);
      const y = margin + r() * (L.h - margin * 2 - 80);
      let ok = dist(x, y, world.dock.x, world.dock.y) > 120;
      for (const p of placed) if (dist(x, y, p.x, p.y) < minGap) { ok = false; break; }
      if (ok) { placed.push({ x, y }); return { x, y }; }
    }
    return { x: margin + r() * (L.w - margin * 2), y: margin + r() * (L.h - margin * 2) };
  }

  const hotIdx = G.daily.hot % L.spotN;
  for (let i = 0; i < L.spotN; i++) {
    const p = place(90, 130);
    const q = 1 + Math.floor(r() * 3); // 1..3 stars
    const weeds = [];
    const n = 5 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      weeds.push({ dx: (r() - 0.5) * 70, dy: (r() - 0.5) * 50, r: 4 + r() * 7, s: Math.floor(r() * 1e9) });
    }
    world.spots.push({ x: p.x, y: p.y, q, isHot: i === hotIdx, weeds, id: i });
  }
  for (let i = 0; i < L.rockN; i++) {
    const p = place(50, 60);
    world.rocks.push({ x: p.x, y: p.y, r: 7 + r() * 6 });
  }
  for (let i = 0; i < 3; i++) {
    const p = place(60, 80);
    world.buoys.push({ x: p.x, y: p.y });
  }
  for (let i = 0; i < L.patrol; i++) {
    const inset = 110 + i * 60;
    const wp = [
      { x: inset, y: inset }, { x: L.w - inset, y: inset },
      { x: L.w - inset, y: L.h - inset - 60 }, { x: inset, y: L.h - inset - 60 },
    ];
    world.patrols.push({
      x: wp[i % 4].x, y: wp[i % 4].y, wi: (i % 4 + 1) % 4, wp,
      seen: false, wasClose: false, chirpT: 0,
    });
  }
  world.boat = { x: world.dock.x, y: world.dock.y - 24, ang: -Math.PI / 2, v: 0, stun: 0 };
  return world;
}

RT.scenes.boat = {
  enter(args) {
    const T = G.trip;
    if (!T.world || args.fresh) {
      T.world = genLake(T.lake);
      T.susp = 0;
      T.suspGrace = 0;
      if (LAKES[T.lake].patrol > 0) earlSay(pick(EARL_WARN), 4.5);
    }
    this.pull = 0;   // 'PULL OVER' cutscene timer
    this.hintT = 0;
  },
  update(dt) {
    const T = G.trip, Wd = T.world, B = Wd.boat, L = LAKES[T.lake];
    if (tripTick(dt)) { setScene('summary'); return; }
    earlUpdate(dt);

    if (this.pull > 0) {
      this.pull -= dt;
      B.v *= 0.92;
      if (this.pull <= 0) setScene('breath', { from: 'boat' });
      return;
    }

    if (T.suspGrace > 0) T.suspGrace -= dt;
    if (pressed('beer')) {
      drink();
      if (T.buzz >= 9) earlSay("EARL: PACE YOURSELF, ADMIRAL.", 3);
    }

    // --- drive ---
    const maxV = BOATS[G.save.boat].speed;
    if (B.stun > 0) B.stun -= dt;
    const throttle = held('up') && B.stun <= 0;
    if (throttle) B.v = Math.min(maxV, B.v + 130 * dt);
    else B.v = Math.max(0, B.v - 110 * dt);
    if (held('down')) B.v = Math.max(0, B.v - 180 * dt);
    const turn = (held('left') ? -1 : 0) + (held('right') ? 1 : 0);
    B.ang += turn * 2.4 * dt * (0.4 + 0.6 * Math.min(1, B.v / 60));
    // buzz weave — this is what gets you noticed
    const weave = shakeAmt() * Math.min(1, B.v / 50);
    B.ang += Math.sin(G.t * 2.3) * 2.0 * weave * dt;
    B.x += Math.cos(B.ang) * B.v * dt;
    B.y += Math.sin(B.ang) * B.v * dt;
    if (B.v > 30 && Math.floor(G.t * 9) % 3 === 0) SFX.motor();

    // shore bounds
    const m = 16;
    if (B.x < m || B.x > Wd.w - m || B.y < m || B.y > Wd.h - m) {
      B.x = clamp(B.x, m, Wd.w - m); B.y = clamp(B.y, m, Wd.h - m);
      if (B.v > 40) { SFX.bonk(); B.stun = 0.3; }
      B.v *= 0.3;
    }
    // rocks
    for (const rk of Wd.rocks) {
      const d = dist(B.x, B.y, rk.x, rk.y);
      const rr = rk.r + 7;
      if (d < rr) {
        const px = (B.x - rk.x) / (d || 1), py = (B.y - rk.y) / (d || 1);
        // push out past the rim — landing exactly on it re-collides on float
        // fuzz every frame, refreshing the stun forever and locking the boat
        B.x = rk.x + px * (rr + 1); B.y = rk.y + py * (rr + 1);
        if (B.v > 25) { SFX.bonk(); toast('HULL SCRAPE!', '#f88'); B.stun = 0.4; }
        B.v *= 0.25;
      }
    }

    // --- patrols ---
    const R = 130 * G.daily.weather.copR;
    let seenAny = false, nearestD = 1e9;
    for (const P of Wd.patrols) {
      const chasing = T.susp > 55 && P.seen;
      const tgt = chasing ? B : P.wp[P.wi];
      const d2 = dist(P.x, P.y, tgt.x, tgt.y);
      if (!chasing && d2 < 20) P.wi = (P.wi + 1) % P.wp.length;
      const spd = chasing ? Math.max(80, maxV * 0.9) : 60;
      if (d2 > 1) {
        P.x += ((tgt.x - P.x) / d2) * spd * dt;
        P.y += ((tgt.y - P.y) / d2) * spd * dt;
      }
      const d = dist(P.x, P.y, B.x, B.y);
      nearestD = Math.min(nearestD, d);
      const seen = d < R;
      // telegraph: one chirp as they pick you up on the way in
      if (d < R * 1.6 && !P.seen && P.chirpT <= 0) { SFX.siren(); P.chirpT = 6; }
      if (P.chirpT > 0) P.chirpT -= dt;
      if (seen) {
        seenAny = true;
        if (T.susp > 45) P.wasClose = true;
      } else if (P.wasClose) {
        P.wasClose = false;
        T.nearMisses++; G.save.records.nearMisses++; persist();
        SFX.near(); toast('CLOSE ONE!', '#ffd040');
        earlSay(pick(EARL_NEAR), 3.5);
      }
      P.seen = seen;
    }
    // suspicion
    if (T.suspGrace <= 0 && seenAny) {
      let rate = 0;
      rate += weave * 26;                                   // weaving wake
      if (T.drinking > 0) rate += 55;                       // can in hand, in plain view
      if (T.buzz > BUZZ_LIMIT && B.v > 30) rate += 7;
      T.susp = Math.min(100, T.susp + rate * dt);
    } else {
      T.susp = Math.max(0, T.susp - 14 * dt);
    }
    if (T.susp >= 100) {
      this.pull = 1.4;
      SFX.siren(); SFX.horn();
      return;
    }

    // --- anchor at a spot ---
    this.nearSpot = null;
    for (const s of Wd.spots) {
      if (dist(B.x, B.y, s.x, s.y) < 52) { this.nearSpot = s; break; }
    }
    if (this.nearSpot && pressed('act') && B.v < 30) {
      SFX.splash();
      setScene('fish', { spot: this.nearSpot });
      return;
    }
    // --- dock: cash in early ---
    this.nearDock = dist(B.x, B.y, Wd.dock.x, Wd.dock.y) < 46;
    if (this.nearDock && pressed('ok')) { setScene('summary'); return; }
  },
  draw() {
    const T = G.trip, Wd = T.world, B = Wd.boat, L = LAKES[T.lake];
    const camX = clamp(B.x - W / 2, 0, Wd.w - W);
    const camY = clamp(B.y - H / 2, 0, Wd.h - H);
    const fog = G.daily.weather.id === 'FOG';

    // water
    ctx.fillStyle = '#1f7a86'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2e96a2';
    for (let y = -((camY | 0) % 12); y < H; y += 12) {
      const off = Math.sin(G.t * 1.1 + (y + camY) * 0.13) * 9;
      ctx.fillRect(0, y, W, 1);
      ctx.fillRect(Math.round(60 + off + ((y + camY) * 17) % 220 - camX % 40), y + 6, 16, 1);
    }
    // shore ring
    ctx.fillStyle = '#caa86a';
    if (camY < 14) ctx.fillRect(0, -camY, W, 14);
    if (camY > Wd.h - H - 14) ctx.fillRect(0, Wd.h - 14 - camY, W, 14);
    if (camX < 14) ctx.fillRect(-camX, 0, 14, H);
    if (camX > Wd.w - W - 14) ctx.fillRect(Wd.w - 14 - camX, 0, 14, H);
    ctx.fillStyle = '#2a6a30';
    if (camY < 6) ctx.fillRect(0, -camY, W, 6);
    if (camY > Wd.h - H - 6) ctx.fillRect(0, Wd.h - 6 - camY, W, 6);
    if (camX < 6) ctx.fillRect(-camX, 0, 6, H);
    if (camX > Wd.w - W - 6) ctx.fillRect(Wd.w - 6 - camX, 0, 6, H);

    // weed spots
    for (const s of Wd.spots) {
      const sx = s.x - camX, sy = s.y - camY;
      if (sx < -90 || sx > W + 90 || sy < -70 || sy > H + 70) continue;
      for (const wd of s.weeds) {
        const r = mulberry32(wd.s);
        ctx.fillStyle = '#1d5a30';
        for (let k = 0; k < wd.r * 2; k++) {
          ctx.fillRect(Math.round(sx + wd.dx + (r() - 0.5) * wd.r * 2),
            Math.round(sy + wd.dy + (r() - 0.5) * wd.r * 1.4), 2, 1);
        }
      }
      const stars = '*'.repeat(s.q);
      textCS(ctx, stars, sx, sy - 34, '#bfe8bf');
      if (s.isHot && Math.floor(G.t * 3) % 2 === 0) textCS(ctx, '*HOT*', sx, sy - 44, '#ffd040');
    }
    // rocks (fog hides far rocks)
    for (const rk of Wd.rocks) {
      if (fog && dist(B.x, B.y, rk.x, rk.y) > 85) continue;
      const sx = rk.x - camX, sy = rk.y - camY;
      ctx.fillStyle = '#5a6066';
      ctx.fillRect(sx - rk.r, sy - rk.r * 0.6, rk.r * 2, rk.r * 1.2);
      ctx.fillStyle = '#7a8086';
      ctx.fillRect(sx - rk.r + 2, sy - rk.r * 0.6, rk.r, 3);
    }
    // buoys
    for (const b of Wd.buoys) {
      const sx = b.x - camX, sy = b.y - camY + Math.sin(G.t * 2 + b.x) * 1.5;
      ctx.fillStyle = '#e04030'; ctx.fillRect(sx - 2, sy - 6, 4, 6);
      ctx.fillStyle = '#fff'; ctx.fillRect(sx - 2, sy - 3, 4, 1);
    }
    // dock
    {
      const dx = Wd.dock.x - camX, dy = Wd.dock.y - camY;
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(dx - 16, dy - 6, 32, 26);
      ctx.fillStyle = '#4a3420';
      for (let k = -16; k < 16; k += 6) ctx.fillRect(dx + k, dy - 6, 1, 26);
      textCS(ctx, 'DOCK', dx, dy - 16, '#ffd040');
    }
    // patrols
    for (const P of Wd.patrols) {
      const sx = P.x - camX, sy = P.y - camY;
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(sx - 8, sy - 4, 16, 8);
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(sx - 5, sy - 2, 10, 4);
      const phase = Math.floor(G.t * 6) % 2;
      ctx.fillStyle = phase ? '#f03030' : '#3060f0';
      ctx.fillRect(sx - 2, sy - 7, 4, 3);
      textCS(ctx, 'COPS', sx, sy - 14, '#f88');
      if (P.seen && Math.floor(G.t * 4) % 2 === 0) textCS(ctx, '!', sx, sy - 22, '#f44', 2);
    }
    // player boat
    {
      const sx = B.x - camX, sy = B.y - camY;
      // wake
      if (B.v > 20) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let k = 1; k <= 3; k++) {
          ctx.fillRect(Math.round(sx - Math.cos(B.ang) * k * 9 - 1), Math.round(sy - Math.sin(B.ang) * k * 9), 2 + k, 1);
        }
      }
      ctx.save();
      ctx.translate(Math.round(sx), Math.round(sy));
      ctx.rotate(B.ang);
      ctx.fillStyle = '#b03028'; ctx.fillRect(-9, -4, 18, 8);
      ctx.fillStyle = '#d8d0c0'; ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = '#b03028'; ctx.fillRect(9, -2, 3, 4); // bow
      ctx.fillStyle = '#403830'; ctx.fillRect(-4, -2, 3, 3);  // you
      ctx.fillStyle = '#604a30'; ctx.fillRect(1, -2, 3, 3);   // earl
      ctx.restore();
      if (T.drinking > 0) textCS(ctx, 'GLUG', sx + 10, sy - 12, '#ffd040');
    }
    // fog overlay
    if (fog) {
      ctx.fillStyle = 'rgba(210,220,220,0.22)';
      for (let y = 0; y < H; y += 18) {
        const off = Math.sin(G.t * 0.4 + y * 0.3) * 20;
        ctx.fillRect(0, y + off * 0, W, 9);
      }
      ctx.fillStyle = 'rgba(210,220,220,0.18)';
      ctx.fillRect(0, 0, W, H);
    }
    // dusk tint
    const dk = duskK();
    if (dk > 0) { ctx.fillStyle = 'rgba(60,20,60,' + (dk * 0.35).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }

    // pull-over flash
    if (this.pull > 0) {
      const phase = Math.floor(G.t * 6) % 2;
      ctx.fillStyle = phase ? 'rgba(220,40,40,0.25)' : 'rgba(40,80,240,0.25)';
      ctx.fillRect(0, 0, W, H);
      textCS(ctx, 'PULL OVER!', W / 2, 100, '#fff', 3);
    }

    // ---- HUD ----
    panel(ctx, 4, 4, 58, 20); drawClock(8, 7);
    drawBuzz(W - 52, 6);
    drawWeatherIcon(W - 22, 30);
    panel(ctx, 4, H - 16, 150, 12); drawCooler(8, H - 15);
    // suspicion eye
    if (T.susp > 1) {
      panel(ctx, 4, 28, 58, 12);
      text(ctx, 'HEAT', 8, 31, '#f88');
      ctx.fillStyle = '#301010'; ctx.fillRect(30, 31, 28, 5);
      ctx.fillStyle = T.susp > 70 ? '#f03030' : '#f0a030';
      ctx.fillRect(30, 31, Math.round(28 * T.susp / 100), 5);
    }
    // minimap
    {
      const mw = 56, mh = Math.max(24, Math.round(mw * Wd.h / Wd.w));
      const mx = W - mw - 4, my = H - mh - 4;
      panel(ctx, mx - 1, my - 1, mw + 2, mh + 2);
      ctx.fillStyle = '#123a42'; ctx.fillRect(mx, my, mw, mh);
      const k = mw / Wd.w;
      for (const s of Wd.spots) {
        ctx.fillStyle = s.isHot ? '#ffd040' : '#3a9a50';
        ctx.fillRect(mx + Math.round(s.x * k) - 1, my + Math.round(s.y * k) - 1, 2, 2);
      }
      ctx.fillStyle = '#caa86a';
      ctx.fillRect(mx + Math.round(Wd.dock.x * k) - 1, my + Math.round(Wd.dock.y * k) - 1, 3, 2);
      for (const P of Wd.patrols) {
        const px = mx + Math.round(P.x * k), py = my + Math.round(P.y * k);
        ctx.fillStyle = '#f03030'; ctx.fillRect(px - 2, py - 1, 2, 2);
        ctx.fillStyle = '#3060f0'; ctx.fillRect(px, py - 1, 2, 2);
        if (Math.floor(G.t * 4) % 2 === 0) {
          textS(ctx, 'COPS', clamp(px - 7, mx + 1, mx + mw - 16), clamp(py - 8, my + 1, my + mh - 6), '#f66');
        }
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(mx + Math.round(B.x * k) - 1, my + Math.round(B.y * k) - 1, 2, 2);
    }
    // hints
    if (this.nearSpot && this.pull <= 0) textCS(ctx, kt('SPACE: DROP ANCHOR & FISH', 'CAST: DROP ANCHOR & FISH'), W / 2, H - 34, '#ffd040');
    else if (this.nearDock && this.pull <= 0) textCS(ctx, kt('ENTER: CALL IT A DAY (CASH IN)', 'OK: CALL IT A DAY (CASH IN)'), W / 2, H - 34, '#8f8');
    earlDraw();
  },
};
