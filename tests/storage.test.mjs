import test from 'node:test';
import assert from 'node:assert/strict';
import { readStored, writeStored } from '../site/core/storage.js';
import { restoreSynth } from '../site/instruments/synth/synth-sequence.js';

const backend = value => ({ getItem: () => value, setItem(key, next) { this.saved = [key, next]; } });
test('damaged tab state falls back to valid local state without erasing notes', () => {
  const saved = restoreSynth(null); saved.sections[2] = [{ row: 3, start: 1, length: 8 }];
  const invalid = { ...saved, sections: [[], [], [{ row: -1, start: 0, length: 2 }], []] };
  const host = { sessionStorage: backend(JSON.stringify(invalid)), localStorage: backend(JSON.stringify(saved)) };
  assert.deepEqual(readStored('synth', null, { host, validate: value => restoreSynth(value, { strict: true }) !== null }), saved);
  host.sessionStorage = backend('{');
  assert.deepEqual(readStored('synth', null, { host }), saved);
});
test('session preference, legacy plain strings and blocked storage remain supported', () => {
  const host = { sessionStorage: backend('pad'), localStorage: backend('bell') };
  assert.equal(readStored('sound', 'bell', { host, raw: true }), 'pad');
  writeStored('sound', 'keys', { host, raw: true });
  assert.deepEqual(host.localStorage.saved, ['sound', 'keys']);
  const blocked = { get sessionStorage() { throw Error('blocked'); }, localStorage: backend(null) };
  assert.equal(readStored('x', 12, { host: blocked }), 12);
  writeStored('x', { notes: [] }, { host: blocked });
  assert.deepEqual(blocked.localStorage.saved, ['x', '{"notes":[]}']);
});
