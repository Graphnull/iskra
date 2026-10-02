import { pianoTone } from "../../core/piano-tone.js?v=f1d1aaff72ac";
import { audioContext as createAudioContext } from "../../core/dom.js?v=f1d1aaff72ac";
import { createObservable } from "../../core/observable.js?v=f1d1aaff72ac";
export { buildKeyMap } from "../../core/keyboard-map.js?v=f1d1aaff72ac";
export function releaseVoice(voice, now) {
    voice.release.gain.setValueAtTime(1, now);
    voice.release.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    for (const oscillator of voice.oscillators)
        oscillator.stop(now + 0.77);
}
export function createPiano() {
    const observable = createObservable(), voices = new Map();
    let context = null, disposed = false;
    let lifecycle = 0;
    function release(source) {
        if (source === undefined || !context)
            return;
        const voice = voices.get(source);
        if (!voice)
            return;
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
                    for (const source of voices.keys())
                        release(source);
                    if (context.state !== "closed")
                        void context.close();
                }
            };
        },
        async onNoteOn(key, source) {
            if (disposed)
                return;
            if (!context || context.state === "closed")
                context = createAudioContext();
            const audio = context, activeLifecycle = lifecycle;
            await audio.resume();
            if (disposed || activeLifecycle !== lifecycle)
                return;
            const voice = pianoTone(audio, audio.destination, key.frequency, audio.currentTime);
            voices.set(source, { ...voice, code: key.code });
            return source;
        },
        onNoteOff: release,
    };
}
