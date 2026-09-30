import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TRANSPORT, beatAt, boundaryAfter, changeTempo } from './transport.mjs';

test('independently opened players join the same step boundary', () => {
  const state = { ...DEFAULT_TRANSPORT, anchor: 1000 };
  const first = boundaryAfter(state, 1400);
  const second = boundaryAfter(state, 1405);
  assert.deepEqual(first, second);
  assert.equal(first.step, 3);
  assert.ok(first.time >= 1405);
});
test('tempo changes preserve musical phase at the common effective timestamp', () => {
  const before = { ...DEFAULT_TRANSPORT, anchor: 1000 };
  const after = changeTempo(before, 160, 1450, 'a');
  assert.equal(beatAt(after, 1700), beatAt(before, 1700));
  assert.equal(beatAt(after, after.effectiveAt), beatAt(before, after.effectiveAt));
  assert.ok(Math.abs(beatAt(after, 1850) - beatAt(after, 1750) - 160 / 150) < 1e-9);
  for (const time of [1700, 1740, 1750, 1850]) {
    const boundary = boundaryAfter(after, time);
    assert.ok(boundary.time >= time - 1e-6);
    assert.ok(Math.abs(beatAt(after, boundary.time) - boundary.step) < 1e-8);
  }
});
test('a rapid correction replaces a pending tempo change without phase discontinuity', () => {
  const before = { ...DEFAULT_TRANSPORT, anchor: 1000 };
  const pending = changeTempo(before, 160, 1450, 'a');
  const replacement = changeTempo(pending, 90, 1500, 'b');
  assert.equal(beatAt(replacement, 1750), beatAt(before, 1750));
  assert.equal(beatAt(replacement, replacement.effectiveAt), beatAt(before, replacement.effectiveAt));
  assert.equal(replacement.revision, 2);
});
