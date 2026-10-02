import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TRANSPORT, beatAt, boundaryAfter, changeTempo } from '../site/core/transport.js';

test('devices with different tempo histories join the same global step', () => {
  const deviceA = changeTempo(changeTempo(DEFAULT_TRANSPORT, 90, 'a'), 120, 'a');
  const deviceB = changeTempo(changeTempo(DEFAULT_TRANSPORT, 240, 'b'), 120, 'b');
  const time = 1790761012289;
  assert.deepEqual(boundaryAfter(deviceA, time), boundaryAfter(deviceB, time));
  assert.equal(beatAt(deviceA, time), beatAt(deviceB, time));
  const boundary = boundaryAfter(deviceA, time);
  assert.equal(boundary.time, 1790761012375);
  assert.equal(boundary.step % 16, 3);
});
test('legacy saved phase offsets cannot shift the global rhythm', () => {
  const legacy = { ...DEFAULT_TRANSPORT, bpm: 120, anchor: 123456, beat: 345, effectiveAt: 1790761020000,
    previous: { bpm: 40, anchor: 123, beat: 67 } };
  assert.deepEqual(boundaryAfter(legacy, 1790761012289), boundaryAfter({ bpm: 120 }, 1790761012289));
});
test('boundaries remain in the future at all supported tempos and real timestamps', () => {
  const time = 1790761012289;
  for (const bpm of [40, 90, 110, 120, 160, 240]) {
    const state = { bpm };
    const boundary = boundaryAfter(state, time);
    assert.ok(boundary.time >= time);
    assert.ok(boundary.time - time <= 15000 / bpm + 0.001);
    assert.ok(Math.abs(beatAt(state, boundary.time) - boundary.step) < 0.00001);
    const next = boundaryAfter(state, boundary.time + 1);
    assert.equal(next.step, boundary.step + 1);
    assert.ok(Math.abs(next.time - boundary.time - 15000 / bpm) < 0.001);
  }
});
