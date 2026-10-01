import { element, byId, targetElement, audioContext as createAudioContext } from '../../core/dom.js?v=2ce4b858cdb4';
import { at } from '../../core/guards.js?v=2ce4b858cdb4';
import { isSynthSound, isWaveform, DEFAULT_WAVE } from './synth-sequence.js?v=2ce4b858cdb4';
import { bindPlayback } from '../../core/playback-control.js?v=2ce4b858cdb4';
import { mountSynthPanel } from './synth-panel.js?v=2ce4b858cdb4';
import { readStored, writeStored } from '../../core/storage.js?v=2ce4b858cdb4';
import { createScheduler } from '../../core/scheduler.js?v=2ce4b858cdb4';
import { synthVoice, releaseVoice, updateSynthVoice } from './synth-audio.js?v=2ce4b858cdb4';
import { widgetStorageKey } from '../../core/widget-storage.js?v=2ce4b858cdb4';
import { mountLiveKeyboard } from '../../core/live-keyboard.js?v=2ce4b858cdb4';
import { createTransport } from '../../core/transport.js?v=2ce4b858cdb4';
import { noteLabel } from '../../core/scales.js?v=2ce4b858cdb4';
import { SYNTH_ROWS, synthPosition, restoreSynth, noteAt, putNote, activeSynthNotes } from './synth-sequence.js?v=2ce4b858cdb4';
document.title = 'Синтезатор — волны и ноты';
document.body.classList.add('tenorion-mode');
element('main', HTMLElement).outerHTML = `
<main class="tenorion synth" aria-labelledby="title">
  <header class="heading"><h1 id="title">Синтезатор</h1></header>
  <div class="sequencer-controls">
    <button id="play" type="button" aria-pressed="false">▶ Играть</button>
    <select id="sound" aria-label="Звук"><option value="pad">Мягкий синт</option><option value="bass">808 бас</option><option value="lead">Лид</option></select>
    <label class="tempo"><input id="tempo" type="number" min="40" max="240" value="110" aria-label="Темп в ударах в минуту"></label>
    <button id="clear" type="button" aria-label="Очистить текущую секцию">Сброс</button>
  </div>
  <div class="synth-tools">
    <label>Длина <select id="length" aria-label="Длина ноты в шагах">${[1, 2, 4, 8, 16].map(n => `<option value="${n}"${n === 4 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="wave-control">Волна <select id="waveform" aria-label="Форма волны"><option value="sine">Синус</option><option value="triangle">Треугольник</option><option value="sawtooth">Пила</option><option value="square">Прямоугольник</option></select></label>
    <label>Октава <input id="octave" type="number" min="-2" max="2" value="0" aria-label="Сдвиг октавы"></label>
  </div>
  <div class="section-controls" role="group" aria-label="Четыре секции по 16 шагов"><span>Секции</span>${[1, 2, 3, 4].map(n => `<button type="button" data-section="${n - 1}" aria-label="Секция ${n}">${n}</button>`).join('')}</div>
  <div class="light-grid synth-grid" role="group" aria-label="Ноты синтезатора"></div>
  <p class="sequencer-hint">Нажми — нота · протяни — длина · повторно — удалить</p>
</main>`;
const controls = {
    play: byId('play', HTMLButtonElement), clear: byId('clear', HTMLButtonElement),
    sound: byId('sound', HTMLSelectElement), waveform: byId('waveform', HTMLSelectElement),
    octave: byId('octave', HTMLInputElement), tempo: byId('tempo', HTMLInputElement), length: byId('length', HTMLSelectElement),
};
const $ = (id) => controls[id];
const grid = element('.synth-grid', HTMLDivElement);
const stateKey = widgetStorageKey('synth-sequence-v1');
const state = restoreSynth(readStored(stateKey, null, { validate: (saved) => restoreSynth(saved, { strict: true }) !== null }));
$('sound').value = state.sound;
$('waveform').value = state.waveform;
$('octave').value = String(state.octave);
$('length').value = String(state.length);
function save() { writeStored(stateKey, state); }
let context, master, running = false, playing = null;
const voices = new Set(), cells = [], labels = [];
function audioContext() {
    if (!context) {
        context = createAudioContext();
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.ratio.value = 6;
        master = context.createGain();
        master.gain.value = 0.4;
        master.connect(compressor).connect(context.destination);
    }
    return context;
}
async function ensureAudio() { await audioContext().resume(); }
function release(voice) { if (context)
    releaseVoice(context, voice); }
function sound(midi, time, duration = null, live = false) {
    const voice = synthVoice(context, master, { ...state }, midi, time, duration, live);
    if (!voice)
        return null;
    voices.add(voice);
    voice.source.onended = () => { voices.delete(voice); voice.source.disconnect(); voice.gain.disconnect(); voice.filter.disconnect(); };
    return voice;
}
function resetSchedule() {
    if (!running)
        return;
    scheduler.reset();
    for (const voice of voices)
        if (!voice.live) {
            voice.source.stop(context.currentTime);
        }
}
const transport = createTransport(next => { $('tempo').value = String(next.bpm); resetSchedule(); }, () => { });
$('tempo').value = String(transport.state.bpm);
function pitchOffset() { return state.octave * 12 + ($('sound').value === 'bass' ? -24 : 0); }
function pitch(row) { return 60 + 15 - row + pitchOffset(); }
for (let row = 0; row < SYNTH_ROWS; row++) {
    const label = document.createElement('span');
    label.className = 'row-note';
    grid.append(label);
    labels.push(label);
    for (let column = 0; column < 16; column++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'synth-cell';
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        cell.tabIndex = row === 0 && column === 0 ? 0 : -1;
        grid.append(cell);
        cells.push(cell);
        cell.addEventListener('click', event => { if (event.detail === 0)
            edit(row, column); });
        cell.addEventListener('keydown', event => {
            const offset = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
            if (!offset)
                return;
            event.preventDefault();
            const next = at(cells, ((row + offset[0] + 16) % 16) * 16 + (column + offset[1] + 16) % 16);
            cell.tabIndex = -1;
            next.tabIndex = 0;
            next.focus();
        });
    }
}
function edit(row, column, length = null) {
    const notes = at(state.sections, state.selected), existing = noteAt(notes, row, column);
    if (length === null && existing)
        state.sections[state.selected] = notes.filter(note => note !== existing);
    else
        state.sections[state.selected] = putNote(notes, row, column, length ?? Number($('length').value));
    save();
    render();
    resetSchedule();
}
let drag = null;
grid.addEventListener('pointerdown', event => {
    const cell = targetElement(event)?.closest('.synth-cell');
    if (!cell || event.button !== 0)
        return;
    event.preventDefault();
    cell.focus();
    grid.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, row: Number(cell.dataset.row), start: Number(cell.dataset.column), end: Number(cell.dataset.column) };
});
grid.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId)
        return;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.synth-cell');
    if (cell && Number(cell.dataset.row) === drag.row)
        drag.end = Number(cell.dataset.column);
});
grid.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId)
        return;
    const gesture = drag;
    drag = null;
    if (gesture.end === gesture.start)
        edit(gesture.row, gesture.start);
    else
        edit(gesture.row, Math.min(gesture.start, gesture.end), Math.abs(gesture.end - gesture.start) + 1);
});
for (const type of ['pointercancel', 'lostpointercapture'])
    grid.addEventListener(type, () => { drag = null; });
function render() {
    document.querySelectorAll('[data-section]').forEach(button => {
        const section = Number(button.dataset.section);
        button.setAttribute('aria-pressed', String(state.selected === section));
        button.classList.toggle('is-playing', playing?.section === section);
    });
    labels.forEach((label, row) => { label.textContent = noteLabel(pitch(row)); });
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 16), column = index % 16, note = noteAt(at(state.sections, state.selected), row, column);
        cell.classList.toggle('is-on', !!note);
        cell.classList.toggle('note-start', note?.start === column);
        cell.classList.toggle('note-end', !!note && note.start + note.length - 1 === column);
        cell.classList.toggle('is-step', playing?.section === state.selected && playing.column === column);
        cell.setAttribute('aria-pressed', String(!!note));
        cell.setAttribute('aria-label', `${noteLabel(pitch(row))}, шаг ${column + 1}${note ? `, нота ${note.length} шагов` : ''}`);
    });
}
document.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => { drag = null; state.selected = Number(button.dataset.section); save(); render(); }));
const panel = mountSynthPanel(state, (key, value) => {
    save();
    if (context)
        for (const voice of voices)
            updateSynthVoice(context, voice, key, value);
});
element('.sequencer-hint', HTMLParagraphElement).textContent = 'Нажми — нота · протяни — длина · Пульт — настройки звука';
const player = mountLiveKeyboard({ controlPanel: panel.panel, onHighlight: (key, active) => panel.highlight(key, active, noteLabel(key.midi + pitchOffset())), async onNoteOn(key) { await ensureAudio(); return sound(key.midi + pitchOffset(), context.currentTime, null, true); }, onNoteOff: voice => release(voice), labelFor: key => noteLabel(key.midi + pitchOffset()) });
const scheduler = createScheduler({
    onError() { stop(); $('play').textContent = 'Повторить'; },
    context: () => context, transport: () => transport.state,
    onStep({ step, time, first }) {
        const position = synthPosition(step);
        const notes = first ? activeSynthNotes(state, step) : at(state.sections, position.section).filter(note => note.start === position.column).map(note => ({ ...note, remaining: note.length }));
        for (const note of notes)
            sound(pitch(note.row), time, note.remaining * 15 / transport.state.bpm);
    },
    onVisual(step) { playing = synthPosition(step); render(); },
});
function stop() {
    playback.cancelStart();
    running = false;
    scheduler.stop();
    if (context)
        for (const voice of voices)
            if (!voice.live)
                voice.source.stop(context.currentTime);
    playing = null;
    render();
    $('play').textContent = '▶ Играть';
    $('play').setAttribute('aria-pressed', 'false');
}
const playback = bindPlayback($('play'), {
    prepare: ensureAudio, isRunning: () => running, stop,
    start() { transport.refresh(); running = true; scheduler.start(); },
});
$('tempo').addEventListener('change', () => { const bpm = Math.min(240, Math.max(40, Number($('tempo').value) || 110)); $('tempo').value = String(bpm); transport.setTempo(bpm); });
$('clear').addEventListener('click', () => { state.sections[state.selected] = []; save(); render(); resetSchedule(); });
$('octave').addEventListener('change', () => { state.octave = Math.min(2, Math.max(-2, Math.round(Number($('octave').value) || 0))); $('octave').value = String(state.octave); save(); render(); player.refreshLabels(); resetSchedule(); });
$('sound').addEventListener('change', () => { const sound = $('sound').value; if (!isSynthSound(sound))
    return; state.sound = sound; state.waveform = DEFAULT_WAVE[state.sound]; $('waveform').value = state.waveform; Object.assign(state, state.sound === 'bass' ? { attack: .003, decay: 4, sustain: .083, release: .35 } : { attack: .015, decay: .4, sustain: .7, release: .35 }); panel.refresh(); save(); render(); player.refreshLabels(); resetSchedule(); });
$('waveform').addEventListener('change', () => { const wave = $('waveform').value; if (!isWaveform(wave))
    return; state.waveform = wave; save(); if (context)
    for (const voice of voices)
        updateSynthVoice(context, voice, 'waveform', state.waveform); });
$('length').addEventListener('change', () => { state.length = Number($('length').value); save(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) {
    transport.refresh();
    resetSchedule();
} });
window.addEventListener('pagehide', event => { stop(); if (!event.persisted)
    transport.close(); });
render();
