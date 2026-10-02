import { readStored, writeStored } from "./storage.js?v=a5f3c549b024";
import { widgetStorageKey } from "./widget-storage.js?v=a5f3c549b024";
import { isRecord, isInteger, at } from "./guards.js?v=a5f3c549b024";
export const SECTION_COUNT = 4;
export const SECTION_STEPS = 16;
export function sectionPosition(step) {
    const position = ((step % (SECTION_COUNT * SECTION_STEPS)) + SECTION_COUNT * SECTION_STEPS) %
        (SECTION_COUNT * SECTION_STEPS);
    return {
        section: Math.floor(position / SECTION_STEPS),
        column: position % SECTION_STEPS,
    };
}
function validPattern(pattern, rows) {
    return (Array.isArray(pattern) &&
        pattern.length === rows &&
        pattern.every((row) => Array.isArray(row) &&
            row.length === SECTION_STEPS &&
            row.every((value) => typeof value === "boolean")));
}
function validSavedSections(saved, rows, previousRows = []) {
    if (!isRecord(saved) ||
        saved.version !== 2 ||
        !isInteger(saved.selected) ||
        saved.selected < 0 ||
        saved.selected >= SECTION_COUNT ||
        !Array.isArray(saved.patterns) ||
        saved.patterns.length !== SECTION_COUNT)
        return false;
    const patterns = saved.patterns;
    return [rows, ...previousRows.filter((count) => count < rows)].some((count) => patterns.every((pattern) => validPattern(pattern, count)));
}
export function restoreSections(saved, legacy, rows, previousRows = []) {
    const expand = (pattern) => Array.from({ length: rows }, (_, row) => [
        ...(pattern[row] ?? Array(SECTION_STEPS).fill(false)),
    ]);
    if (validSavedSections(saved, rows, previousRows))
        return {
            version: 2,
            selected: saved.selected,
            patterns: saved.patterns.map(expand),
        };
    const pattern = [rows, ...previousRows.filter((count) => count < rows)].some((count) => validPattern(legacy, count)) && Array.isArray(legacy)
        ? legacy.filter((row) => Array.isArray(row) &&
            row.every((value) => typeof value === "boolean"))
        : [];
    return {
        version: 2,
        selected: 0,
        patterns: Array.from({ length: SECTION_COUNT }, () => expand(pattern)),
    };
}
export function createSections(name, rows, { previousRows = [] } = {}) {
    const key = widgetStorageKey(`${name}-sections-v2`);
    const legacyKey = widgetStorageKey(`${name}-pattern-v1`);
    const saved = readStored(key, null, {
        validate: (value) => validSavedSections(value, rows, previousRows),
    });
    const legacy = readStored(legacyKey, null, {
        validate: (value) => [rows, ...previousRows.filter((count) => count < rows)].some((count) => validPattern(value, count)),
    });
    const state = restoreSections(saved, legacy, rows, previousRows);
    return {
        state,
        get pattern() {
            return at(state.patterns, state.selected);
        },
        save() {
            writeStored(key, state);
        },
    };
}
