import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createSequencerEngine } from '../site/core/sequencer-engine.js';
const dom=new JSDOM('',{url:'https://example.org/iskra/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.localStorage=dom.window.localStorage;
function engine(prepare){const steps=[],stops=[];const model=createSequencerEngine({prepare,context:()=>({currentTime:1}),onStep:step=>steps.push(step),onVisual(){},onChange(){},onReset(){},onStop:()=>stops.push(true)});return {model,steps,stops};}
test('React controller stop and unmount cancel a pending resume without scheduling notes',async()=>{
  let ready;const {model,steps}=engine(()=>new Promise(resolve=>{ready=resolve;}));
  const cleanup=model.connect(),pending=model.toggle();assert.equal(model.starting,true);
  await model.toggle();cleanup();ready();await pending;
  assert.equal(model.running,false);assert.equal(model.starting,false);assert.deepEqual(steps,[]);
  await model.toggle();assert.deepEqual(steps,[]);
});
test('engine can retry failed audio preparation and stops scheduling on disposal',async()=>{
  let attempts=0;const {model,steps}=engine(async()=>{if(++attempts===1)throw Error('resume failed');});
  const cleanup=model.connect();await model.toggle();assert.equal(model.failed,true);assert.equal(model.starting,false);
  await model.toggle();assert.equal(model.running,true);assert.equal(model.failed,false);assert.ok(steps.length>0);
  cleanup();const count=steps.length;await new Promise(resolve=>setTimeout(resolve,60));
  assert.equal(model.running,false);assert.equal(steps.length,count);
});
test('tempo updates arrive through the shared transport and reconnect creates one active engine',async()=>{
  const {model}=engine(async()=>{});
  let cleanup=model.connect();await model.setTempo(140);
  // setTempo queues a Web Lock only when the browser provides one.
  await Promise.resolve();assert.equal(model.bpm,140);
  cleanup();cleanup=model.connect();assert.equal(model.bpm,140);
  await model.toggle();assert.equal(model.running,true);await model.toggle();assert.equal(model.running,false);cleanup();
});

test('stop cancels pending start and repeated clicks cannot create concurrent schedulers',async()=>{
  const requests=[];const {model,steps}=engine(()=>new Promise(resolve=>requests.push(resolve)));
  const cleanup=model.connect();let pending=model.toggle();await model.toggle();assert.equal(requests.length,1);
  model.stop();requests[0]();await pending;assert.equal(model.running,false);assert.deepEqual(steps,[]);
  pending=model.toggle();assert.equal(requests.length,2);requests[1]();await pending;assert.equal(model.running,true);
  cleanup();
});

test('muted instruments advance the visual clock without preparing audio',async()=>{
  let prepared=0,contexts=0;const visuals=[],notes=[];
  const model=createSequencerEngine({prepare:async()=>{prepared++;},context:()=>{contexts++;return {currentTime:1};},onStep:step=>notes.push(step),onVisual:step=>visuals.push(step),onChange(){},onReset(){},onStop(){}});
  const cleanup=model.connect();
  try {
    await new Promise(resolve=>setTimeout(resolve,220));
    assert.ok(visuals.length>=2);assert.equal(prepared,0);assert.equal(contexts,0);assert.equal(notes.length,0);
    await model.toggle();assert.equal(model.running,true);assert.equal(prepared,1);
    model.stop();const before=visuals.length,count=notes.length;
    await new Promise(resolve=>setTimeout(resolve,220));
    assert.ok(visuals.length>before);assert.equal(notes.length,count);assert.equal(model.running,false);
  } finally {cleanup();}
});
