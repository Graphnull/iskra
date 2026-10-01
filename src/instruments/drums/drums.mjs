import { bindPlayback } from '../../core/playback-control.mjs?v=274f22366041';
import { createScheduler } from '../../core/scheduler.mjs?v=274f22366041';
import { widgetStorageKey } from '../../core/widget-storage.mjs?v=274f22366041';
import { createMicrophone, microphoneError } from '../../core/microphone.mjs?v=274f22366041';
import { sampleStore } from '../../core/sample-store.mjs?v=274f22366041';
import { SAMPLE_BINDINGS, drumTrackForMidi, decodeDrumSample, drumSampleVoice } from './drum-samples.mjs?v=274f22366041';
import { createSections, mountSections, sectionPosition } from "../../core/sections.mjs?v=274f22366041";
import { mountLiveKeyboard } from "../../core/live-keyboard.mjs?v=274f22366041";
import { DRUM_BINDINGS } from "./drum-notes.mjs?v=274f22366041";
import { createTransport } from '../../core/transport.mjs?v=274f22366041';

const TRACKS = ['Бочка', 'Снейр', 'Хлопок', 'Хэт', 'Откр. хэт', 'Том', 'Крэш', 'Рим', 'Семпл 1', 'Семпл 2', 'Семпл 3', 'Семпл 4'];
const STEPS = 16;
document.title = 'Драм-машина';
document.body.classList.add('tenorion-mode');
document.querySelector('main').outerHTML = `
  <main class="tenorion drum-machine" aria-labelledby="title">
    <header class="heading"><div><p class="eyebrow">СОБЕРИ СВОЙ ГРУВ</p><h1 id="title">Драм-машина</h1></div></header>
    <div class="sequencer-controls drum-controls">
      <button type="button" id="play" aria-pressed="false">▶ Играть</button>
      <label class="tempo">Темп <input id="tempo" type="number" min="40" max="240" value="110" aria-label="Темп в ударах в минуту"></label>
      <button type="button" id="clear" aria-label="Очистить текущую секцию" title="Очистить текущую секцию">Сброс</button>
    </div>
    <button id="record-window" class="drum-record-window" type="button" hidden>Записать в отдельном окне ↗</button>
    <div class="drum-grid" role="group" aria-label="Восемь ударных и четыре семпла, шестнадцать шагов"></div>
    <p id="record-status" class="sequencer-hint" role="status" hidden></p>
    <p class="sequencer-hint drum-hint">4 секции × 16 шагов · красная точка — играет</p>
  </main>`;
const grid = document.querySelector('.drum-grid');
const play = document.getElementById('play');
const tempo = document.getElementById('tempo');
const sequence = createSections("drum", TRACKS.length, { previousRows: [8] });
const cells = [];
const samples = Array(4).fill(null);
const sampleLabels = [], recordButtons = [], previewButtons = [];
const sampleKeys = Array.from({ length: 4 }, (_, slot) => widgetStorageKey(`drum-sample-${slot + 1}-v1`));
const voices = new Set();
let scheduler;
let context, output, noiseBuffer, running = false;
function save() { sequence.save(); }
function setCell(row, column, value) {
  sequence.pattern[row][column] = value;
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
  if (row < 8) {
    label.innerHTML = `${TRACKS[row]}<small>${DRUM_BINDINGS[row].note} · ${DRUM_BINDINGS[row].key}</small>`;
    label.setAttribute('aria-hidden', 'true');
  } else {
    const slot = row - 8;
    label.classList.add('sample-track');
    const controls = document.createElement('div');
    const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'sample-preview';
    preview.textContent = `Семпл ${slot + 1}`; preview.disabled = true; preview.setAttribute('aria-label', `Прослушать семпл ${slot + 1}`);
    preview.addEventListener('click', async () => { await ensureAudio(); hit(row, context.currentTime); });
    const record = document.createElement('button'); record.type = 'button'; record.className = 'sample-record'; record.textContent = '●';
    record.setAttribute('aria-label', `Записать семпл ${slot + 1}`); record.title = `Записать семпл ${slot + 1}`;
    record.addEventListener('click', () => recordSlot(slot));
    controls.append(preview, record); label.append(controls);
    const info = document.createElement('small'); info.textContent = `${SAMPLE_BINDINGS[slot].key} · пусто`; label.append(info);
    sampleLabels.push(info); recordButtons.push(record); previewButtons.push(preview);
  }
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
      setCell(row, column, !sequence.pattern[row][column]);
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
const sectionView = mountSections(sequence, grid, cells);
const transport = createTransport(state => {
  tempo.value = state.bpm;
  if (!running) return;
  scheduler?.reset();
  for (const voice of voices) if (voice.time > context.currentTime) voice.source.stop();
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
  if (row >= 8) {
    const voice = drumSampleVoice(context, output, samples[row - 8], time);
    if (!voice) return;
    voices.add(voice);
    voice.source.onended = () => { voices.delete(voice); voice.source.disconnect(); voice.gain.disconnect(); };
    return;
  }
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
scheduler = createScheduler({
    onError() { stop(); play.textContent = 'Повторить'; },
  context: () => context, transport: () => transport.state,
  onStep({ step, time }) {
    const { section, column } = sectionPosition(step);
    for (let row = 0; row < TRACKS.length; row++) if (sequence.state.patterns[section][row][column]) hit(row, time);
  },
  onVisual: step => sectionView.showStep(sectionPosition(step)),
});
function stop() {
  playback.cancelStart();
  running = false;
  scheduler.stop();
  for (const voice of voices) voice.source.stop(context.currentTime + 0.01);
  sectionView.stop();
  play.textContent = '▶ Играть';
  play.setAttribute('aria-pressed', 'false');
}
function prepareAudio() {
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
    return context;
}
async function ensureAudio() { await prepareAudio().resume(); }
mountLiveKeyboard({
  async onNoteOn(key) { await ensureAudio(); hit(drumTrackForMidi(key.midi), context.currentTime); },
  labelFor: key => `${key.note}${key.octave} · ${TRACKS[drumTrackForMidi(key.midi)]}`,
});
const playback = bindPlayback(play, {
  prepare: ensureAudio, isRunning: () => running, stop,
  start() { running = true; transport.refresh(); scheduler.start(); },
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
  sequence.pattern.forEach((row, r) => row.forEach((_, c) => setCell(r, c, false)));
  save();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { transport.refresh(); if (running) scheduler.reset(); }
});
window.addEventListener('pagehide', event => { stop(); mic.dispose(); if (!event.persisted) transport.close(); });

const recordStatus = document.getElementById('record-status');
const recordWindow = document.getElementById('record-window');
let requestedSlot = 0;
function showRecordStatus(message) {
  recordStatus.textContent = message;
  recordStatus.hidden = false;
  document.querySelector('.drum-hint').hidden = true;
}
function refreshSampleSlot(slot) {
  const binding = SAMPLE_BINDINGS[slot];
  sampleLabels[slot].textContent = `${binding.key} · ${samples[slot] ? `${samples[slot].duration.toFixed(1)} с` : 'пусто'}`;
  previewButtons[slot].disabled = !samples[slot];
  previewButtons[slot].title = samples[slot] ? `${TRACKS[8 + slot]} · ${binding.note} · ${samples[slot].duration.toFixed(1)} с` : 'Запиши свой звук';
  previewButtons[slot].classList.toggle('has-sample', !!samples[slot]);
}
async function installSample(slot, blob, persist = true) {
  const buffer = await decodeDrumSample(prepareAudio(), blob);
  samples[slot] = buffer;
  refreshSampleSlot(slot);
  if (!persist) return;
  recordWindow.hidden = true;
  showRecordStatus(`Семпл ${slot + 1} · ${buffer.duration.toFixed(1)} с · готов`);
  try { await sampleStore(sampleKeys[slot], blob); }
  catch { showRecordStatus(`Семпл ${slot + 1} готов · браузер не смог сохранить запись`); }
}
const mic = createMicrophone({
  onState(state, seconds) {
    const busy = state !== 'idle';
    play.disabled = busy;
    recordButtons.forEach((button, slot) => {
      const recording = state === 'recording' && slot === requestedSlot;
      button.disabled = busy && !recording;
      button.classList.toggle('is-recording', recording);
      button.textContent = recording ? '■' : '●';
      button.setAttribute('aria-label', `${recording ? 'Остановить запись' : 'Записать'} семпл ${slot + 1}`);
      previewButtons[slot].disabled = busy || !samples[slot];
    });
    if (state === 'requesting') showRecordStatus(`Семпл ${requestedSlot + 1} · разреши микрофон`);
    if (state === 'recording') showRecordStatus(`Семпл ${requestedSlot + 1} · запись ${seconds} с · нажми ■ для остановки`);
    if (state === 'processing') showRecordStatus(`Семпл ${requestedSlot + 1} · обработка…`);
  },
  onBlob(blob) { return installSample(requestedSlot, blob); },
  onError(error) { showRecordStatus(microphoneError(error)); recordWindow.hidden = false; },
});
function recordSlot(slot) {
  if (mic.recording) return mic.stop();
  requestedSlot = slot;
  stop();
  const policy = document.permissionsPolicy || document.featurePolicy;
  if (policy?.allowsFeature && !policy.allowsFeature('microphone')) return openRecordWindow(slot);
  mic.start();
}
const recordWindows = new Map();
function openRecordWindow(slot) {
  stop();
  const session = crypto.randomUUID(), url = new URL(location.href);
  url.searchParams.set('mode', 'recorder'); url.searchParams.set('target', 'drums'); url.searchParams.set('session', session);
  const popup = window.open(url.href, '_blank', 'popup,width=376,height=376');
  if (popup) {
    for (const [key, entry] of recordWindows) if (entry.popup.closed) recordWindows.delete(key);
    recordWindows.set(session, { popup, slot });
    showRecordStatus(`Семпл ${slot + 1} · запиши звук в открывшемся окне`);
  } else showRecordStatus('Разреши всплывающее окно для записи.');
}
recordWindow.addEventListener('click', () => openRecordWindow(requestedSlot));
window.addEventListener('message', async event => {
  const entry = recordWindows.get(event.data?.session);
  if (event.origin !== location.origin || !entry || event.source !== entry.popup || event.data.type !== 'drum-sample' || !(event.data.blob instanceof Blob)) return;
  try {
    await installSample(entry.slot, event.data.blob);
    entry.popup.postMessage({ type: 'sample-received', session: event.data.session }, location.origin);
  } catch (error) {
    showRecordStatus(microphoneError(error));
    entry.popup.postMessage({ type: 'sample-failed', session: event.data.session, error: microphoneError(error) }, location.origin);
  }
});
sampleKeys.forEach((key, slot) => {
  sampleStore(key).then(blob => { if (blob instanceof Blob && !samples[slot]) return installSample(slot, blob, false); }).catch(() => {});
});
