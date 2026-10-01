import type { PianoKey } from '../src/core/keyboard-map.js';
import type { SectionsState } from '../src/core/sections.js';
import type { SynthState, Waveform } from '../src/instruments/synth/synth-sequence.js';
import { noteAt, restoreSynth } from '../src/instruments/synth/synth-sequence.js';
import { readStored } from '../src/core/storage.js';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
export type Contracts = [
  Assert<Equal<SectionsState['version'], 2>>,
  Assert<Equal<Waveform, 'sine' | 'triangle' | 'sawtooth' | 'square'>>,
  Assert<Equal<PianoKey['frequency'], number>>,
  Assert<Equal<ReturnType<typeof noteAt>, { row: number; start: number; length: number } | undefined>>,
  Assert<Equal<SynthState['sections'][number][number]['length'], number>>
];
const saved = readStored('type-test', null);
const restored = restoreSynth(saved);
export const waveform: Waveform = restored.waveform;
