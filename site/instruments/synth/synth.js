import { audioContext as createAudioContext } from "../../core/dom.js?v=6afdd2300d9b";
import { at } from "../../core/guards.js?v=6afdd2300d9b";
import { createObservable } from "../../core/observable.js?v=6afdd2300d9b";
import { createSequencerEngine } from "../../core/sequencer-engine.js?v=6afdd2300d9b";
import { isSynthSound, isFilterType, isWaveform, DEFAULT_WAVE, synthPosition, restoreSynth, noteAt, putNote, activeSynthNotes, } from "./synth-sequence.js?v=6afdd2300d9b";
import { readStored, writeStored } from "../../core/storage.js?v=6afdd2300d9b";
import { synthVoice, releaseVoice, updateSynthVoice, updateVoiceFilter, } from "./synth-audio.js?v=6afdd2300d9b";
import { widgetStorageKey } from "../../core/widget-storage.js?v=6afdd2300d9b";
import { noteLabel } from "../../core/scales.js?v=6afdd2300d9b";
export function createSynth() {
    const observable = createObservable(), stateKey = widgetStorageKey("synth-sequence-v1");
    const state = restoreSynth(readStored(stateKey, null, {
        validate: (saved) => restoreSynth(saved, { strict: true }) !== null,
    }));
    const voices = new Set();
    let context, master, playing = null;
    let disposed = false;
    let lifecycle = 0;
    function save() {
        writeStored(stateKey, state);
        observable.notify();
    }
    function audio() {
        if (!context || context.state === "closed") {
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
    async function ensureAudio() {
        await audio().resume();
    }
    function pitchOffset() {
        return state.octave * 12 + (state.sound === "bass" ? -24 : 0);
    }
    function pitch(row) {
        return 60 + 15 - row + pitchOffset();
    }
    function release(voice) {
        if (context)
            releaseVoice(context, voice);
    }
    function sound(midi, time, duration = null, live = false) {
        const voice = synthVoice(context, master, state, midi, time, duration, live);
        if (!voice)
            return null;
        voices.add(voice);
        voice.source.onended = () => {
            voices.delete(voice);
            voice.source.disconnect();
            voice.gain.disconnect();
            voice.filter.disconnect();
        };
        return voice;
    }
    function stopSequenced() {
        if (context)
            for (const voice of voices)
                if (!voice.live)
                    voice.source.stop(context.currentTime);
    }
    const engine = createSequencerEngine({
        prepare: ensureAudio,
        context: () => context,
        onChange: observable.notify,
        onStep({ step, time, first }) {
            const position = synthPosition(step);
            const notes = first
                ? activeSynthNotes(state, step)
                : at(state.sections, position.section)
                    .filter((note) => note.start === position.column)
                    .map((note) => ({ ...note, remaining: note.length }));
            for (const note of notes)
                sound(pitch(note.row), time, (note.remaining * 15) / engine.bpm);
        },
        onVisual(step) {
            const position = synthPosition(step);
            if (playing?.section !== position.section)
                state.selected = position.section;
            playing = position;
            observable.notify();
        },
        onReset: stopSequenced,
        onStop() {
            stopSequenced();
            playing = null;
        },
    });
    return {
        ...observable,
        state,
        engine,
        pitch,
        get playing() {
            return playing;
        },
        connect() {
            disposed = false;
            lifecycle++;
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
            state.selected = section;
            save();
        },
        edit(row, column, length) {
            const notes = at(state.sections, state.selected), existing = noteAt(notes, row, column);
            state.sections[state.selected] =
                length === undefined && existing
                    ? notes.filter((note) => note !== existing)
                    : putNote(notes, row, column, length ?? 1);
            save();
            engine.reset();
        },
        clear() {
            state.sections[state.selected] = [];
            save();
            engine.reset();
        },
        setOctave(value) {
            state.octave = Math.min(2, Math.max(-2, Math.round(value)));
            save();
            engine.reset();
        },
        setSound(value) {
            if (!isSynthSound(value))
                return;
            state.sound = value;
            state.waveform = DEFAULT_WAVE[value];
            Object.assign(state, value === "bass"
                ? { attack: 0.003, decay: 4, sustain: 0.083, release: 0.35 }
                : { attack: 0.015, decay: 0.4, sustain: 0.7, release: 0.35 });
            save();
            engine.reset();
        },
        setWaveform(value) {
            if (!isWaveform(value))
                return;
            state.waveform = value;
            if (context)
                for (const voice of voices)
                    updateSynthVoice(context, voice, "waveform", value);
            save();
        },
        setLength(value) {
            if ([1, 2, 4, 8, 16].includes(value)) {
                state.length = value;
                save();
            }
        },
        setFilterType(value) {
            if (!isFilterType(value))
                return;
            state.filterType = value;
            if (context)
                for (const voice of voices)
                    updateVoiceFilter(context, voice, state.filterType, state.filterControl, state.filterAmount);
            save();
        },
        setFilterControl(value) {
            if (value !== "manual" && value !== "adsr")
                return;
            state.filterControl = value;
            if (value === "adsr" && state.filterAmount === 0) {
                state.filterAmount = 0.8;
                state.cutoff = Math.min(state.cutoff, 400);
                if (context)
                    for (const voice of voices)
                        updateSynthVoice(context, voice, "cutoff", state.cutoff);
            }
            if (context)
                for (const voice of voices)
                    updateVoiceFilter(context, voice, state.filterType, state.filterControl, state.filterAmount);
            save();
        },
        filterFrequency() {
            if (!context)
                return state.cutoff;
            let latest;
            for (const voice of voices)
                if (voice.time <= context.currentTime &&
                    (!latest || latest.time < voice.time))
                    latest = voice;
            return latest?.filter.frequency.value ?? state.cutoff;
        },
        setParameter(key, value) {
            state[key] = value;
            if (context)
                for (const voice of voices)
                    updateSynthVoice(context, voice, key, value);
            save();
        },
        labelFor: (key) => noteLabel(key.midi + pitchOffset()),
        async onNoteOn(key) {
            if (disposed)
                return;
            const activeLifecycle = lifecycle;
            await ensureAudio();
            if (disposed || activeLifecycle !== lifecycle)
                return;
            return sound(key.midi + pitchOffset(), context.currentTime, null, true);
        },
        onNoteOff: release,
    };
}
