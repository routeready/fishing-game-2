'use strict';
// Boot gate: ask who's fishing before the game starts. DOM overlay so phones
// get their native keyboard; saves to G.save.name and gets out of the way.
(function () {
  const ov = document.createElement('div');
  ov.id = 'namegate';
  const box = document.createElement('div');
  box.className = 'nbox';
  const h = document.createElement('div');
  h.className = 'ntitle';
  h.textContent = "WHO'S FISHING TODAY?";
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 10;
  input.placeholder = 'YOUR NAME';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = RT.G.save.name || '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = "LET'S GO";
  box.append(h, input, btn);
  ov.appendChild(box);

  function go() {
    const v = (input.value || '').trim().toUpperCase().slice(0, 10) || 'ANON';
    RT.G.save.name = v;
    persist();
    window.removeEventListener('keydown', trap, true);
    ov.remove();
    SFX.unlock();
  }
  // Capture-phase trap so typing your name doesn't also drive the game
  // (the game listens for keys on window). Default behavior still types.
  function trap(e) {
    e.stopPropagation();
    if (e.key === 'Enter') go();
  }
  window.addEventListener('keydown', trap, true);
  btn.addEventListener('click', go);

  document.body.appendChild(ov);
  input.focus();
})();
