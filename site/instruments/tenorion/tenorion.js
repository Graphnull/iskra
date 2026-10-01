import { element, byId, audioContext } from '../../core/dom.js?v=2ce4b858cdb4';
import { at, isRecord, isInteger } from '../../core/guards.js?v=2ce4b858cdb4';
const validInstrument = (value) => typeof value === 'string' && ['bell', 'keys', 'pluck', 'pad'].includes(value);
const validHarmony = (value) => isRecord(value) && isScaleId(value.scale) && isInteger(value.transpose) && Math.abs(value.transpose) <= 12 && isInteger(value.octave) && Math.abs(value.octave) <= 2;
import { bindPlayback } from '../../core/playback-control.js?v=2ce4b858cdb4';
import { readStored, writeStored } from '../../core/storage.js?v=2ce4b858cdb4';
import { createScheduler } from '../../core/scheduler.js?v=2ce4b858cdb4';
import { createSections, mountSections, sectionPosition } from "../../core/sections.js?v=2ce4b858cdb4";
import { widgetStorageKey } from "../../core/widget-storage.js?v=2ce4b858cdb4";
import { mountLiveKeyboard } from "../../core/live-keyboard.js?v=2ce4b858cdb4";
import { createTransport } from "../../core/transport.js?v=2ce4b858cdb4";
import { SCALES, isScaleId, pitchForRow, noteLabel } from "../../core/scales.js?v=2ce4b858cdb4";
export const SIZE = 16;
export function rowMidi(row, settings) { return pitchForRow(row, settings); }
export function stepDuration(bpm) { return 60 / bpm / 4; }
if (typeof document !== "undefined") {
    document.title = "Tenori-on — световая музыка";
    document.body.classList.add("tenorion-mode");
    element("main", HTMLElement).outerHTML = `
    <main class="tenorion" aria-labelledby="title">
      <header class="heading"><div><p class="eyebrow">СВЕТОВАЯ МУЗЫКА</p><h1 id="title">Tenori-on</h1></div></header>
      <div class="sequencer-controls">
        <button type="button" id="play" aria-pressed="false">▶ Играть</button>
        <select id="instrument" aria-label="Инструмент"><option value="bell">Колокольчик</option><option value="keys">Электропиано</option><option value="pluck">Щипковый</option><option value="pad">Синтезатор</option></select>
        <label class="tempo"> <input id="tempo" type="number" min="40" max="240" value="110" aria-label="Темп в ударах в минуту"></label>
        <button type="button" id="clear" aria-label="Очистить текущую секцию" title="Очистить текущую секцию">Сброс</button>
      </div>

      <div class="harmony-controls">
        <select id="scale" aria-label="Гамма">${Object.entries(SCALES).map(([id, scale]) => `<option value="${id}">${scale.name}</option>`).join("")}</select>
        <label>Сдвиг <input id="transpose" type="number" min="-12" max="12" value="0" aria-label="Транспозиция в полутонах"></label>
        <label>Октава <input id="octave" type="number" min="-2" max="2" value="0" aria-label="Сдвиг октавы"></label>
      </div>
      <div class="light-grid" role="group" aria-label="Сетка нот: 16 шагов, 16 высот"></div>
      <p class="sequencer-hint">4 секции × 16 шагов · красная точка — играет</p>
    </main>`;
    const grid = element(".light-grid", HTMLDivElement);
    const play = byId("play", HTMLButtonElement);
    const tempo = byId("tempo", HTMLInputElement);
    const instrument = byId("instrument", HTMLSelectElement);
    const scaleControl = byId("scale", HTMLSelectElement);
    const transposeControl = byId("transpose", HTMLInputElement);
    const octaveControl = byId("octave", HTMLInputElement);
    const harmonyKey = widgetStorageKey("tenorion-harmony-v1");
    let harmony = readStored(harmonyKey, { scale: "pentatonic", transpose: 0, octave: 0 }, {
        validate: validHarmony,
    });
    scaleControl.value = String(harmony.scale);
    transposeControl.value = String(harmony.transpose);
    octaveControl.value = String(harmony.octave);
    const instrumentKey = widgetStorageKey("tenorion-instrument-v1");
    instrument.value = readStored(instrumentKey, "bell", { raw: true, validate: validInstrument });
    instrument.addEventListener("change", () => writeStored(instrumentKey, instrument.value, { raw: true }));
    const sequence = createSections("tenorion", SIZE);
    function savePattern() { sequence.save(); }
    const cells = [];
    const voices = new Set();
    let context, master, running = false;
    let transport, scheduler;
    function resetSchedule() {
        if (!running)
            return;
        scheduler?.reset();
        for (const voice of voices)
            if (voice.time > context.currentTime)
                voice.oscillator.stop();
    }
    transport = createTransport(state => {
        tempo.value = String(state.bpm);
        resetSchedule();
    }, () => { });
    tempo.value = String(transport.state.bpm);
    function setCell(row, column, enabled) {
        at(sequence.pattern, row)[column] = enabled;
        const cell = at(cells, row * SIZE + column);
        cell.classList.toggle("is-on", enabled);
        cell.setAttribute("aria-pressed", String(enabled));
    }
    for (let row = 0; row < SIZE; row++) {
        const noteName = noteLabel(rowMidi(row, harmony));
        const label = document.createElement("span");
        label.className = "row-note";
        label.textContent = noteName;
        label.setAttribute("aria-hidden", "true");
        grid.append(label);
        for (let column = 0; column < SIZE; column++) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "light-cell";
            cell.dataset.column = String(column);
            cell.setAttribute("aria-label", `Шаг ${column + 1}, нота ${noteName}`);
            cell.setAttribute("aria-pressed", "false");
            cell.tabIndex = row === 0 && column === 0 ? 0 : -1;
            cell.addEventListener("click", () => {
                setCell(row, column, !at(sequence.pattern, row)[column]);
                savePattern();
                for (const item of cells)
                    item.tabIndex = -1;
                cell.tabIndex = 0;
            });
            cell.addEventListener("keydown", event => {
                const offsets = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
                const offset = offsets[event.key];
                if (!offset)
                    return;
                event.preventDefault();
                const target = at(cells, ((row + offset[0] + SIZE) % SIZE) * SIZE + (column + offset[1] + SIZE) % SIZE);
                cell.tabIndex = -1;
                target.tabIndex = 0;
                target.focus();
            });
            cells.push(cell);
            grid.append(cell);
        }
    }
    function updateHarmony() {
        harmony = {
            scale: isScaleId(scaleControl.value) ? scaleControl.value : "pentatonic",
            transpose: Math.min(12, Math.max(-12, Math.round(Number(transposeControl.value) || 0))),
            octave: Math.min(2, Math.max(-2, Math.round(Number(octaveControl.value) || 0))),
        };
        transposeControl.value = String(harmony.transpose);
        octaveControl.value = String(harmony.octave);
        const labels = grid.querySelectorAll(".row-note");
        for (let row = 0; row < SIZE; row++) {
            const name = noteLabel(rowMidi(row, harmony));
            at(labels, row).textContent = name;
            for (let column = 0; column < SIZE; column++)
                at(cells, row * SIZE + column).setAttribute("aria-label", `Шаг ${column + 1}, нота ${name}`);
        }
        writeStored(harmonyKey, harmony);
        resetSchedule();
        player.refreshLabels();
    }
    scaleControl.addEventListener("change", updateHarmony);
    for (const control of [transposeControl, octaveControl]) {
        control.addEventListener("change", updateHarmony);
        control.addEventListener("blur", updateHarmony);
    }
    const sectionView = mountSections(sequence, grid, cells);
    async function ensureAudio() {
        context ??= audioContext();
        if (!master) {
            master = context.createGain();
            master.gain.value = 0.65;
            master.connect(context.destination);
        }
        await context.resume();
    }
    function soundMidi(midi, time, level, live = false) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const presets = {
            bell: { type: "sine", attack: 0.008, decay: 0.85, harmonics: [1, 0, 0.3, 0, 0.12] },
            keys: { type: "triangle", attack: 0.012, decay: 0.65 },
            pluck: { type: "sawtooth", attack: 0.004, decay: 0.25 },
            pad: { type: "sine", attack: 0.09, decay: 1.2, harmonics: [1, 0.3, 0.14, 0.06] },
        };
        const preset = presets[validInstrument(instrument.value) ? instrument.value : "bell"];
        oscillator.type = preset.type;
        if (preset.harmonics)
            oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(preset.harmonics.length + 1), new Float32Array([0, ...preset.harmonics])));
        oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level, time + preset.attack);
        if (live)
            gain.gain.exponentialRampToValueAtTime(level * 0.3, time + 2);
        else
            gain.gain.exponentialRampToValueAtTime(0.0001, time + preset.decay);
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = instrument.value === "pluck" ? 1800 : 7000;
        oscillator.connect(filter).connect(gain).connect(master);
        oscillator.start(time);
        if (!live)
            oscillator.stop(time + preset.decay + 0.05);
        const voice = { oscillator, gain, time, live };
        voices.add(voice);
        oscillator.onended = () => { voices.delete(voice); oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
        return voice;
    }
    const player = mountLiveKeyboard({
        async onNoteOn(key) {
            await ensureAudio();
            return soundMidi(key.midi + harmony.transpose + harmony.octave * 12, context.currentTime, 0.16, true);
        },
        onNoteOff(voice) {
            if (!voice)
                return;
            voice.gain.gain.cancelScheduledValues(context.currentTime);
            voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.12);
            voice.oscillator.stop(context.currentTime + 0.75);
        },
        labelFor: key => noteLabel(key.midi + harmony.transpose + harmony.octave * 12),
    });
    scheduler = createScheduler({
        onError() { stop(); play.textContent = 'Повторить'; },
        context: () => context, transport: () => transport.state,
        onStep({ step, time }) {
            const { section, column } = sectionPosition(step);
            const rows = at(sequence.state.patterns, section).flatMap((row, index) => row[column] ? [index] : []);
            for (const row of rows)
                soundMidi(rowMidi(row, harmony), time, 0.22 / Math.max(1, rows.length));
        },
        onVisual: step => sectionView.showStep(sectionPosition(step)),
    });
    function stop() {
        playback.cancelStart();
        running = false;
        scheduler.stop();
        for (const voice of voices) {
            if (voice.live)
                continue;
            voice.gain.gain.cancelScheduledValues(context.currentTime);
            voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.015);
            voice.oscillator.stop(context.currentTime + 0.05);
        }
        sectionView.stop();
        play.textContent = "▶ Играть";
        play.setAttribute("aria-pressed", "false");
    }
    const playback = bindPlayback(play, {
        prepare: ensureAudio, isRunning: () => running, stop,
        start() { running = true; transport.refresh(); scheduler.start(); },
    });
    function updateTempo() {
        const bpm = Math.min(240, Math.max(40, Number(tempo.value) || 110));
        tempo.value = String(bpm);
        if (bpm !== transport.state.bpm)
            transport.setTempo(bpm);
    }
    tempo.addEventListener("change", updateTempo);
    tempo.addEventListener("blur", updateTempo);
    byId("clear", HTMLButtonElement).addEventListener("click", () => {
        stop();
        for (let row = 0; row < SIZE; row++)
            for (let column = 0; column < SIZE; column++)
                setCell(row, column, false);
        savePattern();
    });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            transport.refresh();
            resetSchedule();
        }
    });
    window.addEventListener("pagehide", event => { stop(); if (!event.persisted)
        transport.close(); });
}
