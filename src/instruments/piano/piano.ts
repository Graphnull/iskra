import { pianoTone } from "../../core/piano-tone.js";
import { audioContext as createAudioContext } from "../../core/dom.js";
import { createObservable } from "../../core/observable.js";
import type { PianoKey } from "../../core/keyboard-map.js";
export { buildKeyMap } from "../../core/keyboard-map.js";
export interface PianoVoice {
  release: GainNode;
  oscillators: OscillatorNode[];
  code: string;
}
export function releaseVoice(voice: PianoVoice, now: number): void {
  voice.release.gain.setValueAtTime(1, now);
  voice.release.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
  for (const oscillator of voice.oscillators) oscillator.stop(now + 0.77);
}
export function createPiano() {
  const observable = createObservable(),
    voices = new Map<string, PianoVoice>();
  let context: AudioContext | null = null,
    disposed = false;
  let lifecycle = 0;
  function release(source: string | undefined) {
    if (source === undefined || !context) return;
    const voice = voices.get(source);
    if (!voice) return;
    voices.delete(source);
    releaseVoice(voice, context.currentTime);
  }
  return {
    ...observable,
    connect() {
      disposed = false;
      lifecycle++;
      return () => {
        disposed = true;
        lifecycle++;
        if (context) {
          for (const source of voices.keys()) release(source);
          if (context.state !== "closed") void context.close();
        }
      };
    },
    async onNoteOn(key: PianoKey, source: string) {
      if (disposed) return;
      if (!context || context.state === "closed")
        context = createAudioContext();
      const audio = context,
        activeLifecycle = lifecycle;
      await audio.resume();
      if (disposed || activeLifecycle !== lifecycle) return;
      const voice = pianoTone(
        audio,
        audio.destination,
        key.frequency,
        audio.currentTime,
      );
      voices.set(source, { ...voice, code: key.code });
      return source;
    },
    onNoteOff: release,
  };
}
