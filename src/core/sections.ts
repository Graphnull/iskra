import { readStored, writeStored } from "./storage.js";
import { widgetStorageKey } from "./widget-storage.js";
import { isRecord, isInteger, at } from "./guards.js";

export const SECTION_COUNT = 4;
export const SECTION_STEPS = 16;
export type Pattern = boolean[][];
export interface SectionsState {
  version: 2;
  selected: number;
  patterns: Pattern[];
}
export interface Position {
  section: number;
  column: number;
}
export function sectionPosition(step: number): Position {
  const position =
    ((step % (SECTION_COUNT * SECTION_STEPS)) + SECTION_COUNT * SECTION_STEPS) %
    (SECTION_COUNT * SECTION_STEPS);
  return {
    section: Math.floor(position / SECTION_STEPS),
    column: position % SECTION_STEPS,
  };
}
function validPattern(pattern: unknown, rows: number): pattern is Pattern {
  return (
    Array.isArray(pattern) &&
    pattern.length === rows &&
    pattern.every(
      (row: unknown) =>
        Array.isArray(row) &&
        row.length === SECTION_STEPS &&
        row.every((value: unknown) => typeof value === "boolean"),
    )
  );
}
function validSavedSections(
  saved: unknown,
  rows: number,
  previousRows: number[] = [],
): saved is SectionsState {
  if (
    !isRecord(saved) ||
    saved.version !== 2 ||
    !isInteger(saved.selected) ||
    saved.selected < 0 ||
    saved.selected >= SECTION_COUNT ||
    !Array.isArray(saved.patterns) ||
    saved.patterns.length !== SECTION_COUNT
  )
    return false;
  const patterns: unknown[] = saved.patterns;
  return [rows, ...previousRows.filter((count) => count < rows)].some((count) =>
    patterns.every((pattern) => validPattern(pattern, count)),
  );
}
export function restoreSections(
  saved: unknown,
  legacy: unknown,
  rows: number,
  previousRows: number[] = [],
): SectionsState {
  const expand = (pattern: Pattern): Pattern =>
    Array.from({ length: rows }, (_, row) => [
      ...(pattern[row] ?? Array<boolean>(SECTION_STEPS).fill(false)),
    ]);
  if (validSavedSections(saved, rows, previousRows))
    return {
      version: 2,
      selected: saved.selected,
      patterns: saved.patterns.map(expand),
    };
  const pattern =
    [rows, ...previousRows.filter((count) => count < rows)].some((count) =>
      validPattern(legacy, count),
    ) && Array.isArray(legacy)
      ? legacy.filter(
          (row: unknown): row is boolean[] =>
            Array.isArray(row) &&
            row.every((value: unknown) => typeof value === "boolean"),
        )
      : [];
  return {
    version: 2,
    selected: 0,
    patterns: Array.from({ length: SECTION_COUNT }, () => expand(pattern)),
  };
}
export function createSections(
  name: string,
  rows: number,
  { previousRows = [] }: { previousRows?: number[] } = {},
) {
  const key = widgetStorageKey(`${name}-sections-v2`);
  const legacyKey = widgetStorageKey(`${name}-pattern-v1`);
  const saved = readStored(key, null, {
    validate: (value): value is SectionsState =>
      validSavedSections(value, rows, previousRows),
  });
  const legacy = readStored(legacyKey, null, {
    validate: (value): value is Pattern =>
      [rows, ...previousRows.filter((count) => count < rows)].some((count) =>
        validPattern(value, count),
      ),
  });
  const state = restoreSections(saved, legacy, rows, previousRows);
  return {
    state,
    get pattern(): Pattern {
      return at(state.patterns, state.selected);
    },
    save() {
      writeStored(key, state);
    },
  };
}
export type Sections = ReturnType<typeof createSections>;
