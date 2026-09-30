import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionPosition, restoreSections } from './sections.mjs';
const blank = rows => Array.from({ length: rows }, () => Array(16).fill(false));

test('64-step cycle changes section at boundaries and wraps in shared phase', () => {
  for (const [step, section, column] of [[0,0,0],[15,0,15],[16,1,0],[31,1,15],[32,2,0],[48,3,0],[63,3,15],[64,0,0],[127,3,15],[-1,3,15]]) {
    assert.deepEqual(sectionPosition(step), { section, column });
  }
  assert.deepEqual(sectionPosition(128000016), { section: 1, column: 0 });
});
test('old loops migrate without changing sound and without sharing editable rows', () => {
  for (const rows of [8,16]) {
    const legacy = blank(rows); legacy[0][4] = true;
    const restored = restoreSections(null, legacy, rows);
    assert.equal(restored.patterns.length, 4);
    for (const pattern of restored.patterns) assert.deepEqual(pattern, legacy);
    restored.patterns[1][0][4] = false;
    assert.equal(restored.patterns[0][0][4], true);
    assert.equal(restored.patterns[2][0][4], true);
    assert.equal(legacy[0][4], true);
  }
});
test('four different sections and the editor selection survive serialization', () => {
  const state = restoreSections(null, null, 16);
  state.selected = 3;
  state.patterns.forEach((pattern,i) => { pattern[i][i+1] = true; });
  assert.deepEqual(restoreSections(JSON.parse(JSON.stringify(state)), null, 16), state);
  assert.equal(restoreSections({ ...state, selected: 4 }, null, 16).selected, 0);
  const damaged = JSON.parse(JSON.stringify(state)); damaged.patterns[2][0][0] = 1;
  assert.deepEqual(restoreSections(damaged, null, 16), restoreSections(null, null, 16));
});
