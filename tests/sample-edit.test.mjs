import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreSampleSettings,sampleStartLimit,sampleWaveform} from '../site/core/sample-edit.js';
test('sample settings restore legacy defaults and reject invalid values, offsets never reach the end',()=>{
  assert.deepEqual(restoreSampleSettings(null,2),{gain:1,start:0});
  assert.deepEqual(restoreSampleSettings({gain:Infinity,start:NaN},2),{gain:1,start:0});
  assert.deepEqual(restoreSampleSettings({gain:9,start:9},2),{gain:4,start:1.99});
  assert.deepEqual(restoreSampleSettings({gain:-1,start:-1},2),{gain:0,start:0});
  assert.equal(sampleStartLimit(.004),.002);
});
test('waveform preserves stereo transient peaks and quiet recordings',()=>{
  const channels=[new Float32Array([0,0,.01,0]),new Float32Array([.4,0,0,.7])];
  const peaks=sampleWaveform({numberOfChannels:2,getChannelData:i=>channels[i]},2);
  assert.ok(Math.abs(peaks[0]-.4)<1e-6);assert.ok(Math.abs(peaks[1]-.7)<1e-6);
  assert.equal(sampleWaveform({numberOfChannels:1,getChannelData:()=>channels[0]},4)[2],channels[0][2]);
});
