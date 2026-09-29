import assert from "node:assert/strict";
import { test } from "node:test";
import { buildKeyMap } from "./piano.mjs";

test("две октавы покрывают нужные физические клавиши без повторов", () => {
  const keys = buildKeyMap();
  assert.equal(keys.length, 24);
  assert.equal(new Set(keys.map(key => key.code)).size, 24);
  assert.deepEqual(keys.filter(key => key.row === "lower-keyboard" && !key.black).map(key => key.code),
    ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"]);
  assert.deepEqual(keys.filter(key => key.row === "lower-keyboard" && key.black).map(key => key.code),
    ["KeyS", "KeyD", "KeyG", "KeyH", "KeyJ"]);
  assert.deepEqual(keys.filter(key => key.row === "upper-keyboard" && !key.black).map(key => key.code),
    ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU"]);
  assert.deepEqual(keys.filter(key => key.row === "upper-keyboard" && key.black).map(key => key.code),
    ["Digit2", "Digit3", "Digit5", "Digit6", "Digit7"]);
});

test("ноты верхнего ряда на октаву выше нижнего", () => {
  const keys = buildKeyMap();
  for (const lower of keys.filter(key => key.row === "lower-keyboard")) {
    const upper = keys.find(key => key.row === "upper-keyboard" && key.note === lower.note);
    assert.ok(Math.abs(upper.frequency / lower.frequency - 2) < 1e-12);
  }
});
