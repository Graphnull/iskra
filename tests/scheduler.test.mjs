import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduler } from '../site/core/scheduler.js';

function harness() {
  let timestamp = 10000, id = 0;
  const timeouts = new Map(), intervals = new Map(), notes = [], visuals = [];
  const timers = {
    setTimeout: fn => { timeouts.set(++id, fn); return id; },
    clearTimeout: id => timeouts.delete(id),
    setInterval: fn => { intervals.set(++id, fn); return id; },
    clearInterval: id => intervals.delete(id),
  };
  const scheduler = createScheduler({ context: () => ({ currentTime: 2 }), transport: () => ({ bpm: 120 }),
    now: () => timestamp, timers, onStep: note => notes.push(note), onVisual: step => visuals.push(step) });
  return { scheduler, notes, visuals, timeouts, intervals,
    advance(time) { timestamp = time; for (const fn of intervals.values()) fn(); } };
}
test('lookahead maps global phase to audio time, with no duplicated steps', () => {
  const h = harness(); h.scheduler.start(); h.scheduler.start();
  assert.equal(h.intervals.size, 1);
  assert.deepEqual(h.notes, [{ step: 81, time: 2.125, first: true }]);
  h.advance(10025); assert.equal(h.notes.length, 1);
  h.advance(10075); assert.equal(h.notes[1].step, 82); assert.equal(h.notes[1].first, false);
  for (const callback of [...h.timeouts.values()]) callback();
  assert.deepEqual(h.visuals, [81, 82]);
});
test('stop and reset invalidate queued visuals; a stopped clock cannot restart itself', () => {
  const h = harness(); h.scheduler.start();
  const stale = [...h.timeouts.values()][0]; h.scheduler.reset(); stale();
  assert.deepEqual(h.visuals, []); assert.equal(h.timeouts.size, 0);
  h.advance(10025); assert.equal(h.notes.at(-1).first, true);
  const pending = [...h.timeouts.values()][0]; h.scheduler.stop(); pending();
  assert.equal(h.scheduler.running, false); assert.equal(h.intervals.size, 0);
  assert.deepEqual(h.visuals, []);
});
test('background gaps skip missed notes and mark a sustained-note rejoin', () => {
  const h = harness(); h.scheduler.start(); h.advance(20000);
  assert.equal(h.timeouts.size, 1);
  assert.equal(h.notes.length, 2); assert.equal(h.notes[1].step, 161); assert.equal(h.notes[1].first, true);
});
test('failed initial audio scheduling releases the clock', () => {
  const h = harness();
  const broken = createScheduler({ context: () => { throw Error('audio unavailable'); }, transport: () => ({ bpm: 120 }),
    now: () => 10000, onStep() {}, onVisual() {}, timers: { setTimeout() {}, clearTimeout() {}, clearInterval() {} } });
  assert.throws(() => broken.start(), /audio unavailable/); assert.equal(broken.running, false);
});

test('an audio error during a later tick stops the interval and clears scheduled visuals', () => {
  let timestamp = 10000, callbacks = [], fail = false, error, interval;
  const clock = createScheduler({
    now: () => timestamp, context: () => ({ currentTime: 1 }), transport: () => ({ bpm: 120 }),
    onStep() { if (fail) throw Error('audio failed'); }, onVisual() { assert.fail('stale visual'); },
    onError: caught => { error = caught; },
    timers: { setTimeout(fn) { callbacks.push(fn); return callbacks.length; }, clearTimeout() {},
      setInterval(fn) { interval = fn; return 1; }, clearInterval() { interval = null; } },
  });
  clock.start(); fail = true; timestamp = 10100; interval();
  assert.equal(clock.running, false); assert.equal(interval, null); assert.match(error.message, /audio failed/);
  for (const fn of callbacks) fn();
});
