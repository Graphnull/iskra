import { buildKeyMap } from './keyboard-map.mjs?v=6';

export function bindKeyInput({ onNoteOn, onNoteOff = () => {}, onHighlight = () => {} }) {
  const keys = new Map(buildKeyMap().map(key => [key.code, key]));
  const held = new Map();
  function end(source) {
    const entry = held.get(source);
    if (!entry) return;
    held.delete(source);
    entry.released = true;
    if (entry.ready) onNoteOff(entry.voice);
    if (![...held.values()].some(item => item.key.code === entry.key.code)) onHighlight(entry.key, false);
  }
  function start(key, source) {
    if (held.has(source)) return;
    const entry = { key, ready: false, released: false };
    held.set(source, entry);
    onHighlight(key, true);
    try {
      Promise.resolve(onNoteOn(key, source)).then(voice => {
        entry.voice = voice;
        entry.ready = true;
        if (entry.released) onNoteOff(voice);
      }).catch(() => end(source));
    } catch { end(source); }
  }
  function releaseAll() { for (const source of held.keys()) end(source); }
  document.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    const key = keys.get(event.code);
    if (!key) return;
    event.preventDefault();
    start(key, `keyboard:${event.code}`);
  });
  document.addEventListener('keyup', event => end(`keyboard:${event.code}`));
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  return { start, end, releaseAll };
}

export function mountLiveKeyboard({ onNoteOn, onNoteOff, labelFor = key => `${key.note}${key.octave}` }) {
  const main = document.querySelector('main');
  const grid = main.querySelector('.light-grid, .drum-grid');
  const header = main.querySelector('header');
  const actions = document.createElement('div');
  actions.className = 'live-actions';
  actions.innerHTML = '<button type="button" class="live-focus" aria-label="Активировать клавиатуру">⌨<span class="focus-dot" aria-hidden="true"></span></button><button type="button" class="view-toggle" aria-pressed="false">Клавиши</button>';
  header.append(actions);
  const focus = actions.querySelector('.live-focus');
  const toggle = actions.querySelector('.view-toggle');
  const panel = document.createElement('section');
  panel.className = 'live-keys';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Игра с клавиатуры, мышью или касанием');
  grid.before(panel);
  const buttons = new Map();
  const input = bindKeyInput({ onNoteOn, onNoteOff, onHighlight(key, active) { buttons.get(key.code)?.classList.toggle('is-active', active); } });
  for (const row of ['upper-keyboard', 'lower-keyboard']) {
    const keys = buildKeyMap().filter(key => key.row === row);
    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard';
    keyboard.style.setProperty('--white-count', keys.filter(key => !key.black).length);
    panel.append(keyboard);
    for (const key of keys) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `key ${key.black ? 'black' : 'white'}`;
      button.dataset.code = key.code;
      if (key.black) button.style.setProperty('--position', key.position);
      button.innerHTML = `<span class="letter">${key.label}</span><span class="note"></span>`;
      buttons.set(key.code, button);
      keyboard.append(button);
      button.addEventListener('pointerdown', event => {
        event.preventDefault(); window.focus(); button.focus(); syncFocus();
        button.setPointerCapture(event.pointerId);
        input.start(key, `pointer:${event.pointerId}`);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => input.end(`pointer:${event.pointerId}`));
      button.addEventListener('keydown', event => {
        if (!['Enter', 'Space'].includes(event.code) || event.repeat) return;
        event.preventDefault(); input.start(key, `button:${key.code}`);
      });
      button.addEventListener('keyup', event => { if (['Enter', 'Space'].includes(event.code)) { event.preventDefault(); input.end(`button:${key.code}`); } });
    }
  }
  function refreshLabels() {
    for (const key of buildKeyMap()) {
      const button = buttons.get(key.code);
      const label = labelFor(key);
      button.setAttribute('aria-label', `${label}, клавиша ${key.label}`);
      button.querySelector('.note').textContent = label;
    }
  }
  function syncFocus() {
    const active = document.hasFocus() && !document.hidden;
    focus.classList.toggle('is-focused', active);
    focus.setAttribute('aria-label', active ? 'Клавиатура активна' : 'Активировать клавиатуру');
    focus.title = active ? 'Клавиатура активна' : 'Нажми, чтобы играть с клавиатуры';
  }
  focus.addEventListener('click', () => { window.focus(); focus.focus(); syncFocus(); });
  for (const type of ['focus', 'blur']) window.addEventListener(type, syncFocus);
  document.addEventListener('focusin', syncFocus);
  document.addEventListener('visibilitychange', syncFocus);
  toggle.addEventListener('click', () => {
    const show = panel.hidden;
    panel.hidden = !show;
    grid.hidden = show;
    toggle.textContent = show ? 'Сетка' : 'Клавиши';
    toggle.setAttribute('aria-pressed', String(show));
    input.releaseAll();
  });
  refreshLabels(); syncFocus();
  return { refreshLabels };
}
