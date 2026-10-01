import { audioContext } from "../../core/dom.js";
import { at, isRecord, isInteger } from "../../core/guards.js";
import { createObservable } from "../../core/observable.js";
import { createSequencerEngine } from "../../core/sequencer-engine.js";
import { readStored, writeStored } from "../../core/storage.js";
import { createSections, sectionPosition } from "../../core/sections.js";
import { widgetStorageKey } from "../../core/widget-storage.js";
import { isScaleId, pitchForRow, noteLabel } from "../../core/scales.js";
import type { Harmony } from "../../core/scales.js";
import type { Position } from "../../core/sections.js";
import type { PianoKey } from "../../core/keyboard-map.js";
export type Instrument = "bell" | "keys" | "pluck" | "pad";
const validInstrument = (value: unknown): value is Instrument =>
  typeof value === "string" && ["bell", "keys", "pluck", "pad"].includes(value);
const validHarmony = (value: unknown): value is Harmony =>
  isRecord(value) &&
  isScaleId(value.scale) &&
  isInteger(value.transpose) &&
  Math.abs(value.transpose) <= 12 &&
  isInteger(value.octave) &&
  Math.abs(value.octave) <= 2;
export const SIZE = 16;
export function rowMidi(row: number, settings?: Partial<Harmony>) {
  return pitchForRow(row, settings);
}
export function stepDuration(bpm: number) {
  return 60 / bpm / 4;
}
interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
  time: number;
  live: boolean;
}
const PRESETS: Record<
  Instrument,
  { type: OscillatorType; attack: number; decay: number; harmonics?: number[] }
> = {
  bell: {
    type: "sine",
    attack: 0.008,
    decay: 0.85,
    harmonics: [1, 0, 0.3, 0, 0.12],
  },
  keys: { type: "triangle", attack: 0.012, decay: 0.65 },
  pluck: { type: "sawtooth", attack: 0.004, decay: 0.25 },
  pad: {
    type: "sine",
    attack: 0.09,
    decay: 1.2,
    harmonics: [1, 0.3, 0.14, 0.06],
  },
};
export function createTenorion() {
  const observable = createObservable(),
    sequence = createSections("tenorion", SIZE),
    voices = new Set<Voice>();
  const harmonyKey = widgetStorageKey("tenorion-harmony-v1"),
    instrumentKey = widgetStorageKey("tenorion-instrument-v1");
  let harmony: Harmony = readStored(
    harmonyKey,
    { scale: "pentatonic", transpose: 0, octave: 0 },
    { validate: validHarmony },
  );
  let instrument: Instrument = readStored(instrumentKey, "bell", {
    raw: true,
    validate: validInstrument,
  });
  let context: AudioContext,
    master: GainNode,
    playing: Position | null = null;
  let disposed = false;
  let lifecycle = 0;
  async function ensureAudio() {
    if (!context || context.state === "closed") context = audioContext();
    if (!master || master.context !== context) {
      master = context.createGain();
      master.gain.value = 0.65;
      master.connect(context.destination);
    }
    await context.resume();
  }
  function soundMidi(midi: number, time: number, level: number, live = false) {
    const oscillator = context.createOscillator(),
      gain = context.createGain(),
      preset = PRESETS[instrument];
    oscillator.type = preset.type;
    if (preset.harmonics)
      oscillator.setPeriodicWave(
        context.createPeriodicWave(
          new Float32Array(preset.harmonics.length + 1),
          new Float32Array([0, ...preset.harmonics]),
        ),
      );
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + preset.attack);
    gain.gain.exponentialRampToValueAtTime(
      live ? level * 0.3 : 0.0001,
      time + (live ? 2 : preset.decay),
    );
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = instrument === "pluck" ? 1800 : 7000;
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(time);
    if (!live) oscillator.stop(time + preset.decay + 0.05);
    const voice = { oscillator, gain, time, live };
    voices.add(voice);
    oscillator.onended = () => {
      voices.delete(voice);
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    return voice;
  }
  function release(voice: Voice | undefined) {
    if (!voice || !context) return;
    voice.gain.gain.cancelScheduledValues(context.currentTime);
    voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.12);
    voice.oscillator.stop(context.currentTime + 0.75);
  }
  const engine = createSequencerEngine({
    prepare: ensureAudio,
    context: () => context,
    onChange: observable.notify,
    onStep({ step, time }) {
      const { section, column } = sectionPosition(step);
      const rows = at(sequence.state.patterns, section).flatMap((row, index) =>
        row[column] ? [index] : [],
      );
      for (const row of rows)
        soundMidi(rowMidi(row, harmony), time, 0.22 / Math.max(1, rows.length));
    },
    onVisual(step) {
      playing = sectionPosition(step);
      observable.notify();
    },
    onReset() {
      for (const voice of voices)
        if (voice.time > context.currentTime && !voice.live)
          voice.oscillator.stop();
    },
    onStop() {
      playing = null;
      if (context)
        for (const voice of voices)
          if (!voice.live) {
            voice.gain.gain.cancelScheduledValues(context.currentTime);
            voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.015);
            voice.oscillator.stop(context.currentTime + 0.05);
          }
    },
  });
  return {
    ...observable,
    engine,
    sequence,
    get harmony() {
      return harmony;
    },
    get instrument() {
      return instrument;
    },
    get playing() {
      return playing;
    },
    connect() {
      disposed = false;
      lifecycle++;
      sequence.save();
      const disconnect = engine.connect();
      return () => {
        disposed = true;
        lifecycle++;
        disconnect();
        for (const voice of voices) release(voice);
        voices.clear();
        if (context && context.state !== "closed") void context.close();
      };
    },
    select(section: number) {
      sequence.state.selected = section;
      sequence.save();
      observable.notify();
    },
    edit(row: number, column: number) {
      const notes = at(sequence.pattern, row);
      notes[column] = !notes[column];
      sequence.save();
      observable.notify();
    },
    clear() {
      engine.stop();
      for (const row of sequence.pattern) row.fill(false);
      sequence.save();
      observable.notify();
    },
    setInstrument(value: string) {
      if (!validInstrument(value)) return;
      instrument = value;
      writeStored(instrumentKey, instrument, { raw: true });
      observable.notify();
    },
    setHarmony(next: Harmony) {
      if (!validHarmony(next)) return;
      harmony = { ...next };
      writeStored(harmonyKey, harmony);
      engine.reset();
      observable.notify();
    },
    labelFor: (key: PianoKey) =>
      noteLabel(key.midi + harmony.transpose + harmony.octave * 12),
    async onNoteOn(key: PianoKey) {
      if (disposed) return;
      const activeLifecycle = lifecycle;
      await ensureAudio();
      if (disposed || activeLifecycle !== lifecycle) return;
      return soundMidi(
        key.midi + harmony.transpose + harmony.octave * 12,
        context.currentTime,
        0.16,
        true,
      );
    },
    onNoteOff: release,
  };
}
