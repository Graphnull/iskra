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
