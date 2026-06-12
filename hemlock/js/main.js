'use strict';
// Boot, input, scene manager, fixed-step loop, and every economy action.
// Scenes call the HM.* action functions; the smoke test calls them directly.

const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');

// ---------- global state ----------
const G = {
  save: loadSave(),
  market: dailyMarket(),
  scene: null, sceneName: '',
  t: 0,
  toasts: [],            // [{ txt, col, t, ttl }]
  gord: { t: rnd(20, 40), txt: null, ttl: 0 },
  lodgeEvT: rnd(240, 480),
  fade: 0,               // scene crossfade 1 -> 0
  shake: { t: 0, dur: 1, amt: 0 },
  flash: { t: 0, dur: 1, col: '#fff' },
};
HM.G = G;
HM.modal = null;
HM.modalBlock = false;

// ---------- canvas scaling (virtual 1280x720, DPR-aware) ----------
let VIEW = { s: 1, ox: 0, oy: 0 };
function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  cvs.style.width = Math.round(VW * s) + 'px';
  cvs.style.height = Math.round(VH * s) + 'px';
  cvs.width = Math.round(VW * s * dpr);
  cvs.height = Math.round(VH * s * dpr);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
  VIEW = { s, ox: 0, oy: 0 };
}
window.addEventListener('resize', fit);
fit();

// ---------- input ----------
HM.mouse = { x: -1, y: -1, down: false, pressed: false, released: false };
function ptXY(e) {
  const r = cvs.getBoundingClientRect();
  return { x: (e.clientX - r.left) * VW / Math.max(1, r.width), y: (e.clientY - r.top) * VH / Math.max(1, r.height) };
}
cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault(); SFX.unlock();
  const p = ptXY(e); HM.mouse.x = p.x; HM.mouse.y = p.y;
  HM.mouse.down = true; HM.mouse.pressed = true;
});
cvs.addEventListener('pointermove', (e) => {
  const p = ptXY(e); HM.mouse.x = p.x; HM.mouse.y = p.y;
});
window.addEventListener('pointerup', (e) => {
  if (HM.mouse.down) HM.mouse.released = true;
  HM.mouse.down = false;
});
cvs.addEventListener('contextmenu', (e) => e.preventDefault());

const Keys = { held: {}, pressed: {} };
HM.Keys = Keys;
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right', Space: 'act', Enter: 'ok', Escape: 'back', KeyM: 'mute',
};
window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault(); SFX.unlock();
  if (!Keys.held[k]) Keys.pressed[k] = true;
  Keys.held[k] = true;
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code]; if (!k) return;
  Keys.held[k] = false;
});
function pressed(k) { return !!Keys.pressed[k]; }
function held(k) { return !!Keys.held[k]; }
HM.pressed = pressed; HM.held = held;

// ---------- scene manager ----------
function setScene(name, args) {
  G.sceneName = name;
  G.scene = HM.scenes[name];
  G.fade = 1;
  HM.parts.length = 0;
  if (G.scene.enter) G.scene.enter(args || {});
}
HM.setScene = setScene;

// ---------- toasts / gord / fx ----------
function toast(t, col) {
  G.toasts.push({ txt: t, col: col || '#eaf2ff', t: 0, ttl: 3 });
  if (G.toasts.length > 4) G.toasts.shift();
}
HM.toast = toast;

function gordSay(t, ttl) { G.gord.txt = t; G.gord.ttl = ttl || 6; }
HM.gordSay = gordSay;

function addShake(amt, dur) {
  G.shake.amt = Math.max(G.shake.amt, amt);
  G.shake.t = Math.max(G.shake.t, dur);
  G.shake.dur = Math.max(G.shake.t, 0.01);
}
function addFlash(col, dur) { G.flash.col = col; G.flash.t = dur; G.flash.dur = dur; }
HM.addShake = addShake; HM.addFlash = addFlash;
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no-op */ } }
HM.vibrate = vibrate;

// ---------- the dopamine pipe ----------
// Every dollar in the game flows through earn(). amt<0 allowed for fines.
function earn(amt, x, y, opts) {
  opts = opts || {};
  const S = G.save;
  S.cash = Math.max(0, S.cash + amt);
  if (amt > 0) S.records.earned += amt;
  if (x !== undefined && !opts.quiet) {
    partFloat((amt >= 0 ? '+' : '') + money(amt), x, y,
      amt >= 0 ? (opts.crit ? '#ffd24a' : '#7dffa8') : '#ff7d7d',
      { size: opts.crit ? 34 : 22, glow: opts.crit });
  }
  if (!opts.quiet) {
    if (opts.crit) { SFX.jackpot(); addFlash('#ffd24a', 0.35); addShake(7, 0.4); vibrate(60); }
    else if (amt >= 1000) { SFX.crit(); addShake(3, 0.25); }
    else if (amt > 0) SFX.chaChing();
  }
  rankCheck();
  return amt;
}
HM.earn = earn;

function spend(amt) {
  if (G.save.cash < amt) { SFX.deny(); toast('NOT ENOUGH CASH', '#ff7d7d'); return false; }
  G.save.cash -= amt;
  return true;
}
HM.spend = spend;

function rankCheck() {
  const S = G.save;
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (S.records.earned >= RANKS[i].at) r = i;
  if (r > S.rank) {
    S.rank = r;
    SFX.fanfare(); addFlash('#ffd24a', 0.5); addShake(5, 0.4);
    openModal({
      title: 'RANK UP', accent: '#ffd24a',
      body: ['THE ISLAND HAS A NEW NAME FOR YOU:', '', RANKS[r].name],
      buttons: [{ label: 'DAMN RIGHT', color: '#ffd24a' }],
    });
    persist();
  }
}

// ---------- heat ----------
function heatX() { return G.market.event.fx.heatX || 1; }
function cookX() { return G.market.event.fx.cookX || 1; }
HM.heatX = heatX; HM.cookX = cookX;

function addHeat(n) {
  const S = G.save;
  const before = S.heat;
  S.heat = clamp(S.heat + n * (n > 0 ? heatX() : 1), 0, 100);
  if (before < 25 && S.heat >= 25) { toast('THE OPP IS ASKING QUESTIONS', '#ffb04a'); SFX.radio(); }
  if (before < 50 && S.heat >= 50) { toast("YOU'RE ON A LIST NOW", '#ff7d4a'); SFX.radio(); gordSay(pick(GORD_WARN)); }
  if (before < 75 && S.heat >= 75) { toast('RAID RISK: HIGH. STASH YOUR PRODUCT.', '#ff5a5a'); SFX.siren(); }
}
HM.addHeat = addHeat;

// Raid roll — called after sales and on new days when heat is high.
function rollRaid() {
  const S = G.save;
  if (S.heat < 75) return false;
  if (Math.random() < (S.heat - 70) / 120) { setScene('raid'); return true; }
  return false;
}
HM.rollRaid = rollRaid;

// Inspection roll — called when opening a business while warm.
function maybeInspect() {
  const S = G.save;
  if (S.heat < 50 || HM.modal) return false;
  if (Math.random() < S.heat / 400) { setScene('inspect', { back: G.sceneName }); return true; }
  return false;
}
HM.maybeInspect = maybeInspect;

// ---------- market helpers ----------
function priceOf(prod) { return PRODUCTS[prod].base * (G.market.prices[prod] || 1); }
HM.priceOf = priceOf;

function streakBonus() { return 1 + Math.min(10, G.save.records.cleanStreak) * 0.02; }

// Sell `qty` of `prod` to buyer. Returns result or null (blocked).
function sellTo(buyerId, prod, qty, fxXY) {
  const S = G.save;
  const buyer = BUYERS.find(b => b.id === buyerId);
  if (Date.now() < S.layLowUntil) { toast("YOU'RE LAYING LOW. NO SALES.", '#9ab'); SFX.deny(); return null; }
  qty = Math.min(qty, S.inv[prod]);
  if (qty <= 0) { SFX.deny(); return null; }
  const crit = Math.random() < 0.05;
  const unit = priceOf(prod) * buyer.mult * streakBonus();
  const total = Math.round(unit * qty * (crit ? 3 : 1));
  S.inv[prod] -= qty;
  earn(total, fxXY ? fxXY.x : undefined, fxXY ? fxXY.y : undefined, { crit });
  if (crit && fxXY) partBurst(fxXY.x, fxXY.y, ['#ffd24a', '#fff0a0', '#ff9a3a'], 26);
  addHeat(PRODUCTS[prod].heat * qty * buyer.heatX);
  S.records.bestSale = Math.max(S.records.bestSale, total);
  persist();
  rollRaid();
  return { total, crit, qty };
}
HM.sellTo = sellTo;

// ---------- business actions ----------
function buyStillTier() {
  const st = G.save.biz.still;
  if (st.lvl >= BIZ.still.tiers.length) return false;
  const tier = BIZ.still.tiers[st.lvl];
  if (!spend(tier.cost)) return false;
  st.lvl++;
  if (st.lvl === 1) { st.t0 = Date.now(); SFX.unlockBiz(); toast('THE STILL IS BREWING', '#e8c46a'); }
  else { SFX.unlockBiz(); toast(tier.name + ' INSTALLED', '#e8c46a'); }
  persist();
  return true;
}
function collectStill(now) {
  now = now || Date.now();
  const st = G.save.biz.still;
  const acc = stillAccrue(G.save, now);
  st.stored += acc.jugs; st.t0 = acc.newT0;
  const n = st.stored;
  if (n <= 0) return 0;
  st.stored = 0;
  st.t0 = now;
  G.save.inv.shine += n;
  SFX.drip(); SFX.chaChing();
  persist();
  return n;
}
HM.buyStillTier = buyStillTier; HM.collectStill = collectStill;

function buyPlot() {
  const P = G.save.biz.poppy;
  if (P.plots.length >= BIZ.poppy.plotCosts.length) return false;
  if (!spend(BIZ.poppy.plotCosts[P.plots.length])) return false;
  P.plots.push({ st: 'empty', t0: 0 });
  SFX.unlockBiz(); persist();
  return true;
}
function plantPlot(i, now) {
  const P = G.save.biz.poppy;
  const p = P.plots[i];
  if (!p || p.st !== 'empty') return false;
  if (!spend(BIZ.poppy.seed)) return false;
  p.st = 'grow'; p.t0 = now || Date.now();
  SFX.plant(); persist();
  return true;
}
// Harvest payout from minigame result. taps = {good, perfect, bestCombo}
function harvestPayout(i, taps) {
  const P = G.save.biz.poppy;
  const p = P.plots[i];
  if (!p || p.st !== 'ready') return 0;
  let gum = taps.good + taps.perfect * 2;
  gum = Math.round(gum * (1 + Math.min(8, taps.bestCombo) * 0.25 / 2) * (P.up.scare ? 1.2 : 1));
  p.st = 'empty'; p.t0 = 0;
  G.save.inv.opium += gum;
  G.save.records.bestCombo = Math.max(G.save.records.bestCombo, taps.bestCombo);
  persist();
  return gum;
}
HM.buyPlot = buyPlot; HM.plantPlot = plantPlot; HM.harvestPayout = harvestPayout;

function buyLab() {
  const L = G.save.biz.lab;
  if (L.lvl > 0) return false;
  if (!spend(BIZ.lab.cost)) return false;
  L.lvl = 1; SFX.unlockBiz(); toast('BUNKHOUSE LAB READY', '#c49aff'); persist();
  return true;
}
// q = quality 0.5..1.3 from the cook minigame.
function startLabJob(q, now) {
  const L = G.save.biz.lab;
  if (L.lvl <= 0 || L.job) return false;
  if (G.save.inv.opium < BIZ.lab.opiumPer) return false;
  if (L.up.gear) q = Math.max(0.8, q);
  G.save.inv.opium -= BIZ.lab.opiumPer;
  const n = L.up.burner2 ? 2 : 1;
  L.job = { t0: now || Date.now(), dur: BIZ.lab.dur * cookX() * 1000, n, q };
  G.save.records.cooks++;
  SFX.bubble(); persist();
  return true;
}
function collectLab(now) {
  now = now || Date.now();
  const L = G.save.biz.lab;
  if (!L.job || now - L.job.t0 < L.job.dur) return 0;
  const n = L.job.n;
  G.save.inv.heroin += n;
  G.save._lastQ = L.job.q;
  L.job = null;
  SFX.chaChing(); persist();
  return n;
}
HM.buyLab = buyLab; HM.startLabJob = startLabJob; HM.collectLab = collectLab;

function buyMeth() {
  const M = G.save.biz.meth;
  if (M.lvl > 0) return false;
  if (G.save.records.earned < 500) { toast('SELL SOME PRODUCT FIRST. WALK BEFORE YOU RUN.', '#9ab'); SFX.deny(); return false; }
  if (!spend(BIZ.meth.cost)) return false;
  M.lvl = 1; SFX.unlockBiz(); toast('THE CAMPER IS... OPERATIONAL', '#7dffb8'); persist();
  return true;
}
// greenFrac 0..1 from the temperature minigame; exploded = pegged red.
function methPayout(greenFrac, exploded) {
  const S = G.save;
  S.records.cooks++;
  if (exploded) {
    S.records.booms++;
    addHeat(12 * (S.biz.meth.up.scrubber ? 0.5 : 1));
    persist();
    return 0;
  }
  let bags = Math.max(1, Math.round(greenFrac * 4));
  if (greenFrac > 0.9) bags++;
  if (S.biz.meth.up.bigrv) bags *= 2;
  S.inv.meth += bags;
  addHeat(8 * (S.biz.meth.up.scrubber ? 0.5 : 1));
  persist();
  return bags;
}
HM.buyMeth = buyMeth; HM.methPayout = methPayout;

function buyCoke() {
  const C = G.save.biz.coke;
  if (C.lvl > 0) return false;
  if (!spend(BIZ.coke.cost)) return false;
  C.lvl = 1; SFX.unlockBiz(); toast('MAINLAND CONTACT SECURED. THE DOCK IS OPEN.', '#9adfff'); persist();
  return true;
}
// Cutting result: bias -1 (purity) .. +1 (quantity), sweet = center hit.
function cutPayout(keys, bias, sweet) {
  const S = G.save;
  keys = Math.min(keys, S.inv.kgRaw);
  if (keys <= 0) return 0;
  S.inv.kgRaw -= keys;
  let units = BIZ.coke.unitsPerKey * keys;
  let mult = 1;
  if (sweet) { units = Math.round(units * 1.6); mult = 1.3; }
  else if (bias > 0.3) { units *= 2; mult = 0.7; }
  else if (bias < -0.3) { mult = 1.5; }
  units = Math.round(units);
  S.inv.coke += units;
  S._cokeMult = mult; // price modifier consumed at sale — kept simple: fold into market
  persist();
  return units;
}
HM.buyCoke = buyCoke; HM.cutPayout = cutPayout;

function buyLodge() {
  const L = G.save.biz.lodge;
  if (L.lvl > 0) return false;
  if (!spend(BIZ.lodge.cost)) return false;
  L.lvl = 1; L.lastTick = Date.now();
  SFX.unlockBiz(); toast('THE LODGE IS OPEN FOR BUSINESS', '#ff6ea8'); persist();
  return true;
}
function hireGirl(cand) {
  const L = G.save.biz.lodge;
  const cap = L.up.wing ? 6 : BIZ.lodge.maxGirls;
  if (L.girls.length >= cap) { toast('NO FREE ROOMS. BUY THE SECOND WING.', '#9ab'); SFX.deny(); return false; }
  if (L.girls.some(g => g.seed === cand.seed)) return false;
  if (!spend(cand.fee)) return false;
  L.girls.push({ ...cand });
  SFX.knock(); toast(cand.name + ' MOVED IN', '#ff6ea8'); persist();
  addHeat(1);
  return true;
}
function collectLodge(now) {
  now = now || Date.now();
  const L = G.save.biz.lodge;
  const lodgeX = G.market.event.fx.lodge || 1;
  const gain = lodgeRate(G.save) * Math.max(0, now - L.lastTick) / 1000 * lodgeX;
  L.pend += gain;
  L.lastTick = now;
  const out = Math.floor(L.pend);
  L.pend -= out;
  persist();
  return out;
}
function girlAction(i, kind) {
  const L = G.save.biz.lodge;
  const g = L.girls[i]; if (!g) return false;
  collectLodge();
  if (kind === 'gift' && spend(200)) { g.mood = clamp(g.mood + 20, 0, 100); SFX.chaChing(); }
  else if (kind === 'spa' && spend(500)) { g.mood = clamp(g.mood + 40, 0, 100); SFX.chaChing(); }
  else if (kind === 'tub' && spend(1000)) { for (const gg of L.girls) gg.mood = clamp(gg.mood + 15, 0, 100); SFX.fanfare(); toast('THE HOT TUB LIVES (FOR NOW)', '#ff6ea8'); }
  else return false;
  persist();
  return true;
}
HM.buyLodge = buyLodge; HM.hireGirl = hireGirl; HM.collectLodge = collectLodge; HM.girlAction = girlAction;

function buyUpgrade(bizId, up) {
  const b = G.save.biz[bizId];
  if (b.up[up.id]) return false;
  if (!spend(up.cost)) return false;
  b.up[up.id] = true;
  SFX.unlockBiz(); toast(up.name + ' — ' + up.desc, BIZ[bizId].accent);
  persist();
  return true;
}
HM.buyUpgrade = buyUpgrade;

// ---------- hideout ----------
function buyStash() {
  const S = G.save;
  if (S.stash + 1 >= STASH_TIERS.length) return false;
  const t = STASH_TIERS[S.stash + 1];
  if (!spend(t.cost)) return false;
  S.stash++; SFX.unlockBiz(); toast(t.name + ': PRODUCT ' + Math.round(t.prot * 100) + '% PROTECTED', '#9ab'); persist();
  return true;
}
function buyLawyer() {
  const S = G.save;
  if (S.lawyer + 1 >= LAWYER_TIERS.length) return false;
  const t = LAWYER_TIERS[S.lawyer + 1];
  if (!spend(t.cost)) return false;
  S.lawyer++; SFX.unlockBiz(); toast(t.name + ' ON RETAINER', '#9ab'); persist();
  return true;
}
function bribe() {
  const S = G.save;
  const cost = BRIBE_BASE * (1 + S.bribes);
  if (!spend(cost)) return false;
  S.bribes++;
  S.heat = clamp(S.heat - 30, 0, 100);
  SFX.chaChing(); toast('BLANCHARD SUDDENLY REMEMBERS A MEETING. HEAT -30', '#7dffa8');
  persist();
  return true;
}
function layLow() {
  const S = G.save;
  if (Date.now() < S.layLowUntil) return false;
  S.layLowUntil = Date.now() + 10 * 60 * 1000;
  S.heat = clamp(S.heat - 15, 0, 100);
  toast('LAYING LOW. NO SALES FOR 10 MINUTES. HEAT -15', '#9ab');
  persist();
  return true;
}
HM.buyStash = buyStash; HM.buyLawyer = buyLawyer; HM.bribe = bribe; HM.layLow = layLow;

// ---------- the carrot ----------
function nextGoal() {
  const S = G.save;
  const opts = [];
  const st = S.biz.still;
  if (st.lvl < BIZ.still.tiers.length) opts.push({ name: BIZ.still.tiers[st.lvl].name, cost: BIZ.still.tiers[st.lvl].cost });
  if (S.biz.poppy.plots.length < BIZ.poppy.plotCosts.length) opts.push({ name: 'POPPY PLOT ' + (S.biz.poppy.plots.length + 1), cost: BIZ.poppy.plotCosts[S.biz.poppy.plots.length] });
  if (!S.biz.lab.lvl) opts.push({ name: 'BUNKHOUSE LAB', cost: BIZ.lab.cost });
  if (!S.biz.meth.lvl) opts.push({ name: 'CAMPER LAB', cost: BIZ.meth.cost });
  if (!S.biz.lodge.lvl) opts.push({ name: 'THE LODGE', cost: BIZ.lodge.cost });
  if (!S.biz.coke.lvl) opts.push({ name: 'MAINLAND CONTACT', cost: BIZ.coke.cost });
  for (const [id, b] of Object.entries(BIZ)) {
    if (!b.upgrades || !S.biz[id] || (id !== 'poppy' && !S.biz[id].lvl)) continue;
    for (const up of b.upgrades) if (!S.biz[id].up[up.id]) opts.push({ name: up.name, cost: up.cost });
  }
  if (S.stash + 1 < STASH_TIERS.length) opts.push({ name: STASH_TIERS[S.stash + 1].name, cost: STASH_TIERS[S.stash + 1].cost });
  return opts.filter(o => o.cost > S.cash).sort((a, b) => a.cost - b.cost)[0] || null;
}
HM.nextGoal = nextGoal;

// ---------- ambient economy tick ----------
function newDayCheck() {
  const today = dateStrFor(new Date());
  if (G.market.dateStr === today) return;
  G.market = dailyMarket(today);
  const S = G.save;
  S.day = today;
  S.bribes = 0;
  S.heat = clamp(S.heat - 6, 0, 100);
  S.records.days++;
  if (S.heat < 75) { S.records.cleanStreak++; S.records.bestStreak = Math.max(S.records.bestStreak, S.records.cleanStreak); }
  // lodge mood decay + quits
  const L = S.biz.lodge;
  for (let i = L.girls.length - 1; i >= 0; i--) {
    L.girls[i].mood = clamp(L.girls[i].mood - 10, 0, 100);
    if (L.girls[i].mood < 25) {
      toast(L.girls[i].name + ' QUIT. ' + pick(LODGE_QUIT), '#ff6ea8');
      L.girls.splice(i, 1);
    }
  }
  addHeat(L.girls.length); // +1/day per girl
  toast('NEW DAY: ' + G.market.event.name + ' — ' + G.market.event.txt, '#ffd24a');
  persist();
  rollRaid();
}

const flags = { stillFull: false, labDone: false, plotsReady: 0 };
HM.flags = flags;

function econTick(dt) {
  const S = G.save, now = Date.now();
  newDayCheck();
  // still: badge when storage fills
  if (S.biz.still.lvl > 0) {
    const acc = stillAccrue(S, now);
    const stored = S.biz.still.stored + acc.jugs;
    const full = stored >= stillTier(S).cap;
    if (full && !flags.stillFull) toast('THE STILL IS FULL. COLLECT YOUR JUGS.', '#e8c46a');
    flags.stillFull = full;
  }
  // poppy plots: grow -> ready
  let ready = 0;
  for (const p of S.biz.poppy.plots) {
    if (p.st === 'grow' && now - p.t0 >= growDur(S) * 1000) { p.st = 'ready'; toast('POPPIES READY TO HARVEST!', '#ff7eb0'); SFX.pop(2); }
    if (p.st === 'ready') ready++;
  }
  flags.plotsReady = ready;
  // lab job done
  const job = S.biz.lab.job;
  const done = !!(job && now - job.t0 >= job.dur);
  if (done && !flags.labDone) { toast('BATCH DONE AT THE BUNKHOUSE', '#c49aff'); SFX.bubble(); }
  flags.labDone = done;
  // gord rambles
  const gd = G.gord;
  if (gd.ttl > 0) { gd.ttl -= dt; if (gd.ttl <= 0) gd.txt = null; }
  else {
    gd.t -= dt;
    if (gd.t <= 0) {
      gd.t = rnd(35, 70);
      gordSay(S.heat >= 50 && Math.random() < 0.5 ? pick(GORD_WARN) : pick(GORD_LINES));
    }
  }
  // lodge random events
  if (S.biz.lodge.lvl > 0 && S.biz.lodge.girls.length > 0 && !HM.modal) {
    G.lodgeEvT -= dt;
    if (G.lodgeEvT <= 0) {
      G.lodgeEvT = rnd(240, 480);
      lodgeEvent();
    }
  }
}
HM.econTick = econTick;

function lodgeEvent() {
  const ev = pick(LODGE_EVENTS);
  const L = G.save.biz.lodge;
  const apply = (o) => {
    const amt = ri(o.cash[0], o.cash[1]);
    if (amt) earn(amt, VW / 2, VH / 2);
    for (const g of L.girls) g.mood = clamp(g.mood + o.mood, 0, 100);
    if (o.heat) addHeat(o.heat);
    toast(o.line, '#ff6ea8');
    persist();
  };
  openModal({
    title: 'AT THE LODGE', accent: '#ff6ea8',
    portrait: L.girls.length ? pick(L.girls).face : null,
    body: wrapLines(ev.txt, 52),
    buttons: [
      { label: ev.a.label, color: '#ff6ea8', cb: () => apply(ev.a) },
      { label: ev.b.label, color: '#8aa0c0', cb: () => apply(ev.b) },
    ],
  });
}

// naive word wrap for modal body lines
function wrapLines(s, n) {
  const words = String(s).split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) { out.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
HM.wrapLines = wrapLines;

// ---------- offline earnings ----------
function applyOffline() {
  const S = G.save, now = Date.now();
  const o = offlineGains(S, now);
  if (!o) { S.lastSeen = now; return; }
  const acc = stillAccrue(S, now);
  S.biz.still.stored += acc.jugs; S.biz.still.t0 = acc.newT0 || now;
  if (S.biz.lodge.lvl > 0) { S.biz.lodge.pend += o.lodge; S.biz.lodge.lastTick = now; }
  S.lastSeen = now;
  persist();
  const lines = ['WHILE YOU WERE GONE (' + fmtDur(o.ms / 1000) + '):', ''];
  if (o.jugs) lines.push('THE STILL DRIPPED OUT ' + o.jugs + ' JUG' + (o.jugs > 1 ? 'S' : ''));
  if (o.lodge) lines.push('THE LODGE PULLED IN ' + money(o.lodge));
  if (o.plots) lines.push(o.plots + ' POPPY PLOT' + (o.plots > 1 ? 'S' : '') + ' READY TO HARVEST');
  openModal({
    title: 'BACK ON THE ISLAND', accent: '#ffd24a', body: lines,
    buttons: [{ label: 'COLLECT', color: '#ffd24a', cb: () => { SFX.jackpot(); partBurst(VW / 2, VH / 2, ['#ffd24a', '#7dffa8', '#fff'], 30); } }],
  });
}

// ---------- toasts / gord drawing ----------
function toastsDraw(c) {
  let y = 24;
  for (const t of G.toasts) {
    const k = Math.min(1, t.t / 0.25);
    const out = t.ttl - t.t < 0.3 ? (t.ttl - t.t) / 0.3 : 1;
    const w = txtW(c, t.txt, 17, 700) + 44;
    const x = (VW - w) / 2;
    c.save();
    c.globalAlpha = Math.min(k, out);
    const yy = y - (1 - easeOut(k)) * 18;
    fillRR(c, x, yy, w, 38, 19, 'rgba(10,15,26,0.92)');
    strokeRR(c, x, yy, w, 38, 19, rgba('#ffffff', 0.14), 1);
    c.beginPath(); c.arc(x + 20, yy + 19, 5, 0, TAU); c.fillStyle = t.col; c.shadowColor = t.col; c.shadowBlur = 10; c.fill();
    c.shadowBlur = 0;
    txt(c, t.txt, x + 34, yy + 25, { size: 17, weight: 700, color: '#eaf2ff' });
    c.restore();
    y += 46 * Math.min(k, out);
  }
}

function gordDraw(c) {
  const gd = G.gord;
  if (!gd.txt || G.sceneName === 'run' || G.sceneName === 'raid') return;
  const w = Math.min(900, txtW(c, gd.txt, 16, 600) + 96);
  const x = (VW - w) / 2, y = VH - 64;
  c.save();
  c.globalAlpha = Math.min(1, gd.ttl / 0.4);
  fillRR(c, x, y, w, 48, 24, 'rgba(10,15,26,0.9)');
  strokeRR(c, x, y, w, 48, 24, 'rgba(255,255,255,0.12)', 1);
  portrait(c, x + 28, y + 24, 18, GORD_FACE, '#141c2c');
  txt(c, gd.txt, x + 56, y + 30, { size: 16, weight: 600, color: '#cfe0a8' });
  c.restore();
}

// ---------- main loop ----------
let last = 0, acc = 0, saveT = 0;
const STEP = 1 / 60;
function frame(ts) {
  if (!last) last = ts;
  let dt = (ts - last) / 1000;
  last = ts;
  if (dt > 0.1) dt = 0.1;
  acc += dt;
  while (acc >= STEP) {
    if (pressed('mute')) toast(SFX.toggleMute() ? 'MUTED' : 'SOUND ON', '#9adfff');
    G.t += STEP;
    HM.modalBlock = !!HM.modal;
    if (!HM.modal) G.scene.update(STEP);
    econTick(STEP);
    Keys.pressed = {};
    for (const t of G.toasts) t.t += STEP;
    G.toasts = G.toasts.filter(t => t.t < t.ttl);
    if (G.shake.t > 0) G.shake.t -= STEP;
    if (G.flash.t > 0) G.flash.t -= STEP;
    if (G.fade > 0) G.fade -= STEP * 3;
    partsUpdate(STEP);
    saveT += STEP;
    if (saveT > 10) { saveT = 0; G.save.lastSeen = Date.now(); persist(); }
    acc -= STEP;
  }
  // ---- draw (UI interaction happens here, once per frame) ----
  UI.begin(dt || STEP);
  const shk = G.shake.t > 0 ? G.shake.amt * (G.shake.t / G.shake.dur) : 0;
  ctx.save();
  if (shk > 0) ctx.translate((Math.random() - 0.5) * 2 * shk, (Math.random() - 0.5) * 2 * shk);
  HM.modalBlock = !!HM.modal;
  G.scene.draw(ctx);
  partsDraw(ctx);
  ctx.restore();
  if (G.flash.t > 0) {
    ctx.globalAlpha = 0.5 * (G.flash.t / G.flash.dur);
    ctx.fillStyle = G.flash.col;
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }
  gordDraw(ctx);
  toastsDraw(ctx);
  HM.modalBlock = false;
  drawModal(ctx, dt || STEP);
  UI.drawTip(ctx);
  UI.end();
  if (G.fade > 0) {
    ctx.fillStyle = 'rgba(5,8,14,' + clamp(G.fade, 0, 1) + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
  HM.mouse.pressed = false;
  HM.mouse.released = false;
  requestAnimationFrame(frame);
}

window.addEventListener('visibilitychange', () => {
  if (document.hidden) { G.save.lastSeen = Date.now(); persist(); }
});

setScene('title');
applyOffline();
requestAnimationFrame(frame);
