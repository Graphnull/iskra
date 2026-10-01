import { at } from "./guards.js?v=27da1cf7fbab";
export const SCALES = {
    major: { name: "Мажор", notes: [0, 2, 4, 5, 7, 9, 11] },
    minor: { name: "Минор", notes: [0, 2, 3, 5, 7, 8, 10] },
    dorian: { name: "Дорийский", notes: [0, 2, 3, 5, 7, 9, 10] },
    mixolydian: { name: "Миксолидийский", notes: [0, 2, 4, 5, 7, 9, 10] },
    pentatonic: { name: "Пентатоника мажор", notes: [0, 2, 4, 7, 9] },
    minorPentatonic: { name: "Пентатоника минор", notes: [0, 3, 5, 7, 10] },
    chromatic: {
        name: "Хроматическая",
        notes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
};
export function pitchForRow(row, { scale = "pentatonic", transpose = 0, octave = 0 } = {}) {
    const notes = SCALES[scale].notes;
    const degree = 15 - row;
    return (48 +
        at(notes, degree % notes.length) +
        12 * Math.floor(degree / notes.length) +
        transpose +
        octave * 12);
}
export function noteLabel(midi) {
    return `${["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
export function isScaleId(value) {
    return typeof value === "string" && Object.hasOwn(SCALES, value);
}
