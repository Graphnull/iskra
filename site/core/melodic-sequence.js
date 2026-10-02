import { isRecord, isInteger } from "./guards.js?v=f1d1aaff72ac";
export function noteAt(notes, row, column) {
    return notes.find((note) => note.row === row &&
        column >= note.start &&
        column < note.start + note.length);
}
export function putNote(notes, row, start, length) {
    const next = { row, start, length: Math.min(length, 16 - start) };
    return [
        ...notes.filter((note) => note.row !== row ||
            note.start + note.length <= start ||
            note.start >= start + next.length),
        next,
    ];
}
export function restoreMelodic(saved) {
    if (!isRecord(saved) ||
        saved.version !== 1 ||
        !isInteger(saved.selected) ||
        saved.selected < 0 ||
        saved.selected > 3 ||
        !isInteger(saved.octave) ||
        Math.abs(saved.octave) > 2 ||
        !Array.isArray(saved.sections) ||
        saved.sections.length !== 4)
        return null;
    const sections = [];
    for (const section of saved.sections) {
        if (!Array.isArray(section) || section.length > 256)
            return null;
        let notes = [];
        for (const item of section) {
            if (!isRecord(item) ||
                !isInteger(item.row) ||
                item.row < 0 ||
                item.row >= 16 ||
                !isInteger(item.start) ||
                item.start < 0 ||
                item.start >= 16 ||
                !isInteger(item.length) ||
                item.length < 1 ||
                item.start + item.length > 16)
                return null;
            notes = putNote(notes, item.row, item.start, item.length);
        }
        sections.push(notes);
    }
    return {
        version: 1,
        selected: saved.selected,
        octave: saved.octave,
        sections,
    };
}
