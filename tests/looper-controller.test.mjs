import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createLooper } from '../site/instruments/looper/looper.js';
const dom=new JSDOM('',{url:'https://example.org/iskra/?mode=looper'});
for(const name of ['window','document','location','localStorage','sessionStorage'])globalThis[name]=dom.window[name];
const captureNodes=[],sources=[];let tracksStopped=0;
const connectable=()=>({connect(){return this;},disconnect(){}});
class Buffer { constructor(channels,length,rate){this.duration=length/rate;this.sampleRate=rate;this.channels=Array.from({length:channels},()=>new Float32Array(length));}copyToChannel(data,index){this.channels[index].set(data);}getChannelData(index){return this.channels[index];} }
class Audio {
 currentTime=10;sampleRate=1000;destination={};audioWorklet={addModule:async()=>{}};
 resume(){return Promise.resolve();}close(){return Promise.resolve();}
 createGain(){return {...connectable(),gain:{value:0,setTargetAtTime(){}}};}
 createBuffer(...args){return new Buffer(...args);}
 createMediaStreamSource(){return connectable();}
 createBufferSource(){const source={...connectable(),playbackRate:{value:1},start(...args){this.started=args;},stop(){this.stopped=true;}};sources.push(source);return source;}
 async decodeAudioData(){return new Buffer(1,8000,1000);}
}
window.AudioContext=Audio;
globalThis.AudioWorkletNode=class {constructor(){this.port={onmessage:null};captureNodes.push(this);}connect(){return this;}disconnect(){}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){tracksStopped++;}}]})}}});
function fresh(){localStorage.clear();sessionStorage.clear();captureNodes.length=0;sources.length=0;tracksStopped=0;}
test('recorded layer retains current phase; muting does not stop the clock and disposal closes capture',async t=>{
 fresh();t.mock.method(Date,'now',()=>1000031);const model=createLooper(),cleanup=model.connect();
 try {
   model.engine.setTempo(120);await Promise.resolve();await model.record();assert.equal(model.recording,true);
   captureNodes[0].port.onmessage({data:{time:10,samples:new Float32Array([1,2,3,4])}});
   await model.record();assert.equal(model.layers.length,1);assert.equal(tracksStopped,1);
   const samples=model.layers[0].buffer.getChannelData(0);assert.deepEqual([...samples.slice(31,35)],[1,2,3,4]);assert.equal(samples[0],0);
   assert.ok(sources.at(-1).started);model.toggleLayer(model.layers[0].id);assert.equal(model.layers[0].muted,true);
   await model.engine.toggle();assert.equal(model.engine.running,false);assert.ok(model.position);
   await model.record();cleanup();assert.equal(tracksStopped,2);assert.equal(captureNodes.at(-1).port.onmessage,null);
 } finally {cleanup();}
});
test('popup layer accepts only the registered window and session, then acknowledges receipt',async()=>{
 fresh();const model=createLooper(),cleanup=model.connect();const sent=[];let url;
 const popup={postMessage:data=>sent.push(data)};window.open=value=>{url=new URL(value);return popup;};
 try {
  model.openRecorder();await Promise.resolve();const session=url.searchParams.get('session');assert.equal(url.searchParams.get('mode'),'looper-recorder');
  const deliver=(source,origin)=>window.dispatchEvent(new window.MessageEvent('message',{source,origin,data:{type:'loop-layer',session,blob:new Blob(['loop'])}}));
  deliver({},location.origin);deliver(popup,'https://wrong.example');await new Promise(r=>setImmediate(r));assert.equal(model.layers.length,0);
  deliver(popup,location.origin);await new Promise(r=>setImmediate(r));assert.equal(model.layers.length,1);assert.equal(sent[0].type,'loop-layer-received');
  deliver(popup,location.origin);await new Promise(r=>setImmediate(r));assert.equal(model.layers.length,1);
 } finally {cleanup();}
});
