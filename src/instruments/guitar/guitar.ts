import { pluckedBuffer } from "../../core/plucked-string.js";
import { audioContext } from "../../core/dom.js";
import { createObservable } from "../../core/observable.js";
import { STRING_KEYS, stringMidi } from "./guitar-notes.js";
export function createGuitar() {
  const observable = createObservable();
  const locked = new Map<number, number>();
  const fingers = new Map<number, { string: number; fret: number }>();
  const voices = new Set<AudioBufferSourceNode>();
  const flashes = new Map<number, ReturnType<typeof setTimeout>>();
  let context: AudioContext | null = null;
  let disposed = false;
  let status = "";
  function fret(string: number) {
    return Math.max(
      locked.get(string) ?? 0,
      ...Array.from(fingers.values())
        .filter((point) => point.string === string)
        .map((point) => point.fret),
    );
  }
  function releaseFingers() {
    fingers.clear();
    observable.notify();
  }
  async function pluck(string: number, strength = 0.8) {
    if (disposed) return;
    const midi = stringMidi(string, fret(string));
    try {
      context ??= audioContext();
      const audio = context;
      await audio.resume();
      if (disposed) return;
      const buffer = pluckedBuffer(audio, midi, strength);
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(audio.destination);
      if (voices.size >= 24) {
        const oldest = voices.values().next().value;
        oldest?.stop();
        if (oldest) voices.delete(oldest);
      }
      voices.add(source);
      source.onended = () => {
        voices.delete(source);
        source.disconnect();
      };
      source.start();
      const previous = flashes.get(string);
      if (previous) clearTimeout(previous);
      flashes.set(
        string,
        setTimeout(() => {
          flashes.delete(string);
          observable.notify();
        }, 450),
      );
      status = "";
      observable.notify();
    } catch {
      status = "Не удалось включить звук. Попробуй ещё раз.";
      observable.notify();
    }
  }
  function keydown(event: KeyboardEvent) {
    if (
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement
    )
      return;
    const string = STRING_KEYS.findIndex((code) => code === event.code);
    if (string >= 0) {
      event.preventDefault();
      void pluck(string);
    }
  }
  return {
    ...observable,
    fret,
    get status() {
      return status;
    },
    ringing: (string: number) => flashes.has(string),
    hold(pointer: number, string: number, position: number) {
      fingers.set(pointer, { string, fret: position });
      observable.notify();
    },
    releaseAll: releaseFingers,
    release(pointer: number) {
      fingers.delete(pointer);
      observable.notify();
    },
    toggle(string: number, position: number) {
      if (locked.get(string) === position) locked.delete(string);
      else locked.set(string, position);
      observable.notify();
    },
    clear() {
      locked.clear();
      releaseFingers();
    },
    pluck,
    connect() {
      disposed = false;
      window.addEventListener("keydown", keydown);
      window.addEventListener("blur", releaseFingers);
      return () => {
        disposed = true;
        window.removeEventListener("keydown", keydown);
        window.removeEventListener("blur", releaseFingers);
        for (const timer of flashes.values()) clearTimeout(timer);
        for (const source of voices) source.stop();
        voices.clear();
        flashes.clear();
        fingers.clear();
        if (context) void context.close();
      };
    },
  };
}
