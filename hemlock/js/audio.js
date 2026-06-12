'use strict';
// All sound is synthesized with WebAudio — no assets. Routed through a master
// compressor so layered cha-chings stay punchy instead of clipping.
const SFX = (function () {
  let ac = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('hemlock.mute') === '1'; } catch (e) { /* private mode */ }

  function ctx() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 6;
        master = ac.createGain(); master.gain.value = 1;
        master.connect(comp); comp.connect(ac.destination);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(f0, f1, dur, type, vol, when = 0) {
    const a = ctx(); if (!a || muted) return;
    const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function hiss(dur, vol, when = 0, lp = 0) {
    const a = ctx(); if (!a || muted) return;
    const t = a.currentTime + when;
    const len = Math.max(1, Math.floor(dur * a.sampleRate));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = a.createBufferSource(); n.buffer = buf;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = n;
    if (lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); node = f; }
    node.connect(g); g.connect(master);
    n.start(t);
  }

  // Looping wind-through-the-pines bed so the island never goes dead silent.
  let amb = null;
  function startAmb() {
    const a = ctx(); if (!a || amb) return;
    try {
      const len = Math.max(1, Math.floor(a.sampleRate * 2));
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240; f.Q.value = 0.6;
      const g = a.createGain(); g.gain.value = muted ? 0 : 0.02;
      const lfo = a.createOscillator(); lfo.frequency.value = 0.09;
      const lg = a.createGain(); lg.gain.value = 110;
      lfo.connect(lg); lg.connect(f.frequency);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(); lfo.start();
      amb = g;
    } catch (e) { amb = null; }
  }

  return {
    unlock() { ctx(); startAmb(); },
    toggleMute() {
      muted = !muted;
      if (amb) amb.gain.value = muted ? 0 : 0.02;
      try { localStorage.setItem('hemlock.mute', muted ? '1' : '0'); } catch (e) { /* private mode */ }
      return muted;
    },
    // --- UI ---
    click() { tone(900, 1200, 0.05, 'triangle', 0.07); },
    hover() { tone(1400, 1500, 0.025, 'sine', 0.02); },
    deny() { tone(220, 110, 0.16, 'square', 0.08); },
    open() { tone(500, 900, 0.1, 'sine', 0.06); tone(750, 1350, 0.1, 'sine', 0.04, 0.04); },
    back() { tone(800, 450, 0.09, 'sine', 0.05); },
    // --- money: the dopamine workhorses ---
    chaChing() {
      tone(1318, 1318, 0.07, 'square', 0.07); tone(1760, 1760, 0.16, 'square', 0.08, 0.07);
      tone(2637, 2637, 0.1, 'sine', 0.05, 0.07);
    },
    coin(k) { const f = 1568 + (k || 0) * 120; tone(f, f * 1.3, 0.06, 'square', 0.05); },
    crit() { [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, f, 0.1, 'square', 0.08, i * 0.055)); },
    jackpot() {
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, f, 0.14, 'square', 0.09, i * 0.08));
      hiss(0.5, 0.04, 0.4, 5000);
    },
    fanfare() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.15, 'square', 0.09, i * 0.11)); },
    unlockBiz() { [392, 523, 659, 784].forEach((f, i) => tone(f, f * 1.01, 0.18, 'triangle', 0.1, i * 0.09)); },
    // --- production ---
    plant() { tone(300, 180, 0.1, 'sine', 0.08); hiss(0.08, 0.04, 0, 900); },
    pop(k) { const f = 600 + (k || 0) * 90; tone(f, f * 1.6, 0.06, 'square', 0.09); },
    drip() { tone(900, 350, 0.09, 'sine', 0.07); },
    bubble() { tone(180, 420, 0.12, 'sine', 0.06); },
    sizzle() { hiss(0.18, 0.05, 0, 2500); },
    boom() { tone(120, 30, 0.7, 'sawtooth', 0.22); hiss(0.9, 0.18, 0, 1200); tone(60, 25, 0.9, 'sine', 0.18); },
    knock() { tone(160, 120, 0.06, 'square', 0.1); tone(160, 120, 0.06, 'square', 0.1, 0.14); },
    // --- heat / OPP ---
    radio() { tone(1200, 1180, 0.04, 'square', 0.04); tone(900, 950, 0.05, 'square', 0.04, 0.07); hiss(0.06, 0.02, 0.12, 3000); },
    siren() { tone(720, 980, 0.24, 'sine', 0.1); tone(980, 720, 0.24, 'sine', 0.1, 0.26); },
    raid() {
      [392, 370, 349, 311].forEach((f, i) => tone(f, f, 0.24, 'sawtooth', 0.12, i * 0.2));
      tone(720, 980, 0.22, 'sine', 0.08, 0.1); tone(980, 720, 0.22, 'sine', 0.08, 0.34);
    },
    // --- world ---
    motor() { tone(85, 65, 0.09, 'sawtooth', 0.03); },
    splash() { hiss(0.25, 0.1, 0, 1600); tone(280, 90, 0.2, 'sine', 0.07); },
    cricket() { tone(4300, 4100, 0.04, 'square', 0.025); tone(4300, 4100, 0.04, 'square', 0.02, 0.08); },
    loon() { tone(880, 660, 0.5, 'sine', 0.035); tone(660, 880, 0.35, 'sine', 0.03, 0.55); },
    tick(k) { tone(420 + k * 500, 420 + k * 500, 0.03, 'square', 0.04); },
  };
})();
