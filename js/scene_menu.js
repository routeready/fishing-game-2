'use strict';
// Title, dock hub, shop, trophy wall, leaderboard, daily report,
// trip summary, breathalyzer and bust scenes.

function waterStripes(y0, y1, base, stripe, speed) {
  ctx.fillStyle = base; ctx.fillRect(0, y0, W, y1 - y0);
  ctx.fillStyle = stripe;
  for (let y = y0; y < y1; y += 6) {
    const off = Math.sin(G.t * speed + y * 0.21) * 8;
    ctx.fillRect(0, y, W, 1);
    ctx.fillRect(Math.round(40 + off + (y * 13) % 240), y + 3, 14, 1);
    ctx.fillRect(Math.round(180 - off + (y * 29) % 200), y + 3, 10, 1);
  }
}

// ---------------- TITLE ----------------
RT.scenes.title = {
  enter() {},
  update(dt) {
    if (pressed('ok') || pressed('act') || RT.tap) { SFX.fanfare(); setScene('dock'); }
  },
  draw() {
    // sunset gradient sky
    const sky = ['#0c2230', '#173648', '#34465a', '#6a4438'];
    const skyH = [20, 18, 16, 16];
    let sy0 = 0;
    for (let i = 0; i < 4; i++) { ctx.fillStyle = sky[i]; ctx.fillRect(0, sy0, W, skyH[i]); sy0 += skyH[i]; }
    // sun with glow
    ctx.fillStyle = 'rgba(240,160,48,0.3)'; ctx.fillRect(246, 34, 30, 30);
    ctx.fillStyle = '#f0a030'; ctx.fillRect(250, 38, 22, 22);
    ctx.fillStyle = '#ffd040'; ctx.fillRect(254, 42, 14, 14);
    waterStripes(70, H, '#1a5a66', '#2e8a96', 1.2);
    // sun reflection shimmer
    for (let y = 74; y < 150; y += 6) {
      const a = 0.4 * (1 - (y - 74) / 80);
      ctx.fillStyle = 'rgba(240,170,60,' + a.toFixed(2) + ')';
      const off = Math.sin(G.t * 1.6 + y * 0.4) * 5;
      ctx.fillRect(Math.round(252 + off), y, 16 - Math.round((y - 74) / 8), 1);
    }
    // birds drifting home
    ctx.fillStyle = '#0a1a20';
    for (let i = 0; i < 3; i++) {
      const bx2 = ((G.t * 13 + i * 130) % (W + 60)) - 30;
      const by2 = 16 + i * 9 + Math.sin(G.t * 2 + i * 2) * 2;
      const fl = Math.floor(G.t * 5 + i) % 2;
      ctx.fillRect(Math.round(bx2 - 3), Math.round(by2 + (fl ? 0 : -1)), 3, 1);
      ctx.fillRect(Math.round(bx2 + 1), Math.round(by2 + (fl ? 0 : -1)), 3, 1);
      ctx.fillRect(Math.round(bx2), Math.round(by2), 1, 1);
    }
    // boat silhouette with you and Earl aboard
    const bx = 60 + Math.sin(G.t * 0.6) * 4, by = 96 + Math.sin(G.t * 1.4) * 1.5;
    ctx.fillStyle = '#0a1a20';
    ctx.fillRect(bx, by, 34, 6);
    ctx.fillRect(bx + 4, by - 8, 4, 8);   // you
    ctx.fillRect(bx + 14, by - 6, 3, 6);  // earl
    // your rod sweeps as you cast off the bow
    const ra = Math.sin(G.t * 0.9) * 0.5;
    ctx.strokeStyle = '#0a1a20'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 7, by - 7);
    ctx.lineTo(bx + 7 + Math.cos(-0.9 + ra) * 15, by - 7 + Math.sin(-0.9 + ra) * 15);
    ctx.stroke();
    // earl's can glints
    if (Math.floor(G.t * 2.5) % 3 === 0) { ctx.fillStyle = '#ffd040'; ctx.fillRect(bx + 18, by - 7, 2, 2); }
    // logo
    textCS(ctx, 'REEL', W / 2, 112, '#ffd040', 5, '#402000');
    textCS(ctx, 'TROUBLE', W / 2, 142, '#f06040', 5, '#401010');
    textC(ctx, 'A PUSH-YOUR-LUCK FISHING DISASTER', W / 2, 174, '#9fd');
    if (Math.floor(G.t * 2) % 2 === 0) textC(ctx, kt('PRESS ENTER', 'TAP CAST'), W / 2, 188, '#fff', 2);
    const champ = G.save.board[0];
    if (champ) textC(ctx, 'CHAMP: ' + champ.name + ' ' + money(champ.score), W / 2, 200, '#9fd');
    textC(ctx, 'DRINK RESPONSIBLY. IN-GAME, GO NUTS.', W / 2, 208, '#6a8a90');
    // cabinet marquee: color-cycling dots chasing around the border
    const mcols = ['#f06040', '#ffd040', '#40c060', '#4090f0'];
    const phase = Math.floor(G.t * 8);
    let di = 0;
    const dot = (x, y) => { ctx.fillStyle = mcols[(di++ + phase) % 4]; ctx.fillRect(x, y, 3, 3); };
    for (let x = 2; x < W - 4; x += 8) dot(x, 1);
    for (let y = 9; y < H - 4; y += 8) dot(W - 5, y);
    for (let x = W - 12; x > 0; x -= 8) dot(x, H - 4);
    for (let y = H - 12; y > 8; y -= 8) dot(2, y);
  },
};

// ---------------- DOCK (hub) ----------------
RT.scenes.dock = {
  enter() {
    this.cur = 0;
    this.items = ['SET OUT', 'LAKE', 'SHOP', 'TROPHY WALL', 'THE BAR WALL', 'LEADERBOARD', 'DAILY LAKE REPORT'];
    G.trip = null;
  },
  update(dt) {
    if (pressed('up')) { this.cur = (this.cur + this.items.length - 1) % this.items.length; SFX.sel(); }
    if (pressed('down')) { this.cur = (this.cur + 1) % this.items.length; SFX.sel(); }
    if (this.cur === 1 && (pressed('left') || pressed('right'))) {
      const d = pressed('left') ? -1 : 1;
      const n = LAKES.length;
      G.lake = (G.lake + d + n) % n;
      SFX.sel();
    }
    let go = pressed('ok') || pressed('act');
    if (RT.tap && RT.tap.x > 70 && RT.tap.x < 250 && RT.tap.y > 105 && RT.tap.y < 200) {
      this.cur = clamp(Math.floor((RT.tap.y - 107) / 13), 0, this.items.length - 1);
      go = true;
    }
    if (go) {
      const it = this.items[this.cur];
      if (it === 'SET OUT') {
        if (G.lake >= G.save.lakes) { SFX.deny(); toast('LAKE LOCKED - UNLOCK IT FIRST', '#f88'); return; }
        SFX.cash(); newTrip(G.lake); setScene('boat', { fresh: true });
      } else if (it === 'LAKE') setScene('lakes');
      else if (it === 'SHOP') { SFX.sel(); setScene('shop'); }
      else if (it === 'TROPHY WALL') { SFX.sel(); setScene('trophy'); }
      else if (it === 'THE BAR WALL') { SFX.sel(); setScene('board'); }
      else if (it === 'LEADERBOARD') { SFX.sel(); setScene('ranks'); }
      else { SFX.sel(); setScene('report'); }
    }
  },
  draw() {
    ctx.fillStyle = '#142830'; ctx.fillRect(0, 0, W, 84);
    waterStripes(84, H, '#1a5a66', '#2e8a96', 1.0);
    // dock planks
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, 70, W, 16);
    ctx.fillStyle = '#4a3420';
    for (let x = 0; x < W; x += 22) ctx.fillRect(x, 70, 2, 16);
    textCS(ctx, "MURPHY'S DOCK & BAIT", W / 2, 10, '#ffd040', 2);
    text(ctx, 'CASH ' + money(G.save.cash), 12, 32, '#8f8', 2);
    text(ctx, RODS[G.save.rod].name, 12, 48, '#9fd');
    text(ctx, BOATS[G.save.boat].name, 12, 56, '#9fd');
    text(ctx, BEERS[G.save.beer].name, 12, 64, '#9fd');
    const R = G.save.records;
    text(ctx, G.save.name || 'ANON', 240, 38, '#ffd040');
    text(ctx, 'STREAK ' + R.streak, 240, 48, '#fc8');
    text(ctx, 'TRIPS ' + R.trips, 240, 56, '#9fd');

    panel2(ctx, 70, 92, 180, 108, "MURPHY'S MENU");
    for (let i = 0; i < this.items.length; i++) {
      let label = this.items[i];
      if (label === 'LAKE') {
        const locked = G.lake >= G.save.lakes;
        label = '< ' + LAKES[G.lake].name + (locked ? ' *LOCKED*' : '') + ' >';
      }
      const sel = i === this.cur;
      const ry = 109 + i * 13;
      if (sel) {
        ctx.fillStyle = '#24424a'; ctx.fillRect(74, ry - 3, 172, 12);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(74, ry - 3, 1, 12); ctx.fillRect(245, ry - 3, 1, 12);
        text(ctx, '>', 79, ry, '#ffd040');
        text(ctx, '<', 236, ry, '#ffd040');
      }
      textC(ctx, label, W / 2, ry, sel ? '#ffd040' : '#cfe8e8');
    }
    textC(ctx, G.daily.tip, W / 2, 210, '#6fa6b2');
  },
};

// ---------------- LAKE SELECT ----------------
RT.scenes.lakes = {
  enter() { this.cur = G.lake; },
  update(dt) {
    if (pressed('up')) { this.cur = (this.cur + LAKES.length - 1) % LAKES.length; SFX.sel(); }
    if (pressed('down')) { this.cur = (this.cur + 1) % LAKES.length; SFX.sel(); }
    if (pressed('back')) setScene('dock');
    let go = pressed('ok') || pressed('act');
    if (RT.tap) {
      const idx = Math.floor((RT.tap.y - 40) / 52);
      if (idx >= 0 && idx < LAKES.length) {
        if (idx === this.cur) go = true;
        else { this.cur = idx; SFX.sel(); }
      }
    }
    if (go) {
      if (this.cur < G.save.lakes) { G.lake = this.cur; SFX.sel(); setScene('dock'); }
      else {
        const cost = LAKES[this.cur].unlock;
        if (G.save.cash >= cost && this.cur === G.save.lakes) {
          G.save.cash -= cost; G.save.lakes++; persist();
          SFX.cash(); toast('NEW WATER UNLOCKED!', '#8f8');
          G.lake = this.cur;
        } else SFX.deny();
      }
    }
  },
  draw() {
    ctx.fillStyle = '#0e1c22'; ctx.fillRect(0, 0, W, H);
    textCS(ctx, 'PICK YOUR WATER', W / 2, 12, '#ffd040', 2);
    for (let i = 0; i < LAKES.length; i++) {
      const L = LAKES[i], y = 40 + i * 52, sel = i === this.cur;
      panel2(ctx, 20, y, 280, 44);
      if (sel) { ctx.fillStyle = '#24424a'; ctx.fillRect(22, y + 2, 276, 40); }
      const unlocked = i < G.save.lakes;
      text(ctx, L.name, 30, y + 6, sel ? '#ffd040' : '#fff', 2);
      text(ctx, L.blurb, 30, y + 22, '#9fd');
      text(ctx, 'PATROL', 30, y + 33, L.patrol ? '#f88' : '#8f8');
      if (L.patrol === 0) text(ctx, 'NONE', 60, y + 33, '#8f8');
      else for (let s = 0; s < L.patrol; s++) drawIcon(ctx, 'siren', 60 + s * 11, y + 30);
      // mini lake preview: water, the island, its sand spit
      ctx.fillStyle = '#1f7a86'; ctx.fillRect(250, y + 5, 42, 26);
      ctx.fillStyle = '#caa86a';
      ctx.beginPath(); ctx.ellipse(271, y + 18, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(284, y + 17, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a6a30';
      ctx.beginPath(); ctx.ellipse(271, y + 18, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a5a60'; ctx.fillRect(250, y + 5, 42, 1); ctx.fillRect(250, y + 30, 42, 1);
      ctx.fillRect(250, y + 5, 1, 26); ctx.fillRect(291, y + 5, 1, 26);
      if (!unlocked) {
        const next = i === G.save.lakes;
        text(ctx, next ? 'UNLOCK ' + money(L.unlock) : 'LOCKED', 180, y + 6, next && G.save.cash >= L.unlock ? '#8f8' : '#f88');
      }
    }
    textC(ctx, kt('ENTER: CHOOSE/UNLOCK   ESC: BACK', 'OK: CHOOSE/UNLOCK   BACK: RETURN'), W / 2, 204, '#6fa6b2');
  },
};

// ---------------- SHOP ----------------
RT.scenes.shop = {
  enter() { this.cur = 0; },
  update(dt) {
    if (pressed('up')) { this.cur = (this.cur + 2) % 3; SFX.sel(); }
    if (pressed('down')) { this.cur = (this.cur + 1) % 3; SFX.sel(); }
    if (pressed('back')) setScene('dock');
    let go = pressed('ok') || pressed('act');
    if (RT.tap) {
      const idx = Math.floor((RT.tap.y - 36) / 52);
      if (idx >= 0 && idx < 3) {
        if (idx === this.cur) go = true;
        else { this.cur = idx; SFX.sel(); }
      }
    }
    if (go) {
      const cats = [
        { list: RODS, key: 'rod' },
        { list: BOATS, key: 'boat' },
        { list: BEERS, key: 'beer' },
      ][this.cur];
      const lvl = G.save[cats.key];
      if (lvl + 1 >= cats.list.length) { SFX.deny(); toast('TOP OF THE LINE ALREADY', '#9fd'); return; }
      const next = cats.list[lvl + 1];
      if (G.save.cash >= next.cost) {
        G.save.cash -= next.cost; G.save[cats.key]++;
        persist(); SFX.cash(); toast('BOUGHT ' + next.name + '!', '#8f8');
      } else SFX.deny();
    }
  },
  draw() {
    ctx.fillStyle = '#0e1c22'; ctx.fillRect(0, 0, W, H);
    textCS(ctx, 'BAIT SHOP', W / 2, 10, '#ffd040', 2);
    text(ctx, 'CASH ' + money(G.save.cash), 230, 12, '#8f8');
    const rows = [
      { label: 'ROD', list: RODS, lvl: G.save.rod, desc: 'WIDER GREEN ZONE, TOUGHER LINE' },
      { label: 'BOAT', list: BOATS, lvl: G.save.boat, desc: 'BIGGER COOLER, FASTER HULL' },
      { label: 'BEER', list: BEERS, lvl: G.save.beer, desc: 'MORE BUZZ, STEADIER HANDS' },
    ];
    const icons = ['rod', 'boat', 'can'];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], y = 36 + i * 52, sel = i === this.cur;
      panel2(ctx, 14, y, 292, 46);
      if (sel) { ctx.fillStyle = '#24424a'; ctx.fillRect(16, y + 2, 288, 42); }
      drawIcon(ctx, icons[i], 22, y + 4);
      text(ctx, r.label, 34, y + 5, sel ? '#ffd040' : '#fff', 2);
      text(ctx, 'NOW: ' + r.list[r.lvl].name, 22, y + 22, '#9fd');
      const next = r.list[r.lvl + 1];
      if (next) {
        text(ctx, 'NEXT: ' + next.name, 22, y + 32, '#cfe8e8');
        const afford = G.save.cash >= next.cost;
        const pw = textW(money(next.cost)) + 8;
        ctx.fillStyle = afford ? '#1f4a2a' : '#3a1a1a';
        ctx.fillRect(296 - pw, y + 29, pw, 10);
        ctx.fillStyle = afford ? '#40c060' : '#a04040';
        ctx.fillRect(296 - pw, y + 29, pw, 1); ctx.fillRect(296 - pw, y + 38, pw, 1);
        text(ctx, money(next.cost), 300 - pw, y + 31, afford ? '#8f8' : '#f88');
      } else text(ctx, 'NEXT: NOTHING BEATS IT', 22, y + 32, '#6fa6b2');
      text(ctx, r.desc, 152, y + 5, '#6fa6b2');
    }
    textC(ctx, kt('ENTER: BUY NEXT TIER   ESC: BACK', 'OK: BUY NEXT TIER   BACK: RETURN'), W / 2, 204, '#6fa6b2');
  },
};

// ---------------- TROPHY WALL ----------------
RT.scenes.trophy = {
  enter() {},
  update(dt) { if (pressed('back') || pressed('ok') || RT.tap) setScene('dock'); },
  draw() {
    ctx.fillStyle = '#241810'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#34241a';
    for (let y = 0; y < H; y += 14) ctx.fillRect(0, y, W, 2);
    textCS(ctx, 'TROPHY WALL', W / 2, 10, '#ffd040', 2);
    const ids = Object.keys(FISH);
    let n = 0;
    for (const id of ids) {
      const t = G.save.trophies[id];
      const f = FISH[id];
      const col = n % 2, row = Math.floor(n / 2);
      const x = 16 + col * 152, y = 32 + row * 12;
      if (y > 190) break;
      if (t) {
        text(ctx, f.name, x, y, f.legend ? '#ffd040' : '#cfe8e8');
        text(ctx, fmtLb(t.w) + 'LB X' + t.n, x + 92, y, f.legend ? '#ffd040' : '#8f8');
      } else {
        text(ctx, f.legend ? '? ? ? ? ? ?' : f.name, x, y, '#48403a');
        text(ctx, '----', x + 92, y, '#48403a');
      }
      n++;
    }
    textC(ctx, kt('LEGENDS GLOW GOLD. ESC: BACK', 'LEGENDS GLOW GOLD. BACK: RETURN'), W / 2, 208, '#6fa6b2');
  },
};

// ---------------- LEADERBOARD ----------------
RT.scenes.board = {
  enter() {},
  update(dt) { if (pressed('back') || pressed('ok') || RT.tap) setScene('dock'); },
  draw() {
    ctx.fillStyle = '#1a1410'; ctx.fillRect(0, 0, W, H);
    textCS(ctx, 'THE BAR WALL', W / 2, 10, '#ffd040', 2);
    textC(ctx, 'WHERE LEGENDS AND LIARS GET CHALKED UP', W / 2, 26, '#6fa6b2');
    const R = G.save.records;
    const rows = [
      ['BIGGEST CATCH', R.bigW > 0 ? fmtLb(R.bigW) + 'LB ' + R.bigName : '----'],
      ['BEST HAUL', R.haul > 0 ? money(R.haul) : '----'],
      ['DRUNKEST TRIP CASHED', R.buzz > 0 ? Math.round(R.buzz * 10) + '% BUZZ' : '----'],
      ['NO-ARREST STREAK', R.bestStreak + ' (NOW ' + R.streak + ')'],
      ['NEAR MISSES', String(R.nearMisses)],
      ['TRIPS / BUSTS', R.trips + ' / ' + R.busts],
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 48 + i * 22;
      panel(ctx, 30, y, 260, 16);
      text(ctx, rows[i][0], 38, y + 5, '#cfe8e8');
      text(ctx, rows[i][1], 38 + 160, y + 5, '#ffd040');
    }
    textC(ctx, 'ESC: BACK', W / 2, 208, '#6fa6b2');
  },
};

// ---------------- HIGH SCORES ----------------
RT.scenes.ranks = {
  enter() {},
  update(dt) { if (pressed('back') || pressed('ok') || RT.tap) setScene('dock'); },
  draw() {
    ctx.fillStyle = '#101a14'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#16241c';
    for (let y = 0; y < H; y += 14) ctx.fillRect(0, y, W, 2);
    textCS(ctx, 'LEADERBOARD', W / 2, 10, '#ffd040', 2);
    textC(ctx, 'BIGGEST HAUL CASHED IN ONE TRIP', W / 2, 26, '#6fa6b2');
    const b = G.save.board;
    if (!b.length) {
      textC(ctx, 'NOBODY ON THE BOARD YET.', W / 2, 96, '#9fd');
      textC(ctx, 'CATCH SOMETHING AND CASH IN AT THE DOCK.', W / 2, 110, '#6fa6b2');
    } else {
      for (let i = 0; i < b.length; i++) {
        const y = 42 + i * 19;
        const me = b[i].name === (G.save.name || 'ANON');
        panel(ctx, 40, y, 240, 15);
        text(ctx, (i + 1) + '.', 48, y + 5, i === 0 ? '#ffd040' : '#6fa6b2');
        text(ctx, b[i].name, 66, y + 5, me ? '#ffd040' : '#cfe8e8');
        if (me) text(ctx, '<YOU', 130, y + 5, '#7fa0a6');
        text(ctx, money(b[i].score), 226, y + 5, '#8f8');
      }
    }
    textC(ctx, 'ESC: BACK', W / 2, 208, '#6fa6b2');
  },
};

// ---------------- DAILY REPORT ----------------
RT.scenes.report = {
  enter() {},
  update(dt) { if (pressed('back') || pressed('ok') || RT.tap) setScene('dock'); },
  draw() {
    ctx.fillStyle = '#0e1c22'; ctx.fillRect(0, 0, W, H);
    panel(ctx, 30, 20, 260, 180);
    textCS(ctx, 'DAILY LAKE REPORT', W / 2, 30, '#ffd040', 2);
    textC(ctx, G.daily.dateStr, W / 2, 48, '#9fd');
    const fod = FISH[G.daily.fodL ? G.daily.fodL[G.lake] : G.daily.fod];
    const rows = [
      ['WEATHER', G.daily.weather.id],
      ['WIND', G.daily.windSpd === 0 ? 'CALM' : G.daily.windSpd + ' KT'],
      ['FISH OF THE DAY', fod.name + '  (2X CASH)'],
      ['HOT SPOT', 'LOOK FOR THE * MARKER'],
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = 66 + i * 18;
      text(ctx, rows[i][0], 44, y, '#cfe8e8');
      text(ctx, rows[i][1], 150, y, '#ffd040');
    }
    if (G.daily.weather.id === 'FOG') textC(ctx, 'FOG: PATROLS SEE LESS. SO DO YOU.', W / 2, 146, '#9fd');
    textC(ctx, G.daily.tip, W / 2, 162, '#6fa6b2');
    textC(ctx, 'ESC: BACK', W / 2, 186, '#6fa6b2');
  },
};

// ---------------- TRIP SUMMARY ----------------
RT.scenes.summary = {
  enter() {
    const T = G.trip, R = G.save.records;
    const prevHaul = R.haul, prevBuzz = R.buzz;
    const res = endTrip(false);
    this.total = res.total;
    this.mult = res.mult;
    this.newHaul = this.total > prevHaul && this.total > 0;
    this.newBuzz = T.maxBuzz > prevBuzz && this.total > 0;
    // did this haul land (or defend) a leaderboard spot?
    this.rank = 0;
    if (this.total > 0) {
      const i = G.save.board.findIndex(e => e.name === (G.save.name || 'ANON'));
      if (i >= 0 && G.save.board[i].score === this.total) this.rank = i + 1;
    }
    this.t = 0;
    this.shownN = 0;
    this.len = Math.min(9, T.cooler.length);
    SFX.fanfare();
  },
  update(dt) {
    this.t += dt;
    const n = Math.min(this.len, Math.floor(this.t / 0.15));
    if (n > this.shownN) { this.shownN = n; SFX.tick(0.8); }
    if (pressed('ok') || pressed('act') || RT.tap) { SFX.cash(); setScene('dock'); }
  },
  draw() {
    const T = G.trip;
    // sunset band
    ctx.fillStyle = '#301830'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#a04030'; ctx.fillRect(0, 28, W, 8);
    ctx.fillStyle = '#f0a030'; ctx.fillRect(36, 21, 18, 9);
    waterStripes(40, H, '#23323e', '#37505c', 0.7);
    textCS(ctx, 'WEIGH-IN', W / 2, 8, '#ffd040', 2);
    panel2(ctx, 24, 46, 272, 130);
    if (T.cooler.length === 0) {
      textC(ctx, 'EMPTY COOLER. THE LAKE WON TODAY.', W / 2, 100, '#9fd');
    } else {
      const shown = T.cooler.slice(0, this.shownN);
      for (let i = 0; i < shown.length; i++) {
        const f = shown[i], y = 52 + i * 12;
        const sp = FISH[f.id];
        drawFish(ctx, 41, y + 3, clamp(11 + f.w * 0.7, 11, 19), sp ? sp.col : '#9fd');
        text(ctx, f.name, 56, y, '#cfe8e8');
        text(ctx, fmtLb(f.w) + 'LB', 170, y, '#9fd');
        text(ctx, money(f.val), 212, y, '#8f8');
        if (f.buzz > BUZZ_LIMIT) text(ctx, 'X' + (Math.round(buzzMult(f.buzz) * 10) / 10), 256, y, '#fc8');
      }
      if (T.cooler.length > 9) text(ctx, '+' + (T.cooler.length - 9) + ' MORE...', 32, 52 + 9 * 12, '#6fa6b2');
    }
    text(ctx, 'TOTAL', 32, 182, '#fff', 2);
    const ctUp = clamp((this.t - this.len * 0.15) / 0.6, 0, 1);
    text(ctx, money(Math.round(this.total * ctUp)), 100, 182, '#8f8', 2);
    if (this.mult > 1.001 && this.total > 0) text(ctx, 'STREAK +' + Math.round((this.mult - 1) * 100) + '%', 32, 174, '#fc8');
    if (this.rank) text(ctx, 'LEADERBOARD #' + this.rank + '!', 190, 162, this.rank === 1 ? '#ffd040' : '#9fd');
    if (this.newHaul) text(ctx, 'NEW HAUL RECORD!', 190, 172, '#ffd040');
    if (this.newBuzz) text(ctx, 'DRUNKEST TRIP YET!', 190, 182, '#fc8');
    const ng = RT.nextGoal();
    if (ng) textC(ctx, 'NEXT: ' + ng.name + ' - ' + money(ng.cost - G.save.cash) + ' TO GO', W / 2, 198, '#9fd');
    textC(ctx, kt('ENTER: BACK TO THE DOCK', 'OK: BACK TO THE DOCK'), W / 2, 208, '#6fa6b2');
  },
};

// ---------------- BREATHALYZER ----------------
RT.scenes.breath = {
  enter(args) {
    this.from = args.from || 'boat';
    this.t = 0;
    this.done = null;     // 'pass' | 'fail'
    this.doneT = 0;
    this.nx = 0;
    this.jit = 0;
    SFX.siren();
  },
  update(dt) {
    const T = G.trip;
    this.t += dt;
    const b = T ? T.buzz : 0;
    if (this.done) {
      this.doneT += dt;
      if (this.doneT > 1.6) {
        if (this.done === 'pass') {
          T.suspGrace = 9;
          if (this.from === 'fish' && T.world) {
            const sp = T.world.spots.find(s => s.id === T.spotId);
            if (sp) { setScene('fish', { spot: sp }); return; }
          }
          setScene('boat', {});
        } else setScene('bust');
      }
      return;
    }
    // needle: sine sweep plus drunken jitter
    this.jit += (Math.random() - 0.5) * b * 14 * dt;
    this.jit *= 0.95;
    this.nx = Math.sin(this.t * (2.0 + b * 0.32)) * 46 + this.jit;
    const gw = Math.max(2, 16 - Math.max(0, b - BUZZ_LIMIT) * 3.5 - b * 0.8);
    this.gw = gw;
    if (this.t > 0.8 && (pressed('act') || pressed('ok') || RT.tap)) {
      if (Math.abs(this.nx) <= gw) { this.done = 'pass'; SFX.near(); }
      else { this.done = 'fail'; SFX.busted(); }
    }
    if (this.t > 9) { this.done = b > BUZZ_LIMIT ? 'fail' : 'pass'; if (this.done === 'fail') SFX.busted(); else SFX.near(); }
  },
  draw() {
    const T = G.trip;
    ctx.fillStyle = '#0a1014'; ctx.fillRect(0, 0, W, H);
    // red/blue wash
    const phase = Math.floor(G.t * 4) % 2;
    ctx.fillStyle = phase ? 'rgba(200,40,40,0.12)' : 'rgba(40,80,220,0.12)';
    ctx.fillRect(0, 0, W, H);
    textCS(ctx, 'LAKE PATROL', W / 2, 18, '#fff', 2);
    textC(ctx, '"EVENING. BLOW INTO THE TUBE, CAPTAIN."', W / 2, 40, '#9fd');
    panel2(ctx, 60, 70, 200, 60);
    // gauge
    const cx = W / 2;
    ctx.fillStyle = '#182830'; ctx.fillRect(cx - 80, 92, 160, 14);
    ctx.fillStyle = '#1f6a30'; ctx.fillRect(Math.round(cx - (this.gw || 16)), 92, Math.round((this.gw || 16) * 2), 14);
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.round(cx + this.nx) - 1, 88, 2, 22);
    textC(ctx, kt('SPACE: BLOW STEADY', 'CAST: BLOW STEADY'), cx, 116, '#ffd040');
    text(ctx, 'BUZZ ' + Math.round((T ? T.buzz : 0) * 10) + '%', cx - 26, 76, T && T.buzz > BUZZ_LIMIT ? '#f66' : '#8f8');
    if (this.done === 'pass') textCS(ctx, 'PASSED. "GET HOME SAFE."', cx, 150, '#8f8', 2);
    if (this.done === 'fail') textCS(ctx, 'FAILED. WAY OVER.', cx, 150, '#f44', 2);
    if (!this.done && T && T.buzz > BUZZ_LIMIT) textC(ctx, "(YOU'RE OVER THE LIMIT. STEADY... STEADY...)", cx, 166, '#f88');
  },
};

// ---------------- BUSTED ----------------
RT.scenes.bust = {
  enter() {
    this.lost = Math.round(coolerVal());
    this.fish = G.trip ? G.trip.cooler.length : 0;
    endTrip(true);
  },
  update(dt) {
    if (pressed('ok') || pressed('act') || RT.tap) setScene('dock');
  },
  draw() {
    ctx.fillStyle = '#0a0a10'; ctx.fillRect(0, 0, W, H);
    const phase = Math.floor(G.t * 4) % 2;
    ctx.fillStyle = phase ? 'rgba(220,40,40,0.18)' : 'rgba(40,80,240,0.18)';
    ctx.fillRect(0, 0, W, H);
    textCS(ctx, 'BUSTED', W / 2, 60, '#f44', 5);
    textC(ctx, 'BOATING UNDER THE INFLUENCE', W / 2, 104, '#fff');
    textC(ctx, 'COOLER CONFISCATED: ' + this.fish + ' FISH (' + money(this.lost) + ')', W / 2, 122, '#f88');
    textC(ctx, 'NO-ARREST STREAK RESET', W / 2, 134, '#f88');
    textC(ctx, "EARL POSTED YOUR MUGSHOT AT THE BAR.", W / 2, 152, '#9fd');
    textC(ctx, kt('ENTER: SLEEP IT OFF', 'OK: SLEEP IT OFF'), W / 2, 190, '#6fa6b2');
  },
};
