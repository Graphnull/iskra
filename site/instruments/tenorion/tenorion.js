import { audioContext } from "../../core/dom.js?v=c53522026b7d";
import { at, isRecord, isInteger } from "../../core/guards.js?v=c53522026b7d";
import { createObservable } from "../../core/observable.js?v=c53522026b7d";
import { createSequencerEngine } from "../../core/sequencer-engine.js?v=c53522026b7d";
import { readStored, writeStored } from "../../core/storage.js?v=c53522026b7d";
import { createSections, sectionPosition } from "../../core/sections.js?v=c53522026b7d";
import { widgetStorageKey } from "../../core/widget-storage.js?v=c53522026b7d";
import { isScaleId, pitchForRow, noteLabel } from "../../core/scales.js?v=c53522026b7d";
const validInstrument = (value) => typeof value === "string" && ["bell", "keys", "pluck", "pad"].includes(value);
const validHarmony = (value) => isRecord(value) &&
    isScaleId(value.scale) &&
    isInteger(value.transpose) &&
    Math.abs(value.transpose) <= 12 &&
    isInteger(value.octave) &&
    Math.abs(value.octave) <= 2;
export const SIZE = 16;
export function rowMidi(row, settings) {
    return pitchForRow(row, settings);
}
export function stepDuration(bpm) {
    return 60 / bpm / 4;
}
const PRESETS = {
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
    const observable = createObservable(), sequence = createSections("tenorion", SIZE), voices = new Set();
    const harmonyKey = widgetStorageKey("tenorion-harmony-v1"), instrumentKey = widgetStorageKey("tenorion-instrument-v1");
    let harmony = readStored(harmonyKey, { scale: "pentatonic", transpose: 0, octave: 0 }, { validate: validHarmony });
    let instrument = readStored(instrumentKey, "bell", {
        raw: true,
        validate: validInstrument,
    });
    let context, master, playing = null;
    let disposed = false;
    let lifecycle = 0;
    async function ensureAudio() {
        if (!context || context.state === "closed")
            context = audioContext();
        if (!master || master.context !== context) {
            master = context.createGain();
            master.gain.value = 0.65;
            master.connect(context.destination);
        }
        await context.resume();
    }
    function soundMidi(midi, time, level, live = false) {
        const oscillator = context.createOscillator(), gain = context.createGain(), preset = PRESETS[instrument];
        oscillator.type = preset.type;
        if (preset.harmonics)
            oscillator.setPeriodicWave(context.createPeriodicWave(new Float32Array(preset.harmonics.length + 1), new Float32Array([0, ...preset.harmonics])));
        oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level, time + preset.attack);
        gain.gain.exponentialRampToValueAtTime(live ? level * 0.3 : 0.0001, time + (live ? 2 : preset.decay));
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = instrument === "pluck" ? 1800 : 7000;
        oscillator.connect(filter).connect(gain).connect(master);
        oscillator.start(time);
        if (!live)
            oscillator.stop(time + preset.decay + 0.05);
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
    function release(voice) {
        if (!voice || !context)
            return;
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
            const rows = at(sequence.state.patterns, section).flatMap((row, index) => row[column] ? [index] : []);
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
                for (const voice of voices)
                    release(voice);
                voices.clear();
                if (context && context.state !== "closed")
                    void context.close();
            };
        },
        select(section) {
            sequence.state.selected = section;
            sequence.save();
            observable.notify();
        },
        edit(row, column) {
            const notes = at(sequence.pattern, row);
            notes[column] = !notes[column];
            sequence.save();
            observable.notify();
        },
        clear() {
            engine.stop();
            for (const row of sequence.pattern)
                row.fill(false);
            sequence.save();
            observable.notify();
        },
        setInstrument(value) {
            if (!validInstrument(value))
                return;
            instrument = value;
            writeStored(instrumentKey, instrument, { raw: true });
            observable.notify();
        },
        setHarmony(next) {
            if (!validHarmony(next))
                return;
            harmony = { ...next };
            writeStored(harmonyKey, harmony);
            engine.reset();
            observable.notify();
        },
        labelFor: (key) => noteLabel(key.midi + harmony.transpose + harmony.octave * 12),
        async onNoteOn(key) {
            if (disposed)
                return;
            const activeLifecycle = lifecycle;
            await ensureAudio();
            if (disposed || activeLifecycle !== lifecycle)
                return;
            return soundMidi(key.midi + harmony.transpose + harmony.octave * 12, context.currentTime, 0.16, true);
        },
        onNoteOff: release,
    };
}
