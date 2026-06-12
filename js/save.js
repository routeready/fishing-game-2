'use strict';
const SAVE_KEY = 'reelTrouble.v1';

function defaultSave() {
  return {
    cash: 0, rod: 0, boat: 0, beer: 0, lakes: 1,
    name: '',       // who's fishing — asked at boot
    board: [],      // leaderboard: [{ name, score }] best single-trip haul per name
    trophies: {},   // speciesId -> { w: bestWeight, n: count }
    records: { bigW: 0, bigName: '', haul: 0, buzz: 0, streak: 0, bestStreak: 0, nearMisses: 0, trips: 0, busts: 0 },
  };
}

function loadSave() {
  const d = defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    return {
      ...d, ...s,
      board: (s.board || []).filter(e => e && e.name),
      trophies: { ...(s.trophies || {}) },
      records: { ...d.records, ...(s.records || {}) },
    };
  } catch (e) { return d; }
}

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(RT.G.save)); } catch (e) { /* private mode */ }
}

// Date-seeded daily report: weather, hot spot, fish of the day, tip, wind.
function dailyReport() {
  const now = new Date();
  const dateStr = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  const r = mulberry32(seed);
  const weather = WEATHERS[Math.floor(r() * WEATHERS.length)];
  const windDir = r() * Math.PI * 2;
  const windSpd = Math.floor(r() * (weather.windMax + 1));
  const commons = Object.keys(FISH).filter(k => !FISH[k].legend);
  const fod = commons[Math.floor(r() * commons.length)];
  // fish of the day per lake, so the 2x bonus always points at catchable water
  const fodL = LAKES.map(L => L.fish[Math.floor(r() * L.fish.length)][0]);
  const hot = Math.floor(r() * 100); // taken modulo spot count per lake
  const tip = TIPS[Math.floor(r() * TIPS.length)];
  return { seed, dateStr, weather, windDir, windSpd, fod, fodL, hot, tip };
}
