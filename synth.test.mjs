import test from 'node:test';
import assert from 'node:assert/strict';
import {synthPosition,restoreSynth,putNote,noteAt,activeSynthNotes} from './synth-sequence.mjs';
import {createMicrophone,sampleBounds} from './microphone.mjs';
import {synthVoice,releaseVoice} from './synth-audio.mjs';

test('64-step song boundaries, sustained join and section isolation',()=>{
  assert.deepEqual(synthPosition(15),{section:0,column:15});
  assert.deepEqual(synthPosition(16),{section:1,column:0});
  assert.deepEqual(synthPosition(63),{section:3,column:15});
  assert.deepEqual(synthPosition(64),{section:0,column:0});
  const state=restoreSynth(null);state.sections[0]=putNote([],15,0,16);
  assert.equal(activeSynthNotes(state,12)[0].remaining,4);
  assert.equal(activeSynthNotes(state,16).length,0);
  state.selected=2;state.length=16;state.cutoff=1000;
  assert.deepEqual(restoreSynth(JSON.parse(JSON.stringify(state))),state);
});
test('long notes hold through steps; overlapping replacement and section end clipping',()=>{
  let notes=putNote([],3,0,12);
  assert.equal(noteAt(notes,3,8).length,12);
  notes=putNote(notes,3,4,4);assert.equal(notes.length,1);
  notes=putNote(notes,4,4,8);assert.equal(notes.length,2);
  notes=putNote(notes,2,12,16);assert.equal(noteAt(notes,2,15).length,4);
  const damaged=restoreSynth(null);damaged.sections[0]=[{row:0,start:15,length:2}];
  assert.deepEqual(restoreSynth(damaged),restoreSynth(null));
});
function audioMock(){
  const nodes=[]; const parameter=()=>({value:0,calls:[],setValueAtTime(...a){this.calls.push(['set',...a]);},exponentialRampToValueAtTime(...a){this.calls.push(['ramp',...a]);},cancelScheduledValues(...a){this.calls.push(['cancel',...a]);},setTargetAtTime(...a){this.calls.push(['target',...a]);}});
  const node=()=>{const n={connect(){return this;},disconnect(){},setPeriodicWave(wave){this.wave=wave;},frequency:parameter(),playbackRate:parameter(),gain:parameter(),Q:parameter(),start(t){this.started=t;},stop(t){this.stopped=t;}};nodes.push(n);return n;};
  return {currentTime:2,createPeriodicWave:(real,imag)=>({real,imag}),createBufferSource:node,createOscillator:node,createGain:node,createBiquadFilter:node,nodes};
}
test('sample transposition, looping and long release use the same audio path as live keys',()=>{
  const context=audioMock(),buffer={duration:1};
  const voice=synthVoice(context,{}, {sound:'sample',sample:buffer,root:60,loop:true,cutoff:2000},72,3,8);
  assert.equal(voice.source.playbackRate.value,2);assert.equal(voice.source.buffer,buffer);assert.equal(voice.source.loop,true);
  assert.equal(voice.source.stopped,11.35);
  assert.deepEqual(voice.gain.gain.calls.at(-1),['target',0.0001,11,0.055]);
  const live=synthVoice(context,{}, {sound:'pad',cutoff:2000},69,2,null,true);
  assert.equal(live.source.frequency.value,440);assert.equal(live.source.stopped,undefined);
  releaseVoice(context,live);assert.equal(live.source.stopped,2.35);releaseVoice(context,live);assert.equal(live.gain.gain.calls.filter(c=>c[0]==='target').length,1);
});
test('trimming preserves audible sound in all channels and rejects silence',()=>{
  const first=new Float32Array(100),second=new Float32Array(100);first[30]=0.1;second[50]=0.2;
  assert.deepEqual(sampleBounds([first,second],100),{start:29,end:55});
  assert.throws(()=>sampleBounds([new Float32Array(20)],100),/Не слышно/);
});
test('recording creates a blob and releases every microphone track on stop',async()=>{
  let stopped=0,last,blob; const states=[];
  class Recorder {
    constructor(){last=this;this.state='inactive';this.mimeType='audio/webm';}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.ondataavailable({data:new Blob(['recorded-audio'])});this.finished=this.onstop();}
  }
  const mic=createMicrophone({mediaDevices:{async getUserMedia(){return {getTracks:()=>[{stop(){stopped++;}}]};}},Recorder,onState:s=>states.push(s),onBlob:b=>{blob=b;},onError:e=>{throw e;}});
  await mic.start();assert.equal(mic.recording,true);mic.stop();await last.finished;
  assert.equal(stopped,1);assert.equal(await blob.text(),'recorded-audio');assert.equal(blob.type,'audio/webm');assert.deepEqual(states,['requesting','recording','processing','idle']);
});
test('denial, recorder failure and disposal during permission request do not leak microphone',async()=>{
  let error,stopped=0,resolveStream;
  const stream={getTracks:()=>[{stop(){stopped++;}}]};
  const base={onState(){},onBlob(){throw Error('must not save');},onError:e=>{error=e;}};
  const denied=createMicrophone({...base,mediaDevices:{async getUserMedia(){throw {name:'NotAllowedError'};}},Recorder:class{}});
  await denied.start();assert.equal(error.name,'NotAllowedError');
  const failed=createMicrophone({...base,mediaDevices:{async getUserMedia(){return stream;}},Recorder:class{constructor(){throw Error('recorder failed');}}});
  await failed.start();assert.equal(stopped,1);
  const pending=createMicrophone({...base,mediaDevices:{getUserMedia(){return new Promise(r=>{resolveStream=r;});}},Recorder:class{constructor(){throw Error('must not record');}}});
  const request=pending.start();pending.dispose();resolveStream(stream);await request;assert.equal(stopped,2);
});

test('808 voice has a sine body, pitch drop and natural amplitude decay',()=>{
  const ctx=audioMock();
  const voice=synthVoice(ctx,{}, {sound:'bass',cutoff:4500},36,3,2);
  assert.equal(voice.source.type,'sine');
  assert.ok(voice.source.wave.imag[1] > voice.source.wave.imag[2]);
  const ramps=voice.source.frequency.calls;
  assert.ok(ramps[0][1] > ramps[1][1]);
  assert.equal(ramps[1][2],3.045);
  assert.ok(voice.gain.gain.calls.some(c=>c[0]==='ramp'&&c[1]===0.035));
});
test('previous four-page patterns retain all four sections when shortened',()=>{
  const old={version:1,selected:2,page:3,length:64,sections:[[{row:0,start:48,length:16}],[],[{row:2,start:0,length:64}],[]]};
  const state=restoreSynth(old);
  assert.deepEqual(state.sections[0],[{row:0,start:12,length:4}]);
  assert.deepEqual(state.sections[2],[{row:2,start:0,length:16}]);
  assert.equal(state.selected,2);assert.equal(state.length,16);assert.equal(state.version,2);
});

test('synth knobs persist with range validation and control envelope and resonance',()=>{
  const state=restoreSynth(null);Object.assign(state,{attack:.2,decay:1.2,sustain:.4,release:2,resonance:7});
  assert.deepEqual(restoreSynth(JSON.parse(JSON.stringify(state))),state);
  assert.equal(restoreSynth({...state,attack:-1,resonance:Infinity}).attack,.015);
  const context=audioMock(),voice=synthVoice(context,{},state,69,3,null,true);
  assert.equal(voice.filter.Q.value,7);
  assert.ok(voice.gain.gain.calls.some(c=>c[0]==='ramp'&&c[2]===3.2));
  assert.ok(voice.gain.gain.calls.some(c=>c[0]==='ramp'&&Math.abs(c[1]-.072)<1e-8&&c[2]===4.4));
  releaseVoice(context,voice,5);assert.equal(voice.source.stopped,7);
  assert.deepEqual(voice.gain.gain.calls.at(-1),['target',.0001,5,2/6.36]);
});
