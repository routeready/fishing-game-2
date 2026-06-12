'use strict';
// On-screen touch controls. Only shows on coarse-pointer devices and writes
// straight into RT.Keys, so the game logic never knows it isn't a keyboard.
(function () {
  const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ||
    'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
  if (!coarse) return;
  RT.touch = true; // scenes swap key hints for button names
  document.body.classList.add('touch');

  // Refcounted so GAS and d-pad UP (both 'up') don't cancel each other.
  const cnt = {};
  function press(k) {
    cnt[k] = (cnt[k] || 0) + 1;
    const K = RT.Keys;
    if (!K.held[k]) K.pressed[k] = true;
    K.held[k] = true;
  }
  function release(k) {
    cnt[k] = Math.max(0, (cnt[k] || 0) - 1);
    if (cnt[k] === 0) RT.Keys.held[k] = false;
  }

  function btn(label, keys, cls, hint) {
    const b = document.createElement('div');
    b.className = 'tbtn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    if (hint) {
      const h = document.createElement('span');
      h.className = 'thint';
      h.textContent = hint;
      b.appendChild(h);
    }
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      SFX.unlock();
      b.classList.add('on');
      keys.forEach(press);
    });
    const up = (e) => { e.preventDefault(); b.classList.remove('on'); keys.forEach(release); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  const bar = document.createElement('div');
  bar.id = 'tc';

  const dpad = document.createElement('div');
  dpad.id = 'dpad';
  dpad.append(
    btn('▲', ['up'], 'd-u'), btn('◀', ['left'], 'd-l'),
    btn('▶', ['right'], 'd-r'), btn('▼', ['down'], 'd-d'),
  );

  const acts = document.createElement('div');
  acts.id = 'acts';
  acts.append(
    btn('BACK', ['back'], 'sm', 'menu/leave'), btn('OK', ['ok'], 'sm', 'confirm'), btn('HMB!', ['hold'], 'sm', 'super cast'),
    btn('BEER', ['beer'], 'md', 'drink one'), btn('LAY LOW', ['lay'], 'md w2', 'hold to hide'),
    btn('CAST', ['act'], 'big', 'strike / hold to reel'),
  );

  // thumbs layout: steer left, actions center, throttle right
  const gas = btn('GAS', ['up'], '', 'hold to drive');
  gas.id = 'tgas';
  bar.append(dpad, acts, gas);
  document.body.appendChild(bar);

  const mute = btn('♪', ['mute'], '');
  mute.id = 'tmute';
  document.body.appendChild(mute);

  // Graham's free-beer offer wants Y/N — pop them up only while he's asking.
  const yn = document.createElement('div');
  yn.id = 'tyn';
  yn.append(btn('Y', ['yes'], 'sm', 'yes!'), btn('N', ['no'], 'sm', 'no thanks'));
  document.body.appendChild(yn);
  (function watch() {
    yn.style.display = (RT.G && RT.G.earl.offer) ? 'flex' : 'none';
    requestAnimationFrame(watch);
  })();

  // Tapping the game screen itself drives menus (scenes read RT.tap).
  const cvsEl = document.getElementById('game');
  cvsEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    SFX.unlock();
    const r = cvsEl.getBoundingClientRect();
    if (r.width > 0) RT.tap = { x: (e.clientX - r.left) * 320 / r.width, y: (e.clientY - r.top) * 224 / r.height };
  });

  // iOS Safari can still pinch/double-tap zoom despite the viewport meta and
  // touch-action — kill both gestures outright; this is a fixed-canvas game.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  // main.js already ran its initial fit() without the 'touch' class — redo it.
  window.dispatchEvent(new Event('resize'));
})();
