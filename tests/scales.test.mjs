import test from 'node:test';
import assert from 'node:assert/strict';
import { pitchForRow, noteLabel } from '../src/core/scales.mjs';
test('major and minor rows follow the scale and cross octaves', () => {
  assert.deepEqual([15,14,13,12,11,10,9,8].map(row => pitchForRow(row,{scale:'major'})), [48,50,52,53,55,57,59,60]);
  assert.deepEqual([15,14,13,12,11,10,9,8].map(row => pitchForRow(row,{scale:'minor'})), [48,50,51,53,55,56,58,60]);
});
test('transposition and octave affect pitch and correct sharp labels', () => {
  assert.equal(noteLabel(pitchForRow(15,{scale:'major',transpose:1,octave:1})), 'C♯4');
  assert.equal(noteLabel(pitchForRow(15,{scale:'major',transpose:-1,octave:-1})), 'B1');
});
test('existing pentatonic drawings retain their original pitches', () => {
  assert.deepEqual([15,14,13,12,11,10,0].map(row=>pitchForRow(row)),[48,50,52,55,57,60,84]);
});
