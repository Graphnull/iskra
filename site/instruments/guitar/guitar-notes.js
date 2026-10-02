export const TUNING = [40, 45, 50, 55, 59, 64];
export const STRING_KEYS = [
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyN",
];
export function stringMidi(string, fret) {
    return (TUNING[string] ?? 40) + Math.max(0, Math.min(5, fret));
}
export function noteName(midi) {
    const names = [
        "C",
        "C♯",
        "D",
        "D♯",
        "E",
        "F",
        "F♯",
        "G",
        "G♯",
        "A",
        "A♯",
        "B",
    ];
    return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
// Half-open crossings prevent a stationary finger from repeatedly plucking.
export function crossedStrings(from, to) {
    const result = [];
    for (let string = 0; string < 6; string++) {
        const position = (string + 0.5) / 6;
        if ((from < position && to >= position) ||
            (from > position && to <= position))
            result.push(string);
    }
    return to < from ? result.reverse() : result;
}
