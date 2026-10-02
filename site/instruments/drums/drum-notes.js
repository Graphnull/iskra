import { at } from "../../core/guards.js?v=f95683268d56";
// Both sequenced rows and live piano notes address the same eight sounds.
export const DRUM_BINDINGS = [
    { midi: 60, note: "C4", key: "Z" },
    { midi: 62, note: "D4", key: "X" },
    { midi: 64, note: "E4", key: "C" },
    { midi: 65, note: "F4", key: "V" },
    { midi: 67, note: "G4", key: "B" },
    { midi: 69, note: "A4", key: "N" },
    { midi: 71, note: "B4", key: "M" },
    { midi: 61, note: "C♯4", key: "S" },
];
export function drumForMidi(midi) {
    return at([0, 7, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6], ((midi % 12) + 12) % 12);
}
