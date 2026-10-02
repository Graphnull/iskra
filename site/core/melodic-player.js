import { pianoTone } from "./piano-tone.js?v=f1d1aaff72ac";
import { audioContext } from "./dom.js?v=f1d1aaff72ac";
import { createObservable } from "./observable.js?v=f1d1aaff72ac";
import { createSequencerEngine } from "./sequencer-engine.js?v=f1d1aaff72ac";
import { sectionPosition } from "./sections.js?v=f1d1aaff72ac";
import { at } from "./guards.js?v=f1d1aaff72ac";
import { widgetStorageKey } from "./widget-storage.js?v=f1d1aaff72ac";
import { readStored, writeStored } from "./storage.js?v=f1d1aaff72ac";
import { noteAt, putNote, restoreMelodic } from "./melodic-sequence.js?v=f1d1aaff72ac";
import { pluckedBuffer } from "./plucked-string.js?v=f1d1aaff72ac";
export function createMelodicPlayer(instrument) {
    const observable = createObservable();
    const key = widgetStorageKey(`${instrument}-sequence-v1`);
    const state = restoreMelodic(readStored(key, null, {
        validate: (saved) => restoreMelodic(saved) !== null,
    })) ?? { version: 1, selected: 0, octave: 0, sections: [[], [], [], []] };
    let context, master;
    let playing = null;
    const voices = new Set();
    const pitch = (row) => (instrument === "piano" ? 60 : 40) + 15 - row + state.octave * 12;
    function stop() {
        for (const source of voices)
            source.stop();
        voices.clear();
    }
    function save() {
        writeStored(key, state);
        observable.notify();
    }
    function sound(midi, time, duration) {
        if (!context)
            return;
        const audio = context;
        if (instrument === "piano") {
            const voice = pianoTone(audio, master, 440 * 2 ** ((midi - 69) / 12), time);
            voice.release.gain.setValueAtTime(1, time + duration);
            voice.release.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.75);
            for (const source of voice.oscillators) {
                voices.add(source);
                const ended = source.onended;
                source.onended = (event) => {
                    ended?.call(source, event);
                    voices.delete(source);
                };
                source.stop(time + duration + 0.77);
            }
            return;
        }
        const gain = audio.createGain();
        gain.connect(master);
        const source = audio.createBufferSource();
        source.buffer = pluckedBuffer(audio, midi, 0.8, Math.max(4, duration + 0.3));
        source.connect(gain);
        gain.gain.setValueAtTime(1, time);
        gain.gain.setValueAtTime(1, time + duration);
        gain.gain.linearRampToValueAtTime(0, time + duration + 0.25);
        const sources = [source];
        let remaining = sources.length;
        for (const source of sources) {
            voices.add(source);
            const ended = source.onended;
            source.onended = (event) => {
                ended?.call(source, event);
                voices.delete(source);
                source.disconnect();
                if (--remaining === 0)
                    gain.disconnect();
            };
            source.start(time);
            source.stop(time + duration + 0.26);
        }
    }
    const engine = createSequencerEngine({
        context: () => {
            if (!context)
                throw new Error("Audio is not ready");
            return context;
        },
        async prepare() {
            if (!context || context.state === "closed") {
                context = audioContext();
                master = context.createGain();
                master.gain.value = 0.5;
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.value = -16;
                compressor.ratio.value = 6;
                master.connect(compressor).connect(context.destination);
            }
            await context.resume();
        },
        onChange: observable.notify,
        onStep({ step, time, first }) {
            const { section, column } = sectionPosition(step);
            for (const note of at(state.sections, section)) {
                if (note.start === column ||
                    (first && note.start < column && note.start + note.length > column))
                    sound(pitch(note.row), time, ((note.start + note.length - column) * 15) / engine.bpm);
            }
        },
        onVisual(step) {
            const next = sectionPosition(step);
            if (playing?.section !== next.section)
                state.selected = next.section;
            playing = next;
            observable.notify();
        },
        onReset: stop,
        onStop: stop,
    });
    return {
        ...observable,
        state,
        engine,
        pitch,
        get playing() {
            return playing;
        },
        select(section) {
            if (!Number.isInteger(section) || section < 0 || section > 3)
                return;
            state.selected = section;
            save();
        },
        setOctave(value) {
            if (!Number.isFinite(value))
                return;
            state.octave = Math.max(-2, Math.min(2, Math.round(value)));
            save();
            engine.reset();
        },
        edit(row, column, length) {
            if (!Number.isInteger(row) ||
                row < 0 ||
                row > 15 ||
                !Number.isInteger(column) ||
                column < 0 ||
                column > 15 ||
                (length !== undefined && (!Number.isInteger(length) || length < 1)))
                return;
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
        connect() {
            const disconnect = engine.connect();
            return () => {
                disconnect();
                stop();
                if (context && context.state !== "closed")
                    void context.close();
            };
        },
    };
}
