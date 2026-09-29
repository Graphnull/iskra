import assert from "node:assert/strict";
import { test } from "node:test";
import { buildKeyMap, releaseVoice } from "./piano.mjs";

test("оба ряда покрывают нужные физические клавиши без повторов", () => {
  const keys = buildKeyMap();
  assert.equal(keys.length, 37);
  assert.equal(new Set(keys.map(key => key.code)).size, 37);
  assert.deepEqual(keys.filter(key => key.row === "lower-keyboard" && !key.black).map(key => key.code),
    ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"]);
  assert.deepEqual(keys.filter(key => key.row === "lower-keyboard" && key.black).map(key => key.code),
    ["KeyS", "KeyD", "KeyG", "KeyH", "KeyJ", "KeyL", "Semicolon"]);
  assert.deepEqual(keys.filter(key => key.row === "upper-keyboard" && !key.black).map(key => key.code),
    ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight"]);
  assert.deepEqual(keys.filter(key => key.row === "upper-keyboard" && key.black).map(key => key.code),
    ["Digit2", "Digit3", "Digit5", "Digit6", "Digit7", "Digit9", "Digit0", "Equal"]);
});

test("ноты верхнего ряда на октаву выше нижнего", () => {
  const keys = buildKeyMap();
  for (const lower of keys.filter(key => key.row === "lower-keyboard" && key.octave === 4)) {
    const upper = keys.find(key => key.row === "upper-keyboard" && key.note === lower.note);
    assert.ok(Math.abs(upper.frequency / lower.frequency - 2) < 1e-12);
  }
  for (const [lowerCode, upperCode] of [["Comma", "KeyQ"], ["Period", "KeyW"], ["Slash", "KeyE"], ["KeyL", "Digit2"], ["Semicolon", "Digit3"]]) {
    assert.equal(keys.find(key => key.code === lowerCode).frequency, keys.find(key => key.code === upperCode).frequency);
  }
});

test("после отпускания нота затухает и генераторы выключаются позже", () => {
  const events = [];
  const gain = {
    setValueAtTime(value, time) { events.push(["set", value, time]); },
    exponentialRampToValueAtTime(value, time) { events.push(["fade", value, time]); },
  };
  const oscillator = { stop(time) { events.push(["stop", time]); } };
  releaseVoice({ release: { gain }, oscillators: [oscillator, oscillator] }, 10);
  assert.deepEqual(events[0], ["set", 1, 10]);
  assert.ok(events[1][2] - 10 >= 0.5);
  assert.ok(events[2][1] > events[1][2]);
  assert.equal(events.filter(event => event[0] === "stop").length, 2);
});
