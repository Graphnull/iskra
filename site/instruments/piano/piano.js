import { audioContext as createAudioContext } from "../../core/dom.js?v=86d6e3e520cc";
import { createObservable } from "../../core/observable.js?v=86d6e3e520cc";
export { buildKeyMap } from "../../core/keyboard-map.js?v=86d6e3e520cc";
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
            const fundamental = audio.createOscillator(), overtone = audio.createOscillator(), overtoneLevel = audio.createGain(), tone = audio.createGain(), release = audio.createGain();
            fundamental.type = "triangle";
            fundamental.frequency.value = key.frequency;
            overtone.type = "sine";
            overtone.frequency.value = key.frequency * 2;
            overtoneLevel.gain.value = 0.16;
            const now = audio.currentTime;
            tone.gain.setValueAtTime(0.0001, now);
            tone.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
            tone.gain.exponentialRampToValueAtTime(0.07, now + 0.35);
            tone.gain.exponentialRampToValueAtTime(0.035, now + 2);
            release.gain.value = 1;
            fundamental.connect(tone);
            overtone.connect(overtoneLevel).connect(tone);
            tone.connect(release).connect(audio.destination);
            fundamental.start();
            overtone.start();
            voices.set(source, {
                release,
                oscillators: [fundamental, overtone],
                code: key.code,
            });
            let remaining = 2;
            const ended = () => {
                if (--remaining === 0) {
                    fundamental.disconnect();
                    overtone.disconnect();
                    overtoneLevel.disconnect();
                    tone.disconnect();
                    release.disconnect();
                }
            };
            fundamental.onended = ended;
            overtone.onended = ended;
            return source;
        },
        onNoteOff: release,
    };
}
