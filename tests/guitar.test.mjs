import test from 'node:test';
import assert from 'node:assert/strict';
import { crossedStrings, stringMidi, noteName } from '../site/instruments/guitar/guitar-notes.js';
import { createGuitar } from '../site/instruments/guitar/guitar.js';
test('strums cross six strings in either direction without repeating stationary touches', () => {
  assert.deepEqual(crossedStrings(0,1),[0,1,2,3,4,5]);
  assert.deepEqual(crossedStrings(1,0),[5,4,3,2,1,0]);
  assert.deepEqual(crossedStrings(.1,.1),[]);
  assert.deepEqual(crossedStrings(0,.25),[0,1]);
  assert.deepEqual(crossedStrings(.25,.3),[]);
});
test('multiple fingers use the highest fret and restore lower held or locked frets', () => {
  const model=createGuitar();
  model.toggle(0,1);model.hold(10,0,3);model.hold(11,0,5);model.hold(12,1,2);
  assert.equal(model.fret(0),5);assert.equal(model.fret(1),2);
  model.release(11);assert.equal(model.fret(0),3);
  model.release(10);assert.equal(model.fret(0),1);
  model.toggle(0,1);assert.equal(model.fret(0),0);
  model.clear();assert.equal(model.fret(1),0);
  assert.equal(stringMidi(0,5),45);assert.equal(noteName(stringMidi(5,0)),'E4');
});
