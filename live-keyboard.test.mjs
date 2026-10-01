import test from 'node:test';
import assert from 'node:assert/strict';
import { bindKeyInput } from './live-keyboard.mjs';
import { buildKeyMap } from './keyboard-map.mjs';
import { DRUM_BINDINGS, drumForMidi } from './drum-notes.mjs';

test('all canonical drum notes match the shared physical piano keys across octaves', () => {
  const keys = buildKeyMap();
  DRUM_BINDINGS.forEach((binding, row) => {
    const key = keys.find(key=>key.label === binding.key);
    assert.equal(key.midi, binding.midi);
    assert.equal(drumForMidi(key.midi), row);
    assert.equal(drumForMidi(key.midi + 12), row);
  });
});
test('live input releases a note even if audio initialization finishes after keyup', async () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const handlers = {};
  globalThis.document = { addEventListener(name, handler) { handlers[name] = handler; } };
  globalThis.window = { addEventListener() {} };
  try {
    let resolveVoice;
    const released = [];
    bindKeyInput({ onNoteOn: () => new Promise(resolve=>{resolveVoice=resolve;}), onNoteOff: voice=>released.push(voice) });
    const event = { code:'KeyZ', target:{closest:()=>false}, preventDefault() {} };
    handlers.keydown(event);
    handlers.keyup(event);
    resolveVoice('voice');
    await Promise.resolve();
    assert.deepEqual(released,['voice']);
    handlers.keydown({...event,target:{closest:()=>true}});
    handlers.keydown({...event,ctrlKey:true});
    assert.deepEqual(released,['voice']);
  } finally { globalThis.document=previousDocument; globalThis.window=previousWindow; }
});

test('range focus keeps musical key input available while keyup and blur release held notes',async()=>{
  const previousDocument=globalThis.document,previousWindow=globalThis.window,handlers={},windowHandlers={};
  globalThis.document={addEventListener(name,handler){handlers[name]=handler;}};
  globalThis.window={addEventListener(name,handler){windowHandlers[name]=handler;}};
  try{
    const released=[];let starts=0;
    bindKeyInput({onNoteOn:()=>++starts,onNoteOff:voice=>released.push(voice)});
    const target={closest:selector=>selector.includes('input:not')?null:true};
    const event={code:'KeyZ',target,preventDefault(){}};
    handlers.keydown(event);await Promise.resolve();
    assert.equal(starts,1);assert.deepEqual(released,[]);
    handlers.keyup(event);assert.deepEqual(released,[1]);
    handlers.keydown(event);await Promise.resolve();windowHandlers.blur();assert.deepEqual(released,[1,2]);
  }finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});
