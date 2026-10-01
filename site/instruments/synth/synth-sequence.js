import { SECTION_STEPS, sectionPosition } from "../../core/sections.js?v=77f7a8b0c2bf";
import { at, isRecord, isInteger, isNumber } from "../../core/guards.js?v=77f7a8b0c2bf";
export const SYNTH_STEPS = SECTION_STEPS;
export const SYNTH_ROWS = 16;
export const synthPosition = sectionPosition;
export const FILTER_TYPES = {
    lowpass: "Низкие · LP",
    highpass: "Высокие · HP",
    bandpass: "Полоса · BP",
    notch: "Вырез · Notch",
};
export function isFilterType(value) {
    return typeof value === "string" && Object.hasOwn(FILTER_TYPES, value);
}
export const WAVEFORMS = [
    "sine",
    "triangle",
    "sawtooth",
    "square",
];
export function isWaveform(value) {
    return typeof value === "string" && WAVEFORMS.some((wave) => wave === value);
}
export function isSynthSound(value) {
    return value === "pad" || value === "bass" || value === "lead";
}
export const DEFAULT_WAVE = {
    pad: "triangle",
    bass: "sine",
    lead: "square",
};
export function noteAt(notes, row, column) {
    return notes.find((note) => note.row === row &&
        column >= note.start &&
        column < note.start + note.length);
}
export function putNote(notes, row, start, length) {
    const next = { row, start, length: Math.min(length, SYNTH_STEPS - start) };
    return [
        ...notes.filter((note) => note.row !== row ||
            note.start + note.length <= start ||
            note.start >= start + next.length),
        next,
    ];
}
const RANGES = [
    ["cutoff", 20, 10000],
    ["resonance", 0, 12],
    ["attack", 0.003, 2],
    ["decay", 0.02, 8],
    ["sustain", 0, 1],
    ["release", 0.05, 4],
    ["filterAttack", 0.003, 2],
    ["filterDecay", 0.02, 8],
    ["filterSustain", 0, 1],
    ["filterRelease", 0.05, 4],
    ["filterAmount", 0, 1],
];
export function restoreSynth(saved, { strict = false } = {}) {
    const empty = () => ({
        filterType: "lowpass",
        filterControl: "manual",
        version: 2,
        selected: 0,
        octave: 0,
        sound: "pad",
        waveform: "triangle",
        root: 60,
        loop: true,
        length: 4,
        cutoff: 4500,
        resonance: 0.7,
        attack: 0.015,
        decay: 0.4,
        sustain: 0.7,
        release: 0.35,
        filterAttack: 0.015,
        filterDecay: 0.4,
        filterSustain: 0.7,
        filterRelease: 0.35,
        filterAmount: 0,
        sections: [[], [], [], []],
    });
    const fallback = () => (strict ? null : empty());
    if (!isRecord(saved) ||
        (saved.version !== 1 && saved.version !== 2) ||
        !Array.isArray(saved.sections) ||
        saved.sections.length !== 4)
        return fallback();
    const state = empty();
    const oldSteps = saved.version === 1 ? 64 : SYNTH_STEPS;
    for (let section = 0; section < 4; section++) {
        const notes = saved.sections[section];
        if (!Array.isArray(notes) || notes.length > SYNTH_ROWS * oldSteps)
            return fallback();
        const candidates = notes;
        for (const item of candidates) {
            if (!isRecord(item) ||
                !isInteger(item.row) ||
                !isInteger(item.start) ||
                !isInteger(item.length) ||
                item.row < 0 ||
                item.row >= SYNTH_ROWS ||
                item.start < 0 ||
                item.start >= oldSteps ||
                item.length < 1 ||
                item.start + item.length > oldSteps)
                return fallback();
            const ratio = oldSteps / SYNTH_STEPS, start = Math.floor(item.start / ratio);
            const length = Math.max(1, Math.ceil((item.start + item.length) / ratio) - start);
            state.sections[section] = putNote(at(state.sections, section), item.row, start, length);
        }
    }
    if (isInteger(saved.selected) && saved.selected >= 0 && saved.selected < 4)
        state.selected = saved.selected;
    if (isInteger(saved.octave) && Math.abs(saved.octave) <= 2)
        state.octave = saved.octave;
    if (isSynthSound(saved.sound))
        state.sound = saved.sound;
    state.waveform = isWaveform(saved.waveform)
        ? saved.waveform
        : DEFAULT_WAVE[state.sound];
    if (isInteger(saved.root) && saved.root >= 48 && saved.root <= 72)
        state.root = saved.root;
    if (typeof saved.loop === "boolean")
        state.loop = saved.loop;
    if (isInteger(saved.length) &&
        [1, 2, 4, 8, 16, 32, 64].includes(saved.length))
        state.length = Math.min(16, saved.version === 1
            ? Math.max(1, Math.ceil(saved.length / 4))
            : saved.length);
    for (const [key, min, max] of RANGES) {
        const value = saved[key];
        if (isNumber(value) && value >= min && value <= max)
            state[key] = value;
    }
    state.filterType = isFilterType(saved.filterType)
        ? saved.filterType
        : "lowpass";
    state.filterControl =
        saved.filterControl === "manual" || saved.filterControl === "adsr"
            ? saved.filterControl
            : state.filterAmount > 0
                ? "adsr"
                : "manual";
    if (state.sound === "bass" && !isNumber(saved.attack))
        Object.assign(state, { attack: 0.003, decay: 4, sustain: 0.083 });
    return state;
}
export function activeSynthNotes(state, step) {
    const { section, column } = synthPosition(step);
    return at(state.sections, section)
        .filter((note) => note.start <= column && note.start + note.length > column)
        .map((note) => ({ ...note, remaining: note.start + note.length - column }));
}
