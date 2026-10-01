import { targetElement } from "./dom.js";
import type { PianoKey } from "./keyboard-map.js";
import { buildKeyMap } from "./keyboard-map.js";

export interface KeyInputOptions<V> {
  onNoteOn(key: PianoKey, source: string): V | Promise<V>;
  onNoteOff?(voice: V | undefined): void;
  onHighlight?(key: PianoKey, active: boolean): void;
}
interface HeldKey<V> {
  key: PianoKey;
  ready: boolean;
  released: boolean;
  voice: V | undefined;
}
export function bindKeyInput<V>({
  onNoteOn,
  onNoteOff = () => {},
  onHighlight = () => {},
}: KeyInputOptions<V>) {
  const keys = new Map(buildKeyMap().map((key) => [key.code, key]));
  const held = new Map<string, HeldKey<V>>();
  function end(source: string) {
    const entry = held.get(source);
    if (!entry) return;
    held.delete(source);
    entry.released = true;
    if (entry.ready) onNoteOff(entry.voice);
    if (![...held.values()].some((item) => item.key.code === entry.key.code))
      onHighlight(entry.key, false);
  }
  function start(key: PianoKey, source: string) {
    if (held.has(source)) return;
    const entry: HeldKey<V> = {
      key,
      ready: false,
      released: false,
      voice: undefined,
    };
    held.set(source, entry);
    onHighlight(key, true);
    try {
      Promise.resolve(onNoteOn(key, source))
        .then((voice) => {
          entry.voice = voice;
          entry.ready = true;
          if (entry.released) onNoteOff(voice);
        })
        .catch(() => end(source));
    } catch {
      end(source);
    }
  }
  function releaseAll() {
    for (const source of held.keys()) end(source);
  }
  const keydown = (event: KeyboardEvent) => {
    if (
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      targetElement(event)?.closest(
        'input:not([type="range"]), select, textarea, [contenteditable="true"]',
      )
    )
      return;
    const key = keys.get(event.code);
    if (!key) return;
    event.preventDefault();
    start(key, `keyboard:${event.code}`);
  };
  const keyup = (event: KeyboardEvent) => end(`keyboard:${event.code}`);
  const visibility = () => {
    if (document.hidden) releaseAll();
  };
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  window.addEventListener("blur", releaseAll);
  window.addEventListener("pagehide", releaseAll);
  document.addEventListener("visibilitychange", visibility);
  return {
    start,
    end,
    releaseAll,
    dispose() {
      releaseAll();
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("pagehide", releaseAll);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
