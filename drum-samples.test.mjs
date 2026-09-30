import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreSections } from './sections.mjs';
import { SAMPLE_BINDINGS, drumTrackForMidi, drumSampleVoice, decodeDrumSample } from './drum-samples.mjs';
import { buildKeyMap } from './keyboard-map.mjs';
import { DRUM_BINDINGS } from './drum-notes.mjs';

test('eight saved drum tracks expand to twelve without losing any section', () => {
  const old = restoreSections(null, null, 8);
  old.selected = 3;
  old.patterns.forEach((pattern, index) => { pattern[index][index * 4] = true; });
  const upgraded = restoreSections(old, null, 12, [8]);
  assert.equal(upgraded.selected, 3);
  upgraded.patterns.forEach((pattern, index) => {
    assert.deepEqual(pattern.slice(0, 8), old.patterns[index]);
    assert.equal(pattern.slice(8).flat().some(Boolean), false);
  });
  upgraded.patterns[0][8][0] = true;
  assert.equal(upgraded.patterns[1][8][0], false);
  assert.deepEqual(restoreSections(JSON.parse(JSON.stringify(upgraded)), null, 12, [8]), upgraded);
  const legacy = restoreSections(null, old.patterns[0], 12, [8]);
  assert.deepEqual(legacy.patterns[2].slice(0, 8), old.patterns[0]);
});
test('four samples use QWER and all original canonical notes still play their drums', () => {
  const keys = buildKeyMap();
  SAMPLE_BINDINGS.forEach((binding, index) => {
    assert.equal(keys.find(key => key.label === binding.key).midi, binding.midi);
    assert.equal(drumTrackForMidi(binding.midi), 8 + index);
  });
  DRUM_BINDINGS.forEach((binding, index) => assert.equal(drumTrackForMidi(binding.midi), index));
});
test('empty slot is silent; sample plays once at original pitch through its full duration', () => {
  assert.equal(drumSampleVoice({}, {}, null, 2), null);
  const calls = [], source = { playbackRate: { value: 1 }, loop: false, connect() { return this; }, start(t) { calls.push(['start', t]); }, stop(t) { calls.push(['stop', t]); } };
  const gain = { gain: { setValueAtTime(...args) { calls.push(['gain', ...args]); }, linearRampToValueAtTime(...args) { calls.push(['ramp', ...args]); } }, connect() { return this; } };
  const context = { createBufferSource: () => source, createGain: () => gain };
  const buffer = { duration: 2 };
  drumSampleVoice(context, {}, buffer, 3);
  assert.equal(source.buffer, buffer); assert.equal(source.playbackRate.value, 1); assert.equal(source.loop, false);
  assert.ok(calls.some(call => call[0] === 'gain' && call[1] === 0.8 && call[2] === 4.995));
  assert.deepEqual(calls.at(-1), ['stop', 5.02]);
});
test('recorded sample is decoded and trims only silence, including stereo', async () => {
  const left = new Float32Array(100), right = new Float32Array(100); left[20] = 0.5; right[70] = 0.2;
  const copied = [];
  const context = {
    async decodeAudioData() { return { duration: 1, sampleRate: 100, numberOfChannels: 2, getChannelData: index => index ? right : left }; },
    createBuffer(channels, length, rate) { return { channels, length, rate, copyToChannel(data, index) { copied[index] = [...data]; } }; },
  };
  const buffer = await decodeDrumSample(context, new Blob(['audio']));
  assert.equal(buffer.length, 56); assert.equal(copied[0][1], 0.5); assert.ok(copied[1][51] > 0);
});
