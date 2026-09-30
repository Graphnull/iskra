import test from 'node:test';
import assert from 'node:assert/strict';
import { framePosition, storageKeyFor } from './widget-storage.mjs';
function root() { const window = { length: 0 }; window.parent = window; return window; }
function child(parent) { const window = { parent, length: 0 }; parent[parent.length++] = window; return window; }
test('identical widgets keep separate, stable keys after parent reload', () => {
  const parent = root(), first = child(parent), second = child(parent);
  const keys = [first, second].map(view=>storageKeyFor('notes',view,'https://host.example/','random'));
  assert.notEqual(keys[0], keys[1]);
  const reloaded = root();
  assert.equal(keys[0], storageKeyFor('notes',child(reloaded),'https://host.example/','new-random'));
  assert.equal(keys[1], storageKeyFor('notes',child(reloaded),'https://host.example/','new-random'));
});
test('nested frames differ and standalone legacy saves keep their keys', () => {
  const parent=root(), first=child(parent), second=child(parent);
  const nestedFirst=child(first), nestedSecond=child(second);
  assert.deepEqual(framePosition(nestedFirst),[0,0]);
  assert.deepEqual(framePosition(nestedSecond),[1,0]);
  assert.equal(storageKeyFor('notes',parent,'','random'),'notes');
  assert.notEqual(storageKeyFor('notes',first,'https://a.example/','r'),storageKeyFor('notes',first,'https://b.example/','r'));
});
test('unidentifiable frames cannot overwrite a standalone or another fallback save', () => {
  const view = { get parent() { throw new Error('restricted'); } };
  assert.notEqual(storageKeyFor('notes',view,'','first'),storageKeyFor('notes',view,'','second'));
  assert.notEqual(storageKeyFor('notes',view,'','first'),'notes');
});
