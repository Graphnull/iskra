import { readStored, writeStored } from "../../core/storage.js?v=f1d1aaff72ac";
import { restoreSampleSettings } from "../../core/sample-edit.js?v=f1d1aaff72ac";
import { audioContext } from "../../core/dom.js?v=f1d1aaff72ac";
import { at, isRecord } from "../../core/guards.js?v=f1d1aaff72ac";
import { createObservable } from "../../core/observable.js?v=f1d1aaff72ac";
import { createSequencerEngine } from "../../core/sequencer-engine.js?v=f1d1aaff72ac";
import { widgetStorageKey } from "../../core/widget-storage.js?v=f1d1aaff72ac";
import { createMicrophone, microphoneError } from "../../core/microphone.js?v=f1d1aaff72ac";
import { sampleStore } from "../../core/sample-store.js?v=f1d1aaff72ac";
import { drumTrackForMidi, decodeDrumSample, drumSampleVoice, } from "./drum-samples.js?v=f1d1aaff72ac";
import { createSections, sectionPosition } from "../../core/sections.js?v=f1d1aaff72ac";
export const TRACKS = [
    "Бочка",
    "Снейр",
    "Хлопок",
    "Хэт",
    "Откр. хэт",
    "Том",
    "Крэш",
    "Рим",
    "Семпл 1",
    "Семпл 2",
    "Семпл 3",
    "Семпл 4",
];
export function createDrums() {
    const observable = createObservable(), sequence = createSections("drum", TRACKS.length, { previousRows: [8] });
    const samples = Array.from({ length: 4 }, () => null);
    const sampleBlobs = Array.from({ length: 4 }, () => null);
    const sampleKeys = Array.from({ length: 4 }, (_, slot) => widgetStorageKey(`drum-sample-${slot + 1}-v1`));
    const settingsKey = widgetStorageKey("drum-sample-settings-v1");
    const savedSettings = readStored(settingsKey, []);
    const sampleSettings = Array.from({ length: 4 }, (_, slot) => restoreSampleSettings(Array.isArray(savedSettings) ? savedSettings[slot] : null));
    let editingSlot = null;
    const voices = new Set();
    let context, output, noiseBuffer, playing = null;
    let requestedSlot = 0, status = "", recordState = "idle", recordWindow = false, disposed = false;
    let lifecycle = 0;
    const recordWindows = new Map();
    function attach(source, time, duration, level, filter) {
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        if (filter)
            source.connect(filter).connect(gain);
        else
            source.connect(gain);
        gain.connect(output);
        const voice = { source, time };
        voices.add(voice);
        source.onended = () => {
            voices.delete(voice);
            source.disconnect();
            gain.disconnect();
            filter?.disconnect();
        };
        source.start(time);
        source.stop(time + duration + 0.02);
    }
    function tone(time, frequency, endFrequency, duration, level, type = "sine") {
        const source = context.createOscillator();
        source.type = type;
        source.frequency.setValueAtTime(frequency, time);
        source.frequency.exponentialRampToValueAtTime(endFrequency, time + duration * 0.7);
        attach(source, time, duration, level);
    }
    function noise(time, duration, level, frequency, type = "highpass") {
        const source = context.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = context.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        attach(source, time, duration, level, filter);
    }
    function hit(row, time) {
        if (row >= 8) {
            const voice = drumSampleVoice(context, output, samples[row - 8], time, sampleSettings[row - 8]);
            if (!voice)
                return;
            voices.add(voice);
            voice.source.onended = () => {
                voices.delete(voice);
                voice.source.disconnect();
                voice.gain.disconnect();
            };
            return;
        }
        switch (row) {
            case 0:
                tone(time, 160, 42, 0.36, 0.85);
                break;
            case 1:
                tone(time, 185, 110, 0.13, 0.28);
                noise(time, 0.2, 0.55, 1500);
                break;
            case 2:
                for (let i = 0; i < 3; i++)
                    noise(time + i * 0.014, i === 2 ? 0.15 : 0.025, 0.5, 1600, "bandpass");
                break;
            case 3:
                noise(time, 0.055, 0.3, 6500);
                break;
            case 4:
                noise(time, 0.35, 0.3, 6500);
                break;
            case 5:
                tone(time, 145, 65, 0.28, 0.6);
                break;
            case 6:
                noise(time, 0.9, 0.4, 4500);
                break;
            case 7:
                tone(time, 1200, 900, 0.035, 0.15, "square");
                break;
        }
    }
    function prepareAudio() {
        if (!context || context.state === "closed")
            context = audioContext();
        if (!output || output.context !== context) {
            const compressor = context.createDynamicsCompressor();
            compressor.threshold.value = -14;
            compressor.ratio.value = 8;
            output = context.createGain();
            output.gain.value = 0.45;
            output.connect(compressor).connect(context.destination);
            noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++)
                data[i] = Math.random() * 2 - 1;
        }
        return context;
    }
    async function ensureAudio() {
        await prepareAudio().resume();
    }
    const engine = createSequencerEngine({
        prepare: ensureAudio,
        context: () => context,
        onChange: observable.notify,
        onStep({ step, time }) {
            const { section, column } = sectionPosition(step);
            for (let row = 0; row < TRACKS.length; row++)
                if (at(at(sequence.state.patterns, section), row)[column])
                    hit(row, time);
        },
        onVisual(step) {
            const position = sectionPosition(step);
            if (playing?.section !== position.section)
                sequence.state.selected = position.section;
            playing = position;
            observable.notify();
        },
        onReset() {
            for (const voice of voices)
                if (voice.time > context.currentTime)
                    voice.source.stop();
        },
        onStop() {
            playing = null;
            if (context)
                for (const voice of voices)
                    voice.source.stop(context.currentTime + 0.01);
        },
    });
    function showStatus(message) {
        status = message;
        observable.notify();
    }
    async function installSample(slot, blob, persist = true, settings) {
        const activeLifecycle = lifecycle;
        const buffer = await decodeDrumSample(prepareAudio(), blob);
        if (disposed || activeLifecycle !== lifecycle)
            return;
        samples[slot] = buffer;
        sampleBlobs[slot] = blob;
        sampleSettings[slot] = restoreSampleSettings(persist ? settings : sampleSettings[slot], buffer.duration);
        if (persist) {
            editingSlot = slot;
            writeStored(settingsKey, sampleSettings);
        }
        observable.notify();
        if (!persist)
            return;
        recordWindow = false;
        showStatus(`Семпл ${slot + 1} · ${buffer.duration.toFixed(1)} с · готов`);
        try {
            await sampleStore(at(sampleKeys, slot), blob);
        }
        catch {
            showStatus(`Семпл ${slot + 1} готов · браузер не смог сохранить запись`);
        }
    }
    const mic = createMicrophone({
        onState(state, seconds) {
            recordState = state;
            if (state === "requesting")
                showStatus(`Семпл ${requestedSlot + 1} · разреши микрофон`);
            if (state === "recording")
                showStatus(`Семпл ${requestedSlot + 1} · запись ${seconds} с · нажми ■ для остановки`);
            if (state === "processing")
                showStatus(`Семпл ${requestedSlot + 1} · обработка…`);
            observable.notify();
        },
        onBlob: (blob) => installSample(requestedSlot, blob),
        onError(error) {
            recordWindow = true;
            showStatus(microphoneError(error));
        },
    });
    function openRecordWindow(slot = requestedSlot) {
        engine.stop();
        const session = crypto.randomUUID(), url = new URL(location.href);
        url.searchParams.set("mode", "recorder");
        url.searchParams.set("target", "drums");
        url.searchParams.set("session", session);
        url.searchParams.set("slot", String(slot));
        const popup = window.open(url.href, "_blank", "popup,width=376,height=376");
        if (popup) {
            recordWindow = false;
            for (const [key, entry] of recordWindows)
                if (entry.popup.closed)
                    recordWindows.delete(key);
            recordWindows.set(session, { popup, slot });
            showStatus(`Семпл ${slot + 1} · запись и настройки в открывшемся окне`);
        }
        else {
            recordWindow = true;
            showStatus("Разреши всплывающее окно для записи и нажми ещё раз.");
        }
    }
    async function message(event) {
        const data = event.data;
        if (!isRecord(data) || typeof data.session !== "string")
            return;
        const entry = recordWindows.get(data.session);
        if (event.origin !== location.origin ||
            !entry ||
            event.source !== entry.popup)
            return;
        if (data.type === "sample-ready") {
            const activeLifecycle = lifecycle;
            try {
                const blob = sampleBlobs[entry.slot] ??
                    (await sampleStore(at(sampleKeys, entry.slot)));
                if (disposed || lifecycle !== activeLifecycle)
                    return;
                entry.popup.postMessage(blob instanceof Blob
                    ? {
                        type: "sample-loaded",
                        session: data.session,
                        blob,
                        settings: at(sampleSettings, entry.slot),
                    }
                    : { type: "sample-empty", session: data.session }, location.origin);
            }
            catch {
                if (!disposed && lifecycle === activeLifecycle)
                    entry.popup.postMessage({ type: "sample-empty", session: data.session }, location.origin);
            }
            return;
        }
        if (data.type !== "drum-sample" || !(data.blob instanceof Blob))
            return;
        try {
            await installSample(entry.slot, data.blob, true, data.settings);
            editingSlot = null;
            observable.notify();
            if (!disposed)
                entry.popup.postMessage({ type: "sample-received", session: data.session }, location.origin);
        }
        catch (error) {
            if (disposed)
                return;
            showStatus(microphoneError(error));
            entry.popup.postMessage({
                type: "sample-failed",
                session: data.session,
                error: microphoneError(error),
            }, location.origin);
        }
    }
    function pagehide() {
        mic.dispose();
        recordState = "idle";
        observable.notify();
    }
    return {
        ...observable,
        engine,
        sequence,
        samples,
        sampleSettings,
        get editingSlot() {
            return editingSlot;
        },
        openSample(slot) {
            if (slot !== null && !samples[slot])
                return;
            editingSlot = slot;
            observable.notify();
        },
        setSampleSettings(slot, patch) {
            const buffer = samples[slot];
            if (!buffer)
                return;
            sampleSettings[slot] = restoreSampleSettings({ ...sampleSettings[slot], ...patch }, buffer.duration);
            writeStored(settingsKey, sampleSettings);
            observable.notify();
        },
        get playing() {
            return playing;
        },
        get status() {
            return status;
        },
        get recordWindow() {
            return recordWindow;
        },
        get recordState() {
            return recordState;
        },
        get requestedSlot() {
            return requestedSlot;
        },
        connect() {
            disposed = false;
            const activeLifecycle = ++lifecycle;
            recordState = "idle";
            sequence.save();
            const disconnect = engine.connect();
            window.addEventListener("message", message);
            window.addEventListener("pagehide", pagehide);
            sampleKeys.forEach((key, slot) => {
                sampleStore(key)
                    .then(async (blob) => {
                    if (!disposed &&
                        activeLifecycle === lifecycle &&
                        blob instanceof Blob &&
                        !samples[slot])
                        await installSample(slot, blob, false);
                })
                    .catch(() => { });
            });
            return () => {
                disposed = true;
                lifecycle++;
                disconnect();
                mic.dispose();
                recordWindows.clear();
                voices.clear();
                window.removeEventListener("message", message);
                window.removeEventListener("pagehide", pagehide);
                if (context && context.state !== "closed")
                    void context.close();
            };
        },
        select(section) {
            sequence.state.selected = section;
            sequence.save();
            observable.notify();
        },
        edit(row, column) {
            const notes = at(sequence.pattern, row);
            notes[column] = !notes[column];
            sequence.save();
            observable.notify();
        },
        clear() {
            engine.stop();
            for (const row of sequence.pattern)
                row.fill(false);
            sequence.save();
            observable.notify();
        },
        async preview(slot) {
            const activeLifecycle = lifecycle;
            try {
                await ensureAudio();
                if (!disposed && activeLifecycle === lifecycle)
                    hit(8 + slot, context.currentTime);
            }
            catch (error) {
                showStatus(microphoneError(error));
            }
        },
        record(slot) {
            if (mic.recording) {
                mic.stop();
                return;
            }
            if (recordState !== "idle")
                return;
            requestedSlot = slot;
            engine.stop();
            openRecordWindow(slot);
        },
        openRecordWindow: () => openRecordWindow(),
        labelFor: (key) => `${key.note}${key.octave} · ${at(TRACKS, drumTrackForMidi(key.midi))}`,
        async onNoteOn(key) {
            if (disposed)
                return;
            const activeLifecycle = lifecycle;
            await ensureAudio();
            if (!disposed && activeLifecycle === lifecycle)
                hit(drumTrackForMidi(key.midi), context.currentTime);
        },
    };
}
