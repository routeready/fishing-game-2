'use strict';
// On-screen touch controls. Only shows on coarse-pointer devices and writes
// straight into RT.Keys, so the game logic never knows it isn't a keyboard.
(function () {
  const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ||
    'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
  if (!coarse) return;
  document.body.classList.add('touch');

  function press(k) { const K = RT.Keys; if (!K.held[k]) K.pressed[k] = true; K.held[k] = true; }
  function release(k) { RT.Keys.held[k] = false; }

  function btn(label, keys, cls) {
    const b = document.createElement('div');
    b.className = 'tbtn' + (cls ? ' ' + cls : '');
    b.textContent = label;
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
    btn('ESC', ['back'], 'sm'), btn('OK', ['ok'], 'sm'), btn('HMB!', ['hold'], 'sm'),
    btn('BEER', ['beer'], 'md'), btn('LAY LOW', ['lay'], 'md'),
    btn('CAST', ['act'], 'big'),
  );

  bar.append(dpad, acts);
  document.body.appendChild(bar);

  const mute = btn('♪', ['mute'], '');
  mute.id = 'tmute';
  document.body.appendChild(mute);

  // Earl's free-beer offer wants Y/N — pop them up only while he's asking.
  const yn = document.createElement('div');
  yn.id = 'tyn';
  yn.append(btn('Y', ['yes'], 'sm'), btn('N', ['no'], 'sm'));
  document.body.appendChild(yn);
  (function watch() {
    yn.style.display = (RT.G && RT.G.earl.offer) ? 'flex' : 'none';
    requestAnimationFrame(watch);
  })();

  // main.js already ran its initial fit() without the 'touch' class — redo it.
  window.dispatchEvent(new Event('resize'));
})();
