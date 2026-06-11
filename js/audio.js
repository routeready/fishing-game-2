'use strict';
// All sound is synthesized with WebAudio — no assets.
const SFX = (function () {
  let ac = null, muted = false;
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
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
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, when = 0) {
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
    n.connect(g); g.connect(a.destination);
    n.start(t);
  }
  return {
    unlock() { ctx(); },
    toggleMute() { muted = !muted; return muted; },
    sel() { tone(660, 880, 0.06, 'square', 0.07); },
    deny() { tone(220, 110, 0.15, 'square', 0.09); },
    cast() { hiss(0.22, 0.1); tone(500, 950, 0.2, 'sine', 0.05); },
    splash() { hiss(0.3, 0.16); tone(300, 80, 0.25, 'sine', 0.09); },
    nibble() { tone(700, 640, 0.05, 'square', 0.07); },
    bite() { tone(880, 1320, 0.12, 'square', 0.13); tone(880, 1320, 0.12, 'square', 0.13, 0.13); },
    hook() { tone(200, 620, 0.15, 'sawtooth', 0.11); },
    reel() { tone(1150, 1050, 0.025, 'square', 0.035); },
    snap() { tone(1500, 90, 0.2, 'sawtooth', 0.16); hiss(0.14, 0.13); },
    off() { tone(520, 140, 0.3, 'sine', 0.1); },
    land() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.12, 'square', 0.11, i * 0.09)); },
    beer() { tone(1300, 1900, 0.05, 'square', 0.1); hiss(0.35, 0.09, 0.07); },
    gulp() { tone(160, 90, 0.09, 'sine', 0.12); },
    cash() { tone(1318, 1318, 0.08, 'square', 0.11); tone(1760, 1760, 0.18, 'square', 0.11, 0.09); },
    siren() { tone(720, 980, 0.22, 'sine', 0.11); tone(980, 720, 0.22, 'sine', 0.11, 0.24); },
    horn() { tone(440, 440, 0.45, 'sawtooth', 0.13); tone(554, 554, 0.45, 'sawtooth', 0.13); },
    busted() { [392, 370, 349, 311].forEach((f, i) => tone(f, f, 0.22, 'sawtooth', 0.13, i * 0.2)); },
    near() { tone(523, 523, 0.09, 'square', 0.09); tone(523, 523, 0.09, 'square', 0.09, 0.12); tone(659, 659, 0.22, 'square', 0.11, 0.26); },
    bonk() { tone(150, 55, 0.12, 'square', 0.14); hiss(0.1, 0.09); },
    fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, f, 0.13, 'square', 0.11, i * 0.11)); },
    motor() { tone(90, 70, 0.08, 'sawtooth', 0.03); },
  };
})();
