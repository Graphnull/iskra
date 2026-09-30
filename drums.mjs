import { widgetStorageKey } from "./widget-storage.mjs?v=8";
import { mountLiveKeyboard } from "./live-keyboard.mjs?v=6";
import { drumForMidi, DRUM_BINDINGS } from "./drum-notes.mjs?v=6";
import { createTransport, boundaryAfter, wallTime } from './transport.mjs?v=2';

const TRACKS = ['Бочка', 'Снейр', 'Хлопок', 'Хэт', 'Откр. хэт', 'Том', 'Крэш', 'Рим'];
const STEPS = 16;
document.title = 'Драм-машина';
document.body.classList.add('tenorion-mode');
document.querySelector('main').outerHTML = `
  <main class="tenorion drum-machine" aria-labelledby="title">
    <header class="heading"><div><p class="eyebrow">СОБЕРИ СВОЙ ГРУВ</p><h1 id="title">Драм-машина</h1></div></header>
    <div class="sequencer-controls drum-controls">
      <button type="button" id="play" aria-pressed="false">▶ Играть</button>
      <label class="tempo">Темп <input id="tempo" type="number" min="40" max="240" value="110" aria-label="Темп в ударах в минуту"></label>
      <button type="button" id="clear">Сброс</button>
    </div>
    <div class="drum-grid" role="group" aria-label="Восемь ударных, шестнадцать шагов"></div>
    <p class="sequencer-hint">Включай шаги · каждый блок — одна доля</p>
  </main>`;
const grid = document.querySelector('.drum-grid');
const play = document.getElementById('play');
const tempo = document.getElementById('tempo');
const pattern = TRACKS.map(() => Array(STEPS).fill(false));
const cells = [];
const storageKey = widgetStorageKey('drum-pattern-v1');
const voices = new Set();
const visuals = new Set();
let context, output, noiseBuffer, timer, cursor, running = false, starting = false;
function save() {
  const saved = JSON.stringify(pattern);
  try { sessionStorage.setItem(storageKey, saved); } catch {}
  try { localStorage.setItem(storageKey, saved); } catch {}
}
function setCell(row, column, value) {
  pattern[row][column] = value;
  const cell = cells[row * STEPS + column];
  cell.classList.toggle('is-on', value);
  cell.setAttribute('aria-pressed', String(value));
}
grid.append(document.createElement('span'));
for (let column = 0; column < STEPS; column++) {
  const label = document.createElement('span');
  label.className = 'drum-step-number';
  label.textContent = column + 1;
  label.setAttribute('aria-hidden', 'true');
  grid.append(label);
}
for (let row = 0; row < TRACKS.length; row++) {
  const label = document.createElement('span');
  label.className = 'drum-track-name';
  label.innerHTML = `${TRACKS[row]}<small>${DRUM_BINDINGS[row].note} · ${DRUM_BINDINGS[row].key}</small>`;
  label.setAttribute('aria-hidden', 'true');
  grid.append(label);
  for (let column = 0; column < STEPS; column++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `drum-cell${Math.floor(column / 4) % 2 ? ' alternate-beat' : ''}`;
    cell.dataset.column = column;
    cell.setAttribute('aria-label', `${TRACKS[row]}, шаг ${column + 1}`);
    cell.setAttribute('aria-pressed', 'false');
    cell.tabIndex = row === 0 && column === 0 ? 0 : -1;
    cell.addEventListener('click', () => {
      setCell(row, column, !pattern[row][column]);
      save();
      for (const item of cells) item.tabIndex = -1;
      cell.tabIndex = 0;
    });
    cell.addEventListener('keydown', event => {
      const offset = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
      if (!offset) return;
      event.preventDefault();
      const target = cells[((row + offset[0] + TRACKS.length) % TRACKS.length) * STEPS + (column + offset[1] + STEPS) % STEPS];
      cell.tabIndex = -1;
      target.tabIndex = 0;
      target.focus();
    });
    cells.push(cell);
    grid.append(cell);
  }
}
for (const storageName of ['sessionStorage', 'localStorage']) {
  try {
    const saved = JSON.parse(window[storageName].getItem(storageKey));
    if (!Array.isArray(saved) || saved.length !== TRACKS.length || !saved.every(row => Array.isArray(row) && row.length === STEPS && row.every(value => typeof value === 'boolean'))) continue;
    saved.forEach((row, r) => row.forEach((value, c) => setCell(r, c, value)));
    save();
    break;
  } catch {}
}
function clearVisuals() {
  for (const timeout of visuals) clearTimeout(timeout);
  visuals.clear();
}
const transport = createTransport(state => {
  tempo.value = state.bpm;
  if (!running) return;
  clearVisuals();
  for (const voice of voices) if (voice.time > context.currentTime) voice.source.stop();
  cursor = wallTime() + 35;
}, () => {});
tempo.value = transport.state.bpm;
function attach(source, time, duration, level, filter) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(level, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  if (filter) source.connect(filter).connect(gain);
  else source.connect(gain);
  gain.connect(output);
  const voice = { source, time };
  voices.add(voice);
  source.onended = () => { voices.delete(voice); source.disconnect(); gain.disconnect(); filter?.disconnect(); };
  source.start(time);
  source.stop(time + duration + 0.02);
}
function tone(time, frequency, endFrequency, duration, level, type = 'sine') {
  const source = context.createOscillator();
  source.type = type;
  source.frequency.setValueAtTime(frequency, time);
  source.frequency.exponentialRampToValueAtTime(endFrequency, time + duration * 0.7);
  attach(source, time, duration, level);
}
function noise(time, duration, level, frequency, type = 'highpass') {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  attach(source, time, duration, level, filter);
}
function hit(row, time) {
  switch (row) {
    case 0: tone(time, 160, 42, 0.36, 0.85); break;
    case 1: tone(time, 185, 110, 0.13, 0.28); noise(time, 0.2, 0.55, 1500); break;
    case 2: for (let i = 0; i < 3; i++) noise(time + i * 0.014, i === 2 ? 0.15 : 0.025, 0.5, 1600, 'bandpass'); break;
    case 3: noise(time, 0.055, 0.3, 6500); break;
    case 4: noise(time, 0.35, 0.3, 6500); break;
    case 5: tone(time, 145, 65, 0.28, 0.6); break;
    case 6: noise(time, 0.9, 0.4, 4500); break;
    case 7: tone(time, 1200, 900, 0.035, 0.15, 'square'); break;
  }
}
function schedule() {
  const now = wallTime();
  cursor = Math.max(cursor, now + 10);
  while (true) {
    const boundary = boundaryAfter(transport.state, cursor);
    if (boundary.time > now + 200) break;
    const column = ((boundary.step % STEPS) + STEPS) % STEPS;
    const time = context.currentTime + (boundary.time - now) / 1000;
    for (let row = 0; row < TRACKS.length; row++) if (pattern[row][column]) hit(row, time);
    const timeout = setTimeout(() => {
      visuals.delete(timeout);
      for (const cell of cells) cell.classList.toggle('is-step', Number(cell.dataset.column) === column);
    }, Math.max(0, boundary.time - now));
    visuals.add(timeout);
    cursor = boundary.time + 1;
  }
}
function stop() {
  running = false;
  clearInterval(timer);
  clearVisuals();
  for (const voice of voices) voice.source.stop(context.currentTime + 0.01);
  for (const cell of cells) cell.classList.remove('is-step');
  play.textContent = '▶ Играть';
  play.setAttribute('aria-pressed', 'false');
}
async function ensureAudio() {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (!output) {
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 8;
      output = context.createGain();
      output.gain.value = 0.45;
      output.connect(compressor).connect(context.destination);
      noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    await context.resume();
}
mountLiveKeyboard({
  async onNoteOn(key) { await ensureAudio(); hit(drumForMidi(key.midi), context.currentTime); },
  labelFor: key => `${key.note}${key.octave} · ${TRACKS[drumForMidi(key.midi)]}`,
});
play.addEventListener('click', async () => {
  if (starting) return;
  if (running) return stop();
  starting = true;
  play.disabled = true;
  try {
    await ensureAudio();
    running = true;
    transport.refresh();
    cursor = wallTime() + 35;
    play.textContent = '■ Стоп';
    play.setAttribute('aria-pressed', 'true');
    schedule();
    timer = setInterval(schedule, 25);
  } catch { stop(); play.textContent = 'Повторить'; }
  finally { starting = false; play.disabled = false; }
});
function updateTempo() {
  const bpm = Math.min(240, Math.max(40, Number(tempo.value) || 110));
  tempo.value = bpm;
  if (bpm !== transport.state.bpm) transport.setTempo(bpm);
}
tempo.addEventListener('change', updateTempo);
tempo.addEventListener('blur', updateTempo);
document.getElementById('clear').addEventListener('click', () => {
  stop();
  pattern.forEach((row, r) => row.forEach((_, c) => setCell(r, c, false)));
  save();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { transport.refresh(); if (running) { clearVisuals(); cursor = wallTime() + 35; } }
});
window.addEventListener('pagehide', stop);
