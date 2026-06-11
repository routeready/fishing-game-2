'use strict';
// Over-the-shoulder fishing view: cast, wait, strike, reel.
// Layout is an homage to 16-bit bass fishers: teal water, weed beds,
// TIME/WIND top-left, gauge top-right, POWER bottom-left, LINE/LURE bottom-right.

RT.scenes.fish = {
  enter(args) {
    const T = G.trip, L = LAKES[T.lake];
    this.spot = args.spot;
    this.mode = 'aim';        // aim | power | fly | wait | fight | card
    this.ret = { x: 160, y: 95 };
    this.swayT = rnd(0, 9);
    this.power = 0; this.pDir = 1;
    this.needed = 0.5;
    this.lure = null;         // {x,y} where it sits
    this.flyT = 0; this.flyFrom = null; this.flyTo = null;
    this.biteIn = 0; this.nibbleIn = 0; this.biteWin = 0; this.waitT = 0;
    this.fish = null; this.card = null;
    this.tension = 50; this.distM = 0; this.startDist = 0;
    this.run = false; this.runIn = 0; this.runDur = 0;
    this.snapAcc = 0; this.slackAcc = 0;
    this.fishX = 160;
    this.msg = null; this.msgT = 0;
    this.super = false;
    this.hunkT = 0;
    this.ripples = [];
    // patrol sweeps while anchored
    this.sweep = { st: 'off', t: L.sweep > 0 ? rnd(25, 60) / L.sweep : 1e9, rolled: false, dir: 1 };
    // project this spot's weed clumps onto the casting view
    this.weeds = this.spot.weeds.map(wd => ({
      x: clamp(160 + wd.dx * 1.9, 30, 290),
      y: clamp(92 + wd.dy * 1.1, 52, 138),
      r: wd.r, s: wd.s,
    }));
  },

  say(txt, t, col) { this.msg = txt; this.msgT = t || 1.6; this.msgCol = col || '#fff'; },

  nearWeed(x, y) {
    for (const wd of this.weeds) if (dist(x, y, wd.x, wd.y) < wd.r + 16) return true;
    return false;
  },

  biteTime() {
    const T = G.trip, L = LAKES[T.lake];
    let mult = G.daily.weather.bite * (1 + T.buzz * 0.12) * (1 + (this.spot.q - 1) * 0.25);
    if (this.spot.isHot) mult *= 1.7;
    mult *= this.nearWeed(this.lure.x, this.lure.y) ? 1.35 : 0.8;
    mult *= 1 + duskK() * 0.3;
    return rnd(3.5, 9) / mult;
  },

  pickFish() {
    const T = G.trip, L = LAKES[T.lake];
    // legendary roll: hot spot or dusk wakes them up
    const dusky = T.timeMin >= 19 * 60;
    let pLeg = (this.spot.isHot || dusky) ? 0.015 : 0.003;
    if (this.super) pLeg = 0.25;
    if (Math.random() < pLeg) {
      const f = FISH[L.legend];
      return { id: L.legend, f, w: rnd(f.wMin, f.wMax) };
    }
    let table = L.fish.map(([id, wt], i) => [id, wt * (this.nearWeed(this.lure.x, this.lure.y) ? 1 + i * 0.3 : 1)]);
    if (this.super) { // monster: top two species only
      table = table.slice(-2).map(([id, wt]) => [id, wt]);
    }
    const tot = table.reduce((s, e) => s + e[1], 0);
    let roll = Math.random() * tot;
    let id = table[0][0];
    for (const [tid, wt] of table) { roll -= wt; if (roll <= 0) { id = tid; break; } }
    const f = FISH[id];
    const skew = this.super ? 0.5 : 1.8 - 0.25 * this.spot.q;
    const w = f.wMin + (f.wMax - f.wMin) * Math.pow(Math.random(), skew);
    return { id, f, w };
  },

  hook() {
    const T = G.trip;
    const { id, f, w } = this.pickFish();
    this.fish = { id, f, w };
    this.startDist = 12 + w * 1.1 + this.power * 10;
    this.distM = this.startDist;
    this.tension = 50;
    this.run = false; this.runIn = rnd(0.6, 1.6);
    this.snapAcc = 0; this.slackAcc = 0;
    this.fishX = this.lure.x;
    this.mode = 'fight';
    SFX.hook();
    RT.addShake(2.5, 0.25);
    if (f.legend) { this.say('SOMETHING HUGE!!', 2, '#ffd040'); SFX.horn(); }
  },

  land() {
    const T = G.trip;
    const { id, f, w } = this.fish;
    const fod = id === G.daily.fod;
    const bm = buzzMult(T.buzz);
    let val = f.base * (0.5 + 1.5 * (w / f.wMax)) * bm * (fod ? 2 : 1);
    val = Math.round(val);
    const kept = T.cooler.length < coolerCap();
    if (kept) T.cooler.push({ id, name: f.name, w, val, buzz: T.buzz });
    // trophies & records always count — the story is true even if the cooler's full
    const tr = G.save.trophies[id] || { w: 0, n: 0 };
    tr.n++; tr.w = Math.max(tr.w, w);
    G.save.trophies[id] = tr;
    const R = G.save.records;
    let newBig = false;
    if (w > R.bigW) { R.bigW = w; R.bigName = f.name; newBig = true; }
    persist();
    this.card = { f, w, val, bm, fod, kept, newBig };
    this.mode = 'card';
    this.fish = null;
    if (f.legend) RT.addFlash('#ffd040', 0.3);
    if (f.legend || newBig) SFX.fanfare(); else SFX.land();
    if (f.legend) earlSay('EARL: ' + f.name + '!! I HEARD IT WAS A MYTH!!', 5);
    else if (!kept) earlSay("EARL: COOLER'S FULL, BUD. BACK SHE GOES.", 4);
  },

  loseFish(why) {
    this.fish = null;
    this.lure = null;
    this.mode = 'aim';
    this.say(why, 2, '#f88');
  },

  // ---- patrol sweep while anchored ----
  sweepUpdate(dt) {
    const T = G.trip, L = LAKES[T.lake], S = this.sweep;
    if (L.sweep <= 0) return;
    S.t -= dt;
    const hunkered = held('lay');
    if (S.st === 'off' && S.t <= 0) {
      S.st = 'warn'; S.t = 3.5; S.rolled = false; S.dir = Math.random() < 0.5 ? 1 : -1;
      SFX.siren();
      earlSay(EARL_STASH, 3);
    } else if (S.st === 'warn' && S.t <= 0) {
      S.st = 'pass'; S.t = 4.2;
      SFX.siren();
    } else if (S.st === 'pass') {
      if (hunkered) {
        this.hunkT += dt;
        if (this.mode === 'fight' && this.hunkT > 0.8) this.loseFish('YOU LET IT GO... AND LAID LOW.');
      } else {
        this.hunkT = 0;
        if (T.drinking > 0) { // caught red-handed, can in the air
          setScene('breath', { from: 'fish' });
          return;
        }
        // one catch-roll mid-pass if you're over the limit and visible
        if (!S.rolled && S.t < 2.1) {
          S.rolled = true;
          if (T.buzz > BUZZ_LIMIT) {
            const fogK = G.daily.weather.id === 'FOG' ? 0.55 : 1;
            const p = ((T.buzz - BUZZ_LIMIT) / (10 - BUZZ_LIMIT)) * 0.85 * fogK;
            if (Math.random() < p) { setScene('breath', { from: 'fish' }); return; }
          }
        }
      }
      if (S.t <= 0) {
        S.st = 'off'; S.t = rnd(35, 70) / L.sweep;
        if (T.buzz > BUZZ_LIMIT && !hunkered) {
          T.nearMisses++; G.save.records.nearMisses++; persist();
          SFX.near(); toast('CLOSE ONE!', '#ffd040');
          earlSay(pick(EARL_NEAR), 3.5);
        }
        this.hunkT = 0;
      }
    } else if (S.st === 'warn' && hunkered && this.mode === 'fight') {
      this.hunkT += dt;
      if (this.hunkT > 0.8) this.loseFish('YOU LET IT GO... AND LAID LOW.');
    }
  },

  update(dt) {
    const T = G.trip, L = LAKES[T.lake];
    if (tripTick(dt)) { setScene('summary'); return; }
    earlUpdate(dt);
    this.swayT += dt;
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.msg = null; }
    this.sweepUpdate(dt);
    if (G.sceneName !== 'fish') return; // sweep may have pulled us over
    for (const rp of this.ripples) rp.t += dt;
    this.ripples = this.ripples.filter(rp => rp.t < 1.2);

    if (pressed('beer')) drink();

    const sway = shakeAmt();
    const hunkered = held('lay') && (this.sweep.st === 'warn' || this.sweep.st === 'pass');

    if (this.mode === 'aim') {
      const spd = 70;
      if (held('left')) this.ret.x -= spd * dt;
      if (held('right')) this.ret.x += spd * dt;
      if (held('up')) this.ret.y -= spd * 0.8 * dt;
      if (Keys.held.down) this.ret.y += spd * 0.8 * dt;
      this.ret.x = clamp(this.ret.x, 24, 296);
      this.ret.y = clamp(this.ret.y, 48, 140);
      if (pressed('hold') && !T.holdUsed && T.buzz >= 6) {
        T.holdUsed = true;
        this.super = true;
        T.buzz = 0;
        earlSay('EARL: I GOT YER BEER. NOW THROW LIKE YOU MEAN IT.', 3.5);
        SFX.fanfare();
      }
      if (pressed('act') && !hunkered) {
        this.mode = 'power';
        this.power = 0; this.pDir = 1;
        // farther targets need more juice
        this.needed = 0.25 + (140 - this.ret.y) / 92 * 0.65;
        SFX.sel();
      }
      if (pressed('back')) { setScene('boat', {}); return; }
    } else if (this.mode === 'power') {
      const spd = (1.5 + sway * 1.6) * (this.super ? 0.8 : 1);
      this.power += this.pDir * spd * dt;
      if (this.power >= 1) { this.power = 1; this.pDir = -1; }
      if (this.power <= 0) { this.power = 0; this.pDir = 1; }
      if (this.super) this.power = this.needed; // Earl steadies your arm
      if (pressed('act') || this.super) {
        const err = this.power - this.needed;
        const sw = this.swayOff();
        const wind = G.daily.windSpd * 3;
        const lx = clamp(this.ret.x + sw.x + Math.cos(G.daily.windDir) * wind, 16, 304);
        const ly = clamp(this.ret.y + sw.y - err * 85, 44, 148);
        this.flyFrom = { x: 178, y: 150 };
        this.flyTo = { x: lx, y: ly };
        this.flyT = 0;
        this.mode = 'fly';
        SFX.cast();
      }
      if (pressed('back')) this.mode = 'aim';
    } else if (this.mode === 'fly') {
      this.flyT += dt / 0.7;
      if (this.flyT >= 1) {
        this.lure = { x: this.flyTo.x, y: this.flyTo.y, bob: 0 };
        this.ripples.push({ x: this.lure.x, y: this.lure.y, t: 0 });
        SFX.splash();
        this.mode = 'wait';
        this.waitT = 0;
        this.biteIn = this.super ? 1.2 : this.biteTime();
        this.nibbleIn = rnd(1, 3);
        this.biteWin = 0;
      }
    } else if (this.mode === 'wait') {
      this.waitT += dt;
      this.lure.bob = Math.sin(this.waitT * 2.4) * 1.5;
      if (this.biteWin > 0) {
        this.biteWin -= dt;
        if (pressed('act')) { this.hook(); return; }
        if (this.biteWin <= 0) {
          this.say('MISSED IT...', 1.6, '#f88');
          this.biteIn = this.biteTime();
        }
      } else {
        this.nibbleIn -= dt;
        if (this.nibbleIn <= 0) {
          this.nibbleIn = rnd(2, 5);
          SFX.nibble();
          this.ripples.push({ x: this.lure.x, y: this.lure.y, t: 0 });
        }
        if (!hunkered) this.biteIn -= dt;
        if (this.biteIn <= 0) {
          this.biteWin = RT.touch ? 0.7 : 0.55; // touchscreens get a hair more strike time
          SFX.bite(); RT.addFlash('#ffffff', 0.1);
          this.ripples.push({ x: this.lure.x, y: this.lure.y, t: 0 });
        } else if (pressed('act')) {
          this.say('TOO SOON - SPOOKED EM', 1.4, '#f88');
          this.biteIn += 2.5;
        }
      }
      if (pressed('back')) { this.lure = null; this.mode = 'aim'; }
    } else if (this.mode === 'fight') {
      const f = this.fish.f;
      const rod = RODS[G.save.rod];
      // fish runs
      if (this.run) {
        this.runDur -= dt;
        if (this.runDur <= 0) this.run = false;
      } else {
        this.runIn -= dt;
        if (this.runIn <= 0) {
          this.run = true;
          this.runDur = rnd(0.7, 1.4) + f.fight * 0.9;
          this.runMax = this.runDur;
          this.runIn = rnd(1.5, 3.2) * (1.1 - f.fight * 0.5);
          SFX.splash();
        }
      }
      const reeling = held('act') && !hunkered;
      if (reeling) {
        this.tension += (40 + (this.run ? 28 + f.fight * 48 : 0)) * dt;
        if (Math.floor(G.t * 12) % 2 === 0) SFX.reel();
      } else {
        this.tension -= 52 * dt;
        if (this.run) this.tension += 20 * dt;
      }
      // buzzed hands: the needle will not sit still
      this.tension += (Math.random() - 0.5) * sway * 46 * dt + Math.sin(this.swayT * 3.1) * sway * 14 * dt;
      this.tension = clamp(this.tension, 0, 100);
      const lo = 58 - rod.green, hi = 58 + rod.green;
      if (reeling) {
        let rate = rod.reel;
        if (this.tension >= lo && this.tension <= hi) rate *= 1;
        else if (this.tension > hi) rate *= 0.55;
        else rate *= 0.3;
        this.distM -= rate * dt;
      } else if (this.run) {
        this.distM = Math.min(this.startDist + 15, this.distM + 3 * dt);
      }
      // line snap
      if (this.tension > 95) {
        this.snapAcc += dt;
        if (this.snapAcc > rod.snapT) {
          SFX.snap(); RT.addShake(3, 0.35); RT.addFlash('#f04040', 0.18);
          this.loseFish('LINE SNAPPED!'); return;
        }
      } else this.snapAcc = Math.max(0, this.snapAcc - dt * 2);
      // slack
      if (this.tension < 4 && this.run) {
        this.slackAcc += dt;
        if (this.slackAcc > 1.3) { SFX.off(); this.loseFish('IT SPIT THE HOOK...'); return; }
      } else this.slackAcc = 0;
      // fish wanders
      this.fishX += Math.sin(this.swayT * 1.9 + this.startDist) * 22 * dt * (this.run ? 2.5 : 1);
      this.fishX = clamp(this.fishX, 30, 290);
      if (this.distM <= 0) { this.land(); return; }
      if (pressed('back')) { SFX.off(); this.loseFish('CUT IT LOOSE.'); return; }
    } else if (this.mode === 'card') {
      if (pressed('act') || pressed('ok')) {
        this.card = null; this.lure = null; this.super = false;
        this.mode = 'aim';
      }
    }
  },

  swayOff() {
    const s = shakeAmt();
    return {
      x: Math.sin(this.swayT * 2.2) * 14 * s + Math.sin(this.swayT * 5.3) * 5 * s,
      y: Math.cos(this.swayT * 1.7) * 9 * s,
    };
  },

  draw() {
    const T = G.trip, L = LAKES[T.lake];
    const dk = duskK();

    // tree line / shore
    ctx.fillStyle = '#173a20'; ctx.fillRect(0, 0, W, 26);
    ctx.fillStyle = '#0f2c16';
    const tr = mulberry32(this.spot.id * 977 + 5);
    for (let i = 0; i < 220; i++) ctx.fillRect(Math.floor(tr() * W), Math.floor(tr() * 22), 2, 2);
    ctx.fillStyle = '#caa86a'; ctx.fillRect(0, 26, W, 3);

    // water — banded teal, lighter as it nears the boat
    const bands = ['#27828e', '#2e96a2', '#35a4b0', '#3badb8'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = bands[i];
      ctx.fillRect(0, 29 + i * 49, W, 49 + 20);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let y = 32; y < H; y += 9) {
      const off = Math.sin(G.t * 1.3 + y * 0.32) * 10;
      ctx.fillRect(Math.round(off), y, W, 1);
      ctx.fillRect(Math.round(70 + off * 1.6 + (y * 23) % 180), y + 4, 18, 1);
      ctx.fillRect(Math.round(210 - off * 1.2 + (y * 41) % 90), y + 5, 12, 1);
    }

    // weed beds — stippled like the old carts
    for (const wd of this.weeds) {
      const r = mulberry32(wd.s);
      for (let k = 0; k < wd.r * 4; k++) {
        ctx.fillStyle = k % 3 ? '#2a6a30' : '#1d5226';
        ctx.fillRect(Math.round(wd.x + (r() - 0.5) * wd.r * 3.2),
          Math.round(wd.y + (r() - 0.5) * wd.r * 1.6), 2, 1);
      }
    }

    // ripples
    for (const rp of this.ripples) {
      const k = rp.t / 1.2;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - k)).toFixed(2) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, 4 + k * 16, (4 + k * 16) * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // patrol sweep visuals
    const S = this.sweep;
    if (S.st === 'warn') {
      // light on the far shore + chirp already played
      const phase = Math.floor(G.t * 5) % 2;
      ctx.fillStyle = phase ? '#f03030' : '#3060f0';
      ctx.fillRect(S.dir > 0 ? 6 : W - 12, 12, 6, 5);
      if (phase) textCS(ctx, kt('PATROL COMING - HOLD S TO LAY LOW', 'PATROL COMING - HOLD LAY LOW'), W / 2, 38, '#f66');
    } else if (S.st === 'pass') {
      const k = 1 - S.t / 4.2;
      const px = S.dir > 0 ? -30 + k * (W + 60) : W + 30 - k * (W + 60);
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(px - 14, 33, 28, 7);
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(px - 8, 30, 16, 4);
      const phase = Math.floor(G.t * 6) % 2;
      ctx.fillStyle = phase ? '#f03030' : '#3060f0';
      ctx.fillRect(px - 2, 26, 4, 4);
      if (T.buzz > BUZZ_LIMIT && !held('lay')) textCS(ctx, "THEY'RE LOOKING...", W / 2, 44, '#f66');
    }

    // reticle / lure / line
    const rodTip = { x: 178, y: 148 };
    if (this.mode === 'aim' || this.mode === 'power') {
      const sw = this.swayOff();
      const rx = Math.round(this.ret.x + sw.x), ry = Math.round(this.ret.y + sw.y);
      const blink = Math.floor(G.t * 6) % 2 === 0;
      ctx.strokeStyle = blink ? '#fff' : '#ffd040';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(rx, ry, 7, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = blink ? '#fff' : '#ffd040';
      ctx.fillRect(rx - 1, ry - 7, 2, 4); ctx.fillRect(rx - 1, ry + 3, 2, 4);
      ctx.fillRect(rx - 10, ry, 4, 1); ctx.fillRect(rx + 6, ry, 4, 1);
    }
    if (this.mode === 'fly') {
      const t = clamp(this.flyT, 0, 1);
      const x = lerp(this.flyFrom.x, this.flyTo.x, t);
      const y = lerp(this.flyFrom.y, this.flyTo.y, t) - Math.sin(t * Math.PI) * 46;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.moveTo(rodTip.x, rodTip.y); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    if (this.lure && (this.mode === 'wait')) {
      const dip = this.biteWin > 0 ? 3 : 0;
      const ly = Math.round(this.lure.y + this.lure.bob + dip);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.moveTo(rodTip.x, rodTip.y); ctx.lineTo(this.lure.x, ly - 2); ctx.stroke();
      ctx.fillStyle = '#f03030'; ctx.fillRect(Math.round(this.lure.x) - 2, ly - 3, 4, 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(this.lure.x) - 2, ly - 1, 4, 2);
      if (this.biteWin > 0 && Math.floor(G.t * 8) % 2 === 0) {
        textCS(ctx, '!', this.lure.x, ly - 16, '#ffd040', 2);
      }
    }
    if (this.mode === 'fight' && this.fish) {
      // fish splashing somewhere out there; closer as distM drops
      const k = clamp(this.distM / this.startDist, 0, 1);
      const fy = lerp(150, 52, k);
      const fx = this.fishX;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.moveTo(rodTip.x, rodTip.y);
      ctx.quadraticCurveTo((rodTip.x + fx) / 2, (rodTip.y + fy) / 2 + 12, fx, fy);
      ctx.stroke();
      // the fish leaps clear of the water during a run
      const runK = this.run && this.runMax ? 1 - this.runDur / this.runMax : 0;
      const jump = this.run ? Math.sin(runK * Math.PI) * 13 : 0;
      const fl = clamp(10 + this.fish.w * 0.9, 10, 26);
      drawFish(ctx, fx, fy - jump, fl, this.fish.f.col);
      if (this.run) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 6; i++) {
          const sx2 = fx + Math.sin(G.t * 17 + i * 2.1) * (6 + jump * 0.5);
          const sy2 = fy + 1 - jump * (0.2 + (i % 3) * 0.3);
          ctx.fillRect(Math.round(sx2), Math.round(sy2), 1 + (i % 2), 1);
        }
        if (Math.floor(G.t * 6) % 2 === 0) textCS(ctx, 'RUN! EASE OFF!', fx, fy - jump - 16, '#f66');
      }
    }

    // angler (back view) — crouches when laying low
    this.drawAngler(held('lay') && (S.st === 'warn' || S.st === 'pass'));

    // ---- HUD ----
    panel(ctx, 4, 4, 58, 20); drawClock(8, 7);
    drawWind(8, 28);
    drawBuzz(W - 52, 6);
    drawWeatherIcon(W - 22, 32);
    if (this.spot.isHot) textCS(ctx, '* HOT SPOT *', W / 2, 6, '#ffd040');

    // POWER (bottom-left, red bar like the reference)
    if (this.mode === 'power') {
      text(ctx, 'POWER', 8, H - 10, '#fff');
      const bx = 34, bw = 92;
      ctx.fillStyle = '#1a1010'; ctx.fillRect(bx, H - 11, bw, 7);
      // needed window: green underline so the fill never hides it
      const nx = bx + Math.round((this.needed - 0.08) * bw);
      const nw = Math.round(0.16 * bw);
      ctx.fillStyle = '#1f6a30'; ctx.fillRect(nx, H - 11, nw, 7);
      ctx.fillStyle = '#40e060'; ctx.fillRect(nx, H - 3, nw, 2);
      const pw = Math.round(this.power * bw);
      for (let i = 0; i < pw; i += 2) {
        ctx.fillStyle = i / bw < 0.5 ? '#c03020' : '#f06040';
        ctx.fillRect(bx + i, H - 10, 1, 5);
      }
      ctx.fillStyle = '#fff'; ctx.fillRect(bx + pw - 1, H - 12, 2, 9);
    }

    // tension bar during fight (left side, vertical)
    if (this.mode === 'fight') {
      const bx = 10, by = 66, bh = 80;
      panel(ctx, bx - 3, by - 12, 18, bh + 24);
      text(ctx, 'T', bx + 2, by - 9, '#fff');
      ctx.fillStyle = '#1a1010'; ctx.fillRect(bx, by, 10, bh);
      const rod = RODS[G.save.rod];
      const lo = 58 - rod.green, hi = 58 + rod.green;
      const zy = by + bh - Math.round(hi / 100 * bh);
      const zh = Math.round((hi - lo) / 100 * bh);
      ctx.fillStyle = '#1f6a30'; ctx.fillRect(bx, zy, 10, zh);
      ctx.fillStyle = '#801818'; ctx.fillRect(bx, by, 10, Math.round(5 / 100 * bh));
      const ty = by + bh - Math.round(this.tension / 100 * bh);
      ctx.fillStyle = this.tension > 95 ? '#f03030' : '#fff';
      ctx.fillRect(bx - 2, ty - 1, 14, 3);
      if (this.tension > 90 && Math.floor(G.t * 8) % 2 === 0) text(ctx, 'SNAP!', bx - 2, by - 20, '#f44');
      // line distance, bottom-right like the reference
      textS(ctx, Math.max(0, Math.ceil(this.distM)) + 'M', 246, H - 22, '#fff', 2);
      text(ctx, 'LINE', 248, H - 9, '#fff');
      text(ctx, kt('HOLD SPACE: REEL', 'HOLD CAST: REEL'), 110, H - 10, '#9fd');
    } else {
      textS(ctx, (this.lure ? Math.round(dist(rodTip.x, rodTip.y, this.lure.x, this.lure.y) / 6) : 0) + 'M', 246, H - 22, '#fff', 2);
      text(ctx, 'LINE', 248, H - 9, '#fff');
    }
    // lure box (bottom-right corner)
    panel(ctx, 286, H - 28, 26, 24);
    // little spoon lure: red head, silver body, hook
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(293, H - 22, 9, 3);
    ctx.fillStyle = '#f03030'; ctx.fillRect(291, H - 22, 3, 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(301, H - 19, 1, 3); ctx.fillRect(299, H - 17, 2, 1);
    text(ctx, 'LURE', 290, H - 9, '#fff');

    panel(ctx, 70, 4, 110, 12); drawCooler(74, 5);

    // contextual hints
    if (this.mode === 'aim') {
      let hint = kt('AIM + SPACE: CAST   B: BEER   ESC: ANCHOR UP', 'AIM: D-PAD   THEN TAP CAST   BACK: ANCHOR UP');
      textCS(ctx, hint, W / 2, H - 36, '#cfe8e8');
      if (!T.holdUsed && T.buzz >= 6 && Math.floor(G.t * 2) % 2 === 0) {
        textCS(ctx, kt('H: "HOLD MY BEER" SUPER-CAST READY!', 'HMB!: SUPER-CAST READY!'), W / 2, H - 46, '#ffd040');
      }
    } else if (this.mode === 'wait' && this.biteWin <= 0) {
      textCS(ctx, kt('WAIT FOR THE BITE... SPACE TO STRIKE', 'WAIT FOR THE BITE... TAP CAST TO STRIKE'), W / 2, H - 36, '#cfe8e8');
    }
    if (held('lay') && (S.st === 'warn' || S.st === 'pass')) {
      textCS(ctx, 'LAYING LOW...', W / 2, 120, '#9fd', 2);
    }
    if (T.drinking > 0) {
      // can tips back
      textCS(ctx, 'GLUG GLUG', 160, 150, '#ffd040');
    }

    // catch card
    if (this.mode === 'card' && this.card) {
      const c = this.card;
      panel(ctx, 40, 50, 240, 110);
      textC(ctx, c.f.legend ? '** LEGENDARY **' : 'FISH ON BOARD!', W / 2, 56, c.f.legend ? '#ffd040' : '#8f8');
      if (c.f.legend) starburst(ctx, W / 2, 82, G.t);
      drawFish(ctx, W / 2, 82, 28 + 38 * clamp(c.w / c.f.wMax, 0, 1), c.f.col);
      textC(ctx, c.f.name, W / 2, 100, '#fff', 2);
      textC(ctx, fmtLb(c.w) + ' LB', W / 2, 116, '#9fd');
      let line = money(c.val);
      if (c.bm > 1.05) line += '  (BUZZ X' + (Math.round(c.bm * 10) / 10) + ')';
      if (c.fod) line += '  FISH OF THE DAY X2!';
      textC(ctx, line, W / 2, 126, '#8f8');
      if (!c.kept) textC(ctx, 'COOLER FULL - RELEASED, NO CASH', W / 2, 136, '#f88');
      if (c.newBig) textC(ctx, 'NEW PERSONAL BEST!', W / 2, 144, '#ffd040');
      textC(ctx, kt('ENTER: KEEP FISHING', 'OK: KEEP FISHING'), W / 2, 152, '#48818b');
    }

    if (this.msg) textCS(ctx, this.msg, W / 2, 80, this.msgCol, 2);

    // weather + time of day washes
    if (G.daily.weather.id === 'OVERCAST') { ctx.fillStyle = 'rgba(70,82,96,0.16)'; ctx.fillRect(0, 0, W, H); }
    if (G.daily.weather.id === 'BREEZY') {
      ctx.fillStyle = 'rgba(8,28,38,0.13)';
      const wdir = Math.cos(G.daily.windDir) >= 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const cx2 = ((i * 160 + G.t * (10 + G.daily.windSpd * 4) * wdir) % (W + 220) + W + 220) % (W + 220) - 110;
        ctx.beginPath(); ctx.ellipse(cx2, 60 + i * 46, 78, 26, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    RT.duskDraw();
    if (G.daily.weather.id === 'FOG') { ctx.fillStyle = 'rgba(210,220,220,0.15)'; ctx.fillRect(0, 0, W, H); }

    earlDraw();
  },

  drawAngler(crouch) {
    const T = G.trip;
    const x = 160, y = crouch ? 196 : 180;
    // boat bow
    ctx.fillStyle = '#b03028'; ctx.fillRect(x - 34, 208, 68, 16);
    ctx.fillStyle = '#7a201c'; ctx.fillRect(x - 34, 208, 68, 3);
    // legs/torso
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(x - 7, y + 22, 5, 8); ctx.fillRect(x + 2, y + 22, 5, 8);
    ctx.fillStyle = '#8a2430'; ctx.fillRect(x - 9, y + 6, 18, 17); // shirt
    ctx.fillStyle = '#3a5a30'; ctx.fillRect(x - 7, y + 8, 14, 13); // vest
    ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 3, y + 13, 6, 3);  // patch
    // head + cap (tips back mid-sip)
    const tip = T.drinking > 0 ? 1 : 0;
    ctx.fillStyle = '#d8a878'; ctx.fillRect(x - 4, y - 2 - tip, 8, 8);
    ctx.fillStyle = '#304a8a'; ctx.fillRect(x - 5 - tip, y - 4 - tip, 10, 4);
    // rod arm + rod: cocked back on power, swung forward on the cast,
    // bent double in a fight
    ctx.fillStyle = '#8a2430'; ctx.fillRect(x + 8, y + 6, 4, 8);
    ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 8);
    if (this.mode === 'fight') ctx.quadraticCurveTo(x + 20, y - 24, x + 14, y - 32);
    else if (this.mode === 'power') ctx.quadraticCurveTo(x + 27, y - 6, x + 32, y - 20);
    else if (this.mode === 'fly') ctx.quadraticCurveTo(x + 12, y - 26, x + 2, y - 28);
    else ctx.quadraticCurveTo(x + 22, y - 18, x + 18, y - 30);
    ctx.stroke();
    if (this.mode === 'fight' && held('act')) {
      const ca = G.t * 14;
      ctx.fillStyle = '#d8c8a8';
      ctx.fillRect(Math.round(x + 10 + Math.cos(ca) * 2), Math.round(y + 11 + Math.sin(ca) * 2), 2, 2);
    }
    // beer arm
    if (T.drinking > 0) {
      ctx.fillStyle = '#8a2430'; ctx.fillRect(x - 13, y, 4, 8);
      ctx.fillStyle = '#f0c020'; ctx.fillRect(x - 14, y - 5, 5, 6);
    }
  },
};
