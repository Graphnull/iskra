import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPlayback } from '../src/core/playback-control.mjs';

function button() { return { disabled: false, textContent: '▶ Играть', setAttribute(name, value) { this[name] = value; },
  addEventListener(type, fn) { this[type] = fn; }, removeEventListener(type) { delete this[type]; } }; }
test('stop during pending audio resume cannot start playback or unlock a busy microphone button', async () => {
  const play = button(); let ready, starts = 0;
  const control = bindPlayback(play, { prepare: () => new Promise(resolve => { ready = resolve; }), start: () => starts++, stop() {}, isRunning: () => false });
  const pending = play.click(); assert.equal(play.disabled, true);
  control.cancelStart(); play.disabled = true;
  ready(); await pending;
  assert.equal(starts, 0); assert.equal(play.disabled, true);
});
test('repeated starts create one player and failed preparation leaves a retryable button', async () => {
  const play = button(); let ready, starts = 0, running = false, control;
  control = bindPlayback(play, { prepare: () => new Promise(resolve => { ready = resolve; }), start() { starts++; running = true; },
    stop() { control.cancelStart(); running = false; }, isRunning: () => running });
  const pending = play.click(); await play.click(); ready(); await pending;
  assert.equal(starts, 1); assert.equal(play.disabled, false); assert.equal(play['aria-pressed'], 'true');
  await play.click(); assert.equal(running, false);
  control.dispose();
  const failed = button(); let guard;
  guard = bindPlayback(failed, { prepare: async () => { throw Error('denied'); }, start() { assert.fail(); },
    stop() { guard.cancelStart(); }, isRunning: () => false });
  await failed.click(); assert.equal(failed.disabled, false); assert.equal(failed.textContent, 'Повторить');
});
