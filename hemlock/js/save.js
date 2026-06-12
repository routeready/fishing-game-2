'use strict';
const SAVE_KEY = 'hemlock.v1';

function defaultSave() {
  return {
    cash: 40,                       // the inheritance: forty bucks and a rotten dock
    heat: 0,                        // 0..100 OPP attention
    day: '',                        // last dateStr seen (daily decay / market reroll)
    lastSeen: Date.now(),           // offline earnings delta
    rank: 0,
    inv: { shine: 0, opium: 0, heroin: 0, meth: 0, kgRaw: 0, coke: 0 },
    biz: {
      still: { lvl: 0, t0: 0, stored: 0 },
      poppy: { plots: [], up: {} },               // plots: [{ st:'empty'|'grow'|'ready', t0 }]
      lab:   { lvl: 0, job: null, up: {} },       // job: { t0, dur, n, q }
      meth:  { lvl: 0, up: {} },
      coke:  { lvl: 0, up: {} },
      lodge: { lvl: 0, girls: [], lastTick: 0, pend: 0, up: {} }, // girls: [{name,bio,rate,mood,face}]
    },
    stash: 0, lawyer: 0,
    bribes: 0,                      // bribes paid today (price inflates)
    layLowUntil: 0,                 // sales locked until this timestamp
    records: { earned: 0, bestSale: 0, bestCombo: 0, raids: 0, days: 0, cleanStreak: 0, bestStreak: 0, cooks: 0, booms: 0 },
  };
}

function loadSave() {
  const d = defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    const out = { ...d, ...s };
    out.inv = { ...d.inv, ...(s.inv || {}) };
    out.biz = { ...d.biz };
    for (const k of Object.keys(d.biz)) out.biz[k] = { ...d.biz[k], ...((s.biz || {})[k] || {}) };
    out.records = { ...d.records, ...(s.records || {}) };
    return out;
  } catch (e) { return d; }
}

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(HM.G.save)); } catch (e) { /* private mode */ }
}

// ---------- date-seeded daily market ----------
function dateStrFor(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

function dailyMarket(dateStr) {
  dateStr = dateStr || dateStrFor(new Date());
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  const r = mulberry32(seed);
  const prices = {};
  for (const id of ['shine', 'heroin', 'meth', 'coke']) prices[id] = 0.6 + r() * 0.8;
  const sellable = ['shine', 'heroin', 'meth', 'coke'];
  const hot = sellable[Math.floor(r() * sellable.length)];
  prices[hot] *= 2;
  const event = EVENTS[Math.floor(r() * EVENTS.length)];
  // event price effects bake straight into the day's prices
  if (event.fx.price) for (const k of Object.keys(event.fx.price)) prices[k] *= event.fx.price[k];
  if (event.fx.priceAll) for (const k of sellable) prices[k] *= event.fx.priceAll;
  const tip = TIPS[Math.floor(r() * TIPS.length)];
  // daily lodge hiring roster seeds
  const roster = [];
  for (let i = 0; i < 3; i++) roster.push(Math.floor(r() * 1e9));
  return { seed, dateStr, prices, hot, event, tip, roster };
}

// ---------- production math (pure, so smoke.js can unit-test it) ----------
function stillTier(s) { return BIZ.still.tiers[Math.max(0, s.biz.still.lvl - 1)]; }

// Jugs accrued since t0, capped by storage. Returns { jugs, newT0 }.
function stillAccrue(s, now) {
  const st = s.biz.still;
  if (st.lvl <= 0 || !st.t0) return { jugs: 0, newT0: st.t0 };
  const tier = stillTier(s);
  const cookX = 1; // event cook multipliers apply to active cooks, not the drip
  const per = tier.dur * 1000 * cookX;
  const n = Math.floor((now - st.t0) / per);
  const room = Math.max(0, tier.cap - st.stored);
  const jugs = Math.min(n, room);
  return { jugs, newT0: st.t0 + jugs * per };
}

// Lodge $/sec given current girls & upgrades (before event multipliers).
function lodgeRate(s) {
  const L = s.biz.lodge;
  if (L.lvl <= 0) return 0;
  let rate = 0;
  for (const g of L.girls) rate += g.rate * (g.mood / 100);
  if (L.up.exec) rate *= 1.75;
  return rate / 60; // rates are $/min
}

// What happened while the tab was closed. Pure: pass save + now.
function offlineGains(s, now) {
  const dt = Math.min(Math.max(0, now - (s.lastSeen || now)), 8 * 3600 * 1000); // 8h cap
  if (dt < 30 * 1000) return null;
  const out = { ms: dt, jugs: 0, lodge: 0, plots: 0 };
  const acc = stillAccrue(s, now);
  out.jugs = acc.jugs;
  out.lodge = Math.round(lodgeRate(s) * dt / 1000);
  for (const p of s.biz.poppy.plots) {
    if (p.st === 'grow' && now - p.t0 >= growDur(s) * 1000) out.plots++;
  }
  return (out.jugs || out.lodge || out.plots) ? out : null;
}

function growDur(s) { return BIZ.poppy.grow * (s.biz.poppy.up.fert ? 0.67 : 1); }

// Raid losses. Pure: returns { cashLost, invLost: {prod: n} }.
function raidLosses(s) {
  const keep = LAWYER_TIERS[s.lawyer].keep;
  const prot = STASH_TIERS[s.stash].prot;
  const cashLost = Math.round(s.cash * (1 - keep));
  const invLost = {};
  for (const k of ['shine', 'heroin', 'meth', 'coke']) {
    invLost[k] = Math.floor(s.inv[k] * (1 - prot));
  }
  return { cashLost, invLost };
}

// Procedural lodge candidate from a seed (same seed = same girl all day).
function lodgeCandidate(seed) {
  const r = mulberry32(seed);
  const name = LODGE_NAMES[Math.floor(r() * LODGE_NAMES.length)];
  const bio = LODGE_BIOS[Math.floor(r() * LODGE_BIOS.length)];
  const rate = 8 + Math.floor(r() * 28);            // $/min
  const fee = 500 + Math.floor(r() * 26) * 100;     // $500-$3000
  const skins = ['#f0c8a0', '#e8b48c', '#c8906a', '#a06840', '#704828'];
  const hairs = ['long', 'bun', 'short', 'mohawk'];
  const cols = ['#2a1a10', '#5a3a1a', '#c8a040', '#b03030', '#d860a8', '#202028'];
  const face = {
    skin: skins[Math.floor(r() * skins.length)],
    hair: hairs[Math.floor(r() * hairs.length)],
    hairCol: cols[Math.floor(r() * cols.length)],
    lashes: true, lip: '#d04060',
    coat: ['#8a2a4a', '#4a2a6a', '#2a5a4a', '#6a4a2a'][Math.floor(r() * 4)],
  };
  return { name, bio, rate, fee, mood: 80, face, seed };
}
