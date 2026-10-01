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
test('record opens a separate window, stops pending playback and accepts only its own recording',async()=>{
  clear();let resume;const received=[];
  class Buffer{constructor(channels,length,rate){this.duration=length/rate;this.numberOfChannels=channels;this.sampleRate=rate;this.channels=Array.from({length:channels},()=>new Float32Array(length).fill(.2));}getChannelData(channel){return this.channels[channel];}copyToChannel(data,channel){this.channels[channel].set(data);}}
  const node=()=>({gain:{value:0},threshold:{value:0},ratio:{value:0},connect(){return this;}});
  class Audio{currentTime=0;sampleRate=1000;destination={};resume(){return new Promise(resolve=>{resume=resolve;});}close(){return Promise.resolve();}createGain(){return node();}createDynamicsCompressor(){return node();}createBuffer(...args){return new Buffer(...args);}async decodeAudioData(){return new Buffer(1,200,1000);}}
  const popup={closed:false,postMessage:data=>received.push(data)};let opened;
  const originalOpen=window.open;
  window.open=url=>{opened=new URL(url);return popup;};window.AudioContext=Audio;
  globalThis.location=window.location;
  const model=createDrums(),cleanup=model.connect();
  try{
    const pending=model.engine.toggle();assert.equal(model.engine.starting,true);
    model.record(2);assert.equal(opened.searchParams.get('mode'),'recorder');assert.equal(opened.searchParams.get('target'),'drums');
    resume();await pending;assert.equal(model.engine.running,false);
    const session=opened.searchParams.get('session');
    const deliver=(source,origin)=>window.dispatchEvent(new window.MessageEvent('message',{source,origin,data:{type:'drum-sample',session,blob:new Blob(['recording']),settings:{gain:2,start:.04}}}));
    deliver({},location.origin);deliver(popup,'https://wrong.example');await new Promise(r=>setImmediate(r));assert.equal(model.samples[2],null);
    deliver(popup,location.origin);await new Promise(r=>setImmediate(r));
    assert.ok(model.samples[2]);assert.equal(model.samples[0],null);assert.equal(model.samples[3],null);
    assert.equal(received[0].type,'sample-received');assert.equal(model.editingSlot,null);
    model.setSampleSettings(2,{gain:3,start:.05});
    assert.deepEqual(createDrums().sampleSettings[2],{gain:3,start:.05});assert.deepEqual(model.sampleSettings[0],{gain:1,start:0});
    model.openSample(null);model.openSample(0);assert.equal(model.editingSlot,null);
    model.record(2);deliver(popup,location.origin);await new Promise(r=>setImmediate(r));assert.deepEqual(model.sampleSettings[2],{gain:2,start:.04});
    window.open=()=>null;model.record(1);assert.equal(model.recordWindow,true);assert.match(model.status,/Разреши всплывающее/);
  }finally{cleanup();window.open=originalOpen;delete window.AudioContext;delete globalThis.location;}
});

test('filter controls enable an audible range, retain depth in manual mode and persist independently',()=>{
  clear();const model=createSynth();model.setFilterControl('adsr');
  assert.equal(model.state.cutoff,400);assert.equal(model.state.filterAmount,.8);
  model.setFilterType('notch');model.setParameter('cutoff',80);model.setFilterControl('manual');
  const restored=createSynth();assert.equal(restored.state.filterType,'notch');assert.equal(restored.state.filterControl,'manual');assert.equal(restored.state.cutoff,80);assert.equal(restored.state.filterAmount,.8);
});
