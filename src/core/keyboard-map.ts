import { at, required } from './guards.js';
const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"] as const;
const BLACK_NOTES: Partial<Record<number, NoteName>> = { 0: "C♯", 1: "D♯", 3: "F♯", 4: "G♯", 5: "A♯" };
export const ROWS = [
  { id: "upper-keyboard", octave: 5, white: "QWERTYUIOP[]", black: "2356790=", blackAfter: [0, 1, 3, 4, 5, 7, 8, 10] },
  { id: "lower-keyboard", octave: 4, white: "ZXCVBNM,./", black: "SDGHJL;", blackAfter: [0, 1, 3, 4, 5, 7, 8] },
];
const SEMITONES = { C: 0, "C♯": 1, D: 2, "D♯": 3, E: 4, F: 5, "F♯": 6, G: 7, "G♯": 8, A: 9, "A♯": 10, B: 11 };
const SPECIAL_CODE: Partial<Record<string, string>> = { "2": "Digit2", "3": "Digit3", "5": "Digit5", "6": "Digit6", "7": "Digit7", "9": "Digit9", "0": "Digit0", "=": "Equal", "[": "BracketLeft", "]": "BracketRight", ",": "Comma", ".": "Period", "/": "Slash", ";": "Semicolon" };
const codeFor = (label: string): string => SPECIAL_CODE[label] ?? `Key${label}`;

export type NoteName = keyof typeof SEMITONES;
export interface PianoKey {
  row: string; code: string; label: string; note: NoteName; octave: number;
  black: boolean; position: number; midi: number; frequency: number;
}
export function buildKeyMap(): PianoKey[] {
  const keys: Omit<PianoKey, 'midi' | 'frequency'>[] = [];
  for (const row of ROWS) {
    for (let i = 0; i < row.white.length; i++) {
      keys.push({ row: row.id, code: codeFor(at([...row.white], i)), label: at([...row.white], i), note: at(WHITE_NOTES, i % 7), octave: row.octave + Math.floor(i / 7), black: false, position: i });
    }
    for (let i = 0; i < row.black.length; i++) {
      const after = at(row.blackAfter, i);
      keys.push({ row: row.id, code: codeFor(at([...row.black], i)), label: at([...row.black], i), note: required(BLACK_NOTES[after % 7], 'black note'), octave: row.octave + Math.floor(after / 7), black: true, position: after + 1 });
    }
  }
  return keys.map(key => ({ ...key, midi: 12 * (key.octave + 1) + SEMITONES[key.note], frequency: 440 * 2 ** ((12 * (key.octave + 1) + SEMITONES[key.note] - 69) / 12) }));
}

