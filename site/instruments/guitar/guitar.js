import { audioContext } from "../../core/dom.js?v=6afdd2300d9b";
import { createObservable } from "../../core/observable.js?v=6afdd2300d9b";
import { STRING_KEYS, stringMidi } from "./guitar-notes.js?v=6afdd2300d9b";
export function createGuitar() {
    const observable = createObservable();
    const locked = new Map();
    const fingers = new Map();
    const voices = new Set();
    const flashes = new Map();
    let context = null;
    let disposed = false;
    let status = "";
    function fret(string) {
        return Math.max(locked.get(string) ?? 0, ...Array.from(fingers.values())
            .filter((point) => point.string === string)
            .map((point) => point.fret));
    }
    function releaseFingers() {
        fingers.clear();
        observable.notify();
    }
    async function pluck(string, strength = 0.8) {
        if (disposed)
            return;
        const midi = stringMidi(string, fret(string));
        try {
            context ??= audioContext();
            const audio = context;
            await audio.resume();
            if (disposed)
                return;
            // Karplus–Strong: a short excitation circulates through a damped string.
            const frequency = 440 * 2 ** ((midi - 69) / 12);
            const period = Math.max(2, Math.round(audio.sampleRate / frequency - 0.5));
            const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 4), audio.sampleRate);
            const samples = buffer.getChannelData(0);
            for (let i = 0; i < period; i++)
                samples[i] = (Math.random() * 2 - 1) * strength * 0.6;
            for (let i = period; i < samples.length; i++)
                samples[i] =
                    0.497 * ((samples[i - period] ?? 0) + (samples[i - period + 1] ?? 0));
            const source = audio.createBufferSource();
            source.buffer = buffer;
            source.connect(audio.destination);
            if (voices.size >= 24) {
                const oldest = voices.values().next().value;
                oldest?.stop();
                if (oldest)
                    voices.delete(oldest);
            }
            voices.add(source);
            source.onended = () => {
                voices.delete(source);
                source.disconnect();
            };
            source.start();
            const previous = flashes.get(string);
            if (previous)
                clearTimeout(previous);
            flashes.set(string, setTimeout(() => {
                flashes.delete(string);
                observable.notify();
            }, 450));
            status = "";
            observable.notify();
        }
        catch {
            status = "Не удалось включить звук. Попробуй ещё раз.";
            observable.notify();
        }
    }
    function keydown(event) {
        if (event.repeat ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLSelectElement)
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
        ringing: (string) => flashes.has(string),
        hold(pointer, string, position) {
            fingers.set(pointer, { string, fret: position });
            observable.notify();
        },
        release(pointer) {
            fingers.delete(pointer);
            observable.notify();
        },
        toggle(string, position) {
            if (locked.get(string) === position)
                locked.delete(string);
            else
                locked.set(string, position);
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
                for (const timer of flashes.values())
                    clearTimeout(timer);
                for (const source of voices)
                    source.stop();
                voices.clear();
                flashes.clear();
                fingers.clear();
                if (context)
                    void context.close();
            };
        },
    };
}
