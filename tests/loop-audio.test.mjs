import test from 'node:test';
import assert from 'node:assert/strict';
import { loopSeconds, loopPhase, placeLoopChunk, loopWav } from '../site/core/loop-audio.js';
test('loop layers start at the current position and wrap through the cycle boundary',()=>{
  const loop=new Float32Array(8);placeLoopChunk(loop,new Float32Array([1,2,3,4]),6);
  assert.deepEqual([...loop],[3,4,0,0,0,0,1,2]);
  const second=new Float32Array(8);placeLoopChunk(second,new Float32Array([5,6]),3);
  assert.equal(second[3],5);assert.equal(loop[3],0);
  assert.equal(loopSeconds(120),8);assert.equal(loopPhase(10,8),2);assert.equal(loopPhase(-1,8),7);
});
test('saved loop WAV preserves silence, position and sample precision',async()=>{
  const values=new Float32Array([0,.125,-.75,0]);const view=new DataView(await loopWav(values,48000).arrayBuffer());
  assert.equal(view.getUint16(20,true),3);assert.equal(view.getUint32(24,true),48000);
  assert.equal(view.getUint32(40,true),16);
  assert.deepEqual(Array.from({length:4},(_,i)=>view.getFloat32(44+i*4,true)),[...values]);
});
