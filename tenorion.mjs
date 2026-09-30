import { createSections, mountSections, sectionPosition } from "./sections.mjs?v=10";
import { widgetStorageKey } from "./widget-storage.mjs?v=8";
import { mountLiveKeyboard } from "./live-keyboard.mjs?v=6";
import { createTransport, boundaryAfter, wallTime } from "./transport.mjs?v=2";
import { SCALES, pitchForRow, noteLabel } from "./scales.mjs?v=4";
export const SIZE = 16;
export function rowMidi(row, settings) { return pitchForRow(row, settings); }
export function stepDuration(bpm) { return 60 / bpm / 4; }

if (typeof document !== "undefined") {
  document.title = "Tenori-on — световая музыка";
  document.body.classList.add("tenorion-mode");
  document.querySelector("main").outerHTML = `
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
  const grid = document.querySelector(".light-grid");
  const play = document.getElementById("play");
  const tempo = document.getElementById("tempo");
  const instrument = document.getElementById("instrument");
  const scaleControl = document.getElementById("scale");
  const transposeControl = document.getElementById("transpose");
  const octaveControl = document.getElementById("octave");
  let harmony = { scale: "pentatonic", transpose: 0, octave: 0 };
  const harmonyKey = widgetStorageKey("tenorion-harmony-v1");
  for (const storageName of ["sessionStorage", "localStorage"]) {
    try {
      const saved = JSON.parse(window[storageName].getItem(harmonyKey));
      if (saved && Object.hasOwn(SCALES, saved.scale) && Number.isInteger(saved.transpose) && Math.abs(saved.transpose) <= 12
        && Number.isInteger(saved.octave) && Math.abs(saved.octave) <= 2) { harmony = saved; break; }
    } catch {}
  }
  scaleControl.value = harmony.scale;
  transposeControl.value = harmony.transpose;
  octaveControl.value = harmony.octave;
  const instrumentKey = widgetStorageKey("tenorion-instrument-v1");
  for (const storageName of ["sessionStorage", "localStorage"]) {
    try {
      const saved = window[storageName].getItem(instrumentKey);
      if (["bell", "keys", "pluck", "pad"].includes(saved)) { instrument.value = saved; break; }
    } catch {}
  }
  instrument.addEventListener("change", () => {
    try { sessionStorage.setItem(instrumentKey, instrument.value); } catch {}
    try { localStorage.setItem(instrumentKey, instrument.value); } catch {}
  });
  const sequence = createSections("tenorion", SIZE);
  function savePattern() { sequence.save(); }
  const cells = [];
  const voices = new Set();
  const visuals = new Set();
  let context, master, timer, running = false, starting = false, cursor = 0;
  let transport;
  function resetSchedule() {
    if (!running) return;
    for (const visual of visuals) clearTimeout(visual);
    visuals.clear();
    for (const voice of voices) if (voice.time > context.currentTime) voice.oscillator.stop();
    cursor = wallTime() + 35;
  }
  transport = createTransport(state => {
    tempo.value = state.bpm;
    resetSchedule();
  }, () => {});
  tempo.value = transport.state.bpm;

  function setCell(row, column, enabled) {
    sequence.pattern[row][column] = enabled;
    const cell = cells[row * SIZE + column];
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
      cell.dataset.column = column;
      cell.setAttribute("aria-label", `Шаг ${column + 1}, нота ${noteName}`);
      cell.setAttribute("aria-pressed", "false");
      cell.tabIndex = row === 0 && column === 0 ? 0 : -1;
      cell.addEventListener("click", () => {
        setCell(row, column, !sequence.pattern[row][column]);
        savePattern();
        for (const item of cells) item.tabIndex = -1;
        cell.tabIndex = 0;
      });
      cell.addEventListener("keydown", event => {
        const offsets = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
        const offset = offsets[event.key];
        if (!offset) return;
        event.preventDefault();
        const target = cells[((row + offset[0] + SIZE) % SIZE) * SIZE + (column + offset[1] + SIZE) % SIZE];
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
      scale: scaleControl.value,
      transpose: Math.min(12, Math.max(-12, Math.round(Number(transposeControl.value) || 0))),
      octave: Math.min(2, Math.max(-2, Math.round(Number(octaveControl.value) || 0))),
    };
    transposeControl.value = harmony.transpose;
    octaveControl.value = harmony.octave;
    const labels = grid.querySelectorAll(".row-note");
    for (let row = 0; row < SIZE; row++) {
      const name = noteLabel(rowMidi(row, harmony));
      labels[row].textContent = name;
      for (let column = 0; column < SIZE; column++) cells[row * SIZE + column].setAttribute("aria-label", `Шаг ${column + 1}, нота ${name}`);
    }
    const saved = JSON.stringify(harmony);
    try { sessionStorage.setItem(harmonyKey, saved); } catch {}
    try { localStorage.setItem(harmonyKey, saved); } catch {}
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
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (!master) { master = context.createGain(); master.gain.value = 0.65; master.connect(context.destination); }
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
    const preset = presets[instrument.value];
    oscillator.type = preset.type;
    if (preset.harmonics) oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(preset.harmonics.length + 1), new Float32Array([0, ...preset.harmonics])));
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + preset.attack);
    if (live) gain.gain.exponentialRampToValueAtTime(level * 0.3, time + 2);
    else gain.gain.exponentialRampToValueAtTime(0.0001, time + preset.decay);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = instrument.value === "pluck" ? 1800 : 7000;
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(time);
    if (!live) oscillator.stop(time + preset.decay + 0.05);
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
      if (!voice) return;
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.12);
      voice.oscillator.stop(context.currentTime + 0.75);
    },
    labelFor: key => noteLabel(key.midi + harmony.transpose + harmony.octave * 12),
  });
  function schedule() {
    const now = wallTime();
    cursor = Math.max(cursor, now + 10);
    while (true) {
      const boundary = boundaryAfter(transport.state, cursor);
      if (boundary.time > now + 200) break;
      const nextTime = context.currentTime + (boundary.time - now) / 1000;
      const position = sectionPosition(boundary.step);
      const { section, column } = position;
      const rows = sequence.state.patterns[section].flatMap((row, index) => row[column] ? [index] : []);
      for (const row of rows) soundMidi(rowMidi(row, harmony), nextTime, 0.22 / Math.max(1, rows.length));
      const visual = setTimeout(() => {
        visuals.delete(visual);
        sectionView.showStep(position);
      }, Math.max(0, (nextTime - context.currentTime) * 1000));
      visuals.add(visual);
      cursor = boundary.time + 1;
    }
  }
  function stop() {
    running = false;
    clearInterval(timer);
    for (const visual of visuals) clearTimeout(visual);
    visuals.clear();
    for (const voice of voices) {
      if (voice.live) continue;
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.015);
      voice.oscillator.stop(context.currentTime + 0.05);
    }
    sectionView.stop();
    play.textContent = "▶ Играть";
    play.setAttribute("aria-pressed", "false");
  }
  play.addEventListener("click", async () => {
    if (starting) return;
    if (running) return stop();
    starting = true;
    play.disabled = true;
    try {
      await ensureAudio();
      running = true;
      transport.refresh();
      cursor = wallTime() + 35;
      play.textContent = "■ Стоп";
      play.setAttribute("aria-pressed", "true");
      schedule();
      timer = setInterval(schedule, 25);
    } catch {
      play.textContent = "Повторить";
    } finally { starting = false; play.disabled = false; }
  });
  function updateTempo() {
    const bpm = Math.min(240, Math.max(40, Number(tempo.value) || 110));
    tempo.value = bpm;
    if (bpm !== transport.state.bpm) transport.setTempo(bpm);
  }
  tempo.addEventListener("change", updateTempo);
  tempo.addEventListener("blur", updateTempo);
  document.getElementById("clear").addEventListener("click", () => {
    stop();
    for (let row = 0; row < SIZE; row++) for (let column = 0; column < SIZE; column++) setCell(row, column, false);
    savePattern();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { transport.refresh(); resetSchedule(); }
  });
  window.addEventListener("pagehide", stop);
}
