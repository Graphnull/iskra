import test from 'node:test';
import assert from 'node:assert/strict';
import {synthPosition,restoreSynth,putNote,noteAt,activeSynthNotes} from './synth-sequence.mjs';
import {createMicrophone,sampleBounds} from './microphone.mjs';
import {synthVoice,releaseVoice} from './synth-audio.mjs';

test('256-step song boundaries, sustained join and section isolation',()=>{
  assert.deepEqual(synthPosition(63),{section:0,column:63});
  assert.deepEqual(synthPosition(64),{section:1,column:0});
  assert.deepEqual(synthPosition(255),{section:3,column:63});
  assert.deepEqual(synthPosition(256),{section:0,column:0});
  const state=restoreSynth(null);state.sections[0]=putNote([],15,0,64);
  assert.equal(activeSynthNotes(state,48)[0].remaining,16);
  assert.equal(activeSynthNotes(state,64).length,0);
  state.selected=2;state.page=3;state.length=64;state.cutoff=1000;
  assert.deepEqual(restoreSynth(JSON.parse(JSON.stringify(state))),state);
});
test('long notes cross pages; overlapping replacement and section end clipping',()=>{
  let notes=putNote([],3,12,32);
  assert.equal(noteAt(notes,3,32).length,32);
  notes=putNote(notes,3,20,4);assert.equal(notes.length,1);
  notes=putNote(notes,4,20,8);assert.equal(notes.length,2);
  notes=putNote(notes,2,60,64);assert.equal(noteAt(notes,2,63).length,4);
  const damaged=restoreSynth(null);damaged.sections[0]=[{row:0,start:63,length:2}];
  assert.deepEqual(restoreSynth(damaged),restoreSynth(null));
});
function audioMock(){
  const nodes=[]; const parameter=()=>({value:0,calls:[],setValueAtTime(...a){this.calls.push(['set',...a]);},exponentialRampToValueAtTime(...a){this.calls.push(['ramp',...a]);},cancelScheduledValues(...a){this.calls.push(['cancel',...a]);},setTargetAtTime(...a){this.calls.push(['target',...a]);}});
  const node=()=>{const n={connect(){return this;},disconnect(){},frequency:parameter(),playbackRate:parameter(),gain:parameter(),Q:parameter(),start(t){this.started=t;},stop(t){this.stopped=t;}};nodes.push(n);return n;};
  return {currentTime:2,createBufferSource:node,createOscillator:node,createGain:node,createBiquadFilter:node,nodes};
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
