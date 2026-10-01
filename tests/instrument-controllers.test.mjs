import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createSynth } from '../site/instruments/synth/synth.js';
import { createTenorion } from '../site/instruments/tenorion/tenorion.js';
import { createDrums } from '../site/instruments/drums/drums.js';
const dom=new JSDOM('',{url:'https://example.org/iskra/'});
for(const name of ['window','document','localStorage','sessionStorage'])globalThis[name]=dom.window[name];
Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
function clear(){localStorage.clear();sessionStorage.clear();}
test('React synth controller preserves four independent sections and waveform parameters after reload',()=>{
  clear();const model=createSynth();model.select(2);model.edit(1,3,8);model.setWaveform('sawtooth');model.setParameter('release',1.2);
  model.select(0);model.edit(2,1,4);const restored=createSynth();
  assert.equal(restored.state.selected,0);assert.deepEqual(restored.state.sections[0],[{row:2,start:1,length:4}]);assert.deepEqual(restored.state.sections[2],[{row:1,start:3,length:8}]);
  assert.equal(restored.state.waveform,'sawtooth');assert.equal(restored.state.release,1.2);assert.equal(restored.state.sections.length,4);
  restored.select(2);restored.clear();assert.deepEqual(restored.state.sections[2],[]);assert.equal(restored.state.sections[0].length,1);
});
test('Tenori-on and drums controllers preserve separate patterns and per-instrument preferences',()=>{
  clear();const tenorion=createTenorion(),drums=createDrums();
  tenorion.select(3);tenorion.edit(4,7);tenorion.setInstrument('pluck');tenorion.setHarmony({scale:'minor',transpose:2,octave:-1});
  drums.select(1);drums.edit(0,3);drums.edit(11,15);
  const reloadedTenorion=createTenorion(),reloadedDrums=createDrums();
  assert.equal(reloadedTenorion.sequence.state.selected,3);assert.equal(reloadedTenorion.sequence.pattern[4][7],true);assert.equal(reloadedTenorion.instrument,'pluck');assert.deepEqual(reloadedTenorion.harmony,{scale:'minor',transpose:2,octave:-1});
  assert.equal(reloadedDrums.sequence.state.selected,1);assert.equal(reloadedDrums.sequence.pattern[0][3],true);assert.equal(reloadedDrums.sequence.pattern[11][15],true);
  reloadedTenorion.clear();assert.equal(reloadedTenorion.sequence.pattern[4][7],false);assert.equal(reloadedDrums.sequence.pattern[0][3],true);
});
test('microphone recording cancels a pending player, fills only its sample track and releases the microphone',async()=>{
  clear();let resume,recorder,stopped=0;
  const originalRecorder=globalThis.MediaRecorder;
  class Buffer{constructor(channels,length,rate){this.duration=length/rate;this.numberOfChannels=channels;this.sampleRate=rate;this.channels=Array.from({length:channels},()=>new Float32Array(length).fill(.2));}getChannelData(channel){return this.channels[channel];}copyToChannel(data,channel){this.channels[channel].set(data);}}
  const node=()=>({gain:{value:0},threshold:{value:0},ratio:{value:0},connect(){return this;}});
  class Audio{currentTime=0;sampleRate=1000;destination={};resume(){return new Promise(resolve=>{resume=resolve;});}close(){return Promise.resolve();}createGain(){return node();}createDynamicsCompressor(){return node();}createBuffer(...args){return new Buffer(...args);}async decodeAudioData(){return new Buffer(1,200,1000);}}
  class Recorder{state='inactive';mimeType='audio/webm';constructor(){recorder=this;}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['recording'])});this.done=this.onstop();}}
  window.AudioContext=Audio;globalThis.MediaRecorder=Recorder;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{async getUserMedia(){return {getTracks:()=>[{stop(){stopped++;}}]};}}});
  const model=createDrums(),cleanup=model.connect();
  try{
    const pending=model.engine.toggle();assert.equal(model.engine.starting,true);
    model.record(2);await Promise.resolve();assert.equal(model.recordState,'recording');assert.equal(model.requestedSlot,2);
    resume();await pending;assert.equal(model.engine.running,false);
    model.record(2);await recorder.done;
    assert.equal(model.recordState,'idle');assert.equal(stopped,1);assert.ok(model.samples[2]);assert.equal(model.samples[0],null);assert.equal(model.samples[1],null);assert.equal(model.samples[3],null);
    assert.match(model.status,/Семпл 3 готов/);
    assert.equal(model.editingSlot,2);
    model.setSampleSettings(2,{gain:3,start:.05});
    assert.deepEqual(model.sampleSettings[2],{gain:3,start:.05});
    assert.deepEqual(createDrums().sampleSettings[2],{gain:3,start:.05});
    assert.deepEqual(model.sampleSettings[0],{gain:1,start:0});
    model.openSample(null);assert.equal(model.editingSlot,null);
    model.openSample(0);assert.equal(model.editingSlot,null);
    model.openSample(2);assert.equal(model.editingSlot,2);
    model.record(2);await Promise.resolve();model.record(2);await recorder.done;
    assert.deepEqual(model.sampleSettings[2],{gain:1,start:0});
  }finally{cleanup();delete window.AudioContext;globalThis.MediaRecorder=originalRecorder;delete navigator.mediaDevices;}
});
