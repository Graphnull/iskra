import { audioContext } from "../../core/dom.js?v=744a04fa91ff";
import { createObservable } from "../../core/observable.js?v=744a04fa91ff";
import { createSequencerEngine } from "../../core/sequencer-engine.js?v=744a04fa91ff";
import { beatAt, wallTime } from "../../core/transport.js?v=744a04fa91ff";
import { sectionPosition } from "../../core/sections.js?v=744a04fa91ff";
import { loopSeconds, loopPhase, placeLoopChunk, loopWav, } from "../../core/loop-audio.js?v=744a04fa91ff";
import { microphoneError } from "../../core/microphone.js?v=744a04fa91ff";
import { sampleStore } from "../../core/sample-store.js?v=744a04fa91ff";
import { readStored, writeStored } from "../../core/storage.js?v=744a04fa91ff";
import { widgetStorageKey } from "../../core/widget-storage.js?v=744a04fa91ff";
import { isRecord, isNumber } from "../../core/guards.js?v=744a04fa91ff";
export function createLooper() {
    const parameters = new URLSearchParams(location.search);
    const recorderOnly = parameters.get("mode") === "looper-recorder";
    const session = parameters.get("session") ?? "";
    const popups = new Map();
    let waiting = false;
    const observable = createObservable(), key = widgetStorageKey("looper-layers-v1");
    const layers = [], voices = new Map();
    let context, master, capture = null;
    let disposed = false, generation = 0, requesting = false, processing = false, loading = false, status = "", step = 0, worklet;
    function audio() {
        if (!context) {
            context = audioContext();
            master = context.createGain();
            master.gain.value = 0.7;
            master.connect(context.destination);
        }
        return context;
    }
    function save() {
        writeStored(key, layers.map(({ id, gain, muted }) => ({ id, gain, muted })));
    }
    function stopVoices() {
        for (const voice of voices.values()) {
            voice.source.stop();
            voice.source.disconnect();
            voice.gain.disconnect();
        }
        voices.clear();
    }
    function syncVoices() {
        stopVoices();
        if (!engine.running || !context || !master)
            return;
        const duration = loopSeconds(engine.bpm), now = context.currentTime + 0.02;
        const phase = loopPhase(wallTime() / 1000 + 0.02, duration);
        for (const layer of layers) {
            if (!layer.buffer)
                continue;
            const source = context.createBufferSource(), gain = context.createGain();
            source.buffer = layer.buffer;
            source.loop = true;
            source.playbackRate.value = layer.buffer.duration / duration;
            gain.gain.value = layer.muted ? 0 : layer.gain;
            source.connect(gain).connect(master);
            source.start(now, phase * source.playbackRate.value);
            voices.set(layer.id, { source, gain });
        }
    }
    function releaseCapture() {
        if (!capture)
            return;
        capture.node.port.onmessage = null;
        capture.source.disconnect();
        capture.node.disconnect();
        capture.stream.getTracks().forEach((track) => track.stop());
        capture = null;
    }
    async function finish() {
        const recorded = capture;
        if (!recorded)
            return;
        releaseCapture();
        processing = true;
        observable.notify();
        const revision = generation;
        try {
            const ctx = audio(), buffer = ctx.createBuffer(1, recorded.samples.length, ctx.sampleRate);
            buffer.copyToChannel(recorded.samples, 0);
            const blob = loopWav(recorded.samples, ctx.sampleRate);
            if (recorderOnly) {
                if (!window.opener || window.opener.closed)
                    throw new Error("Исходный лупер закрыт. Открой запись из лупера ещё раз.");
                waiting = true;
                status = "Передаю слой в лупер…";
                window.opener.postMessage({ type: "loop-layer", session, blob }, location.origin);
            }
            else
                await commitLayer(buffer, blob, revision);
        }
        catch (error) {
            status = microphoneError(error);
        }
        finally {
            if (revision === generation) {
                processing = false;
                observable.notify();
            }
        }
    }
    async function commitLayer(buffer, blob, revision) {
        if (disposed || revision !== generation || layers.length >= 8)
            return;
        const layer = {
            id: crypto.randomUUID(),
            gain: 1,
            muted: false,
            buffer,
        };
        try {
            await sampleStore(`${key}:${layer.id}`, blob);
        }
        catch {
            status = "Слой звучит, но сохранить его не удалось.";
        }
        if (disposed || revision !== generation)
            return;
        layers.push(layer);
        save();
        syncVoices();
        observable.notify();
    }
    async function message(event) {
        if (event.origin !== location.origin || !isRecord(event.data))
            return;
        const data = event.data;
        if (recorderOnly &&
            event.source === window.opener &&
            data.type === "loop-layer-received" &&
            data.session === session) {
            waiting = false;
            window.close();
            return;
        }
        if (data.type !== "loop-layer" ||
            typeof data.session !== "string" ||
            popups.get(data.session) !== event.source ||
            !(data.blob instanceof Blob) ||
            processing ||
            layers.length >= 8)
            return;
        processing = true;
        observable.notify();
        const revision = generation;
        try {
            const buffer = await audio().decodeAudioData(await data.blob.arrayBuffer());
            await commitLayer(buffer, data.blob, revision);
            if (disposed || revision !== generation)
                return;
            popups
                .get(data.session)
                ?.postMessage({ type: "loop-layer-received", session: data.session }, location.origin);
            popups.delete(data.session);
        }
        catch (error) {
            status = microphoneError(error);
        }
        finally {
            processing = false;
            observable.notify();
        }
    }
    function openRecorder() {
        if (recorderOnly)
            return;
        for (const [id, active] of popups) {
            if (!active.closed) {
                active.focus();
                return;
            }
            popups.delete(id);
        }
        const id = crypto.randomUUID(), url = new URL(location.href);
        url.searchParams.set("mode", "looper-recorder");
        url.searchParams.set("session", id);
        const popup = window.open(url, "_blank", "popup,width=420,height=480");
        if (popup) {
            popups.set(id, popup);
            if (!engine.running)
                void engine.toggle();
        }
        else {
            status = "Разреши всплывающие окна для записи.";
            observable.notify();
        }
    }
    const engine = createSequencerEngine({
        context: audio,
        prepare: async () => {
            await audio().resume();
        },
        onStep() {
            if (!voices.size && layers.length)
                syncVoices();
        },
        onVisual(value) {
            step = value;
            observable.notify();
        },
        onStop: stopVoices,
        onReset() {
            if (capture && capture.bpm !== engine.bpm) {
                releaseCapture();
                status = "Темп изменился: запись отменена. Запиши слой в новом темпе.";
            }
            syncVoices();
        },
        onChange: observable.notify,
    });
    async function record() {
        if (capture) {
            await finish();
            return;
        }
        if (requesting || processing || loading || layers.length >= 8)
            return;
        requesting = true;
        status = "";
        observable.notify();
        const revision = generation;
        let stream;
        try {
            const ctx = audio();
            await ctx.resume();
            if (!engine.running)
                await engine.toggle();
            if (!navigator.mediaDevices?.getUserMedia)
                throw new Error("Запись микрофона недоступна. Открой виджет по HTTPS.");
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            worklet ??= ctx.audioWorklet.addModule(new URL("site/core/looper-capture.js", document.baseURI));
            await worklet;
            if (disposed || revision !== generation) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            const node = new AudioWorkletNode(ctx, "iskra-loop-capture"), source = ctx.createMediaStreamSource(stream);
            const duration = loopSeconds(engine.bpm), start = ctx.currentTime;
            const active = {
                stream,
                source,
                node,
                start,
                bpm: engine.bpm,
                phase: loopPhase(wallTime() / 1000, duration),
                samples: new Float32Array(Math.round(duration * ctx.sampleRate)),
            };
            capture = active;
            node.port.onmessage = (event) => {
                if (capture !== active ||
                    !isRecord(event.data) ||
                    !isNumber(event.data.time) ||
                    !(event.data.samples instanceof Float32Array))
                    return;
                const from = Math.round((event.data.time - start) * ctx.sampleRate);
                const skip = Math.max(0, -from), count = Math.min(event.data.samples.length - skip, active.samples.length - Math.max(0, from));
                if (count > 0)
                    placeLoopChunk(active.samples, event.data.samples.subarray(skip, skip + count), Math.round(active.phase * ctx.sampleRate) + Math.max(0, from));
                if (from + event.data.samples.length >= active.samples.length)
                    void finish();
            };
            source.connect(node).connect(ctx.destination);
        }
        catch (error) {
            stream?.getTracks().forEach((track) => track.stop());
            releaseCapture();
            status = microphoneError(error);
            worklet = undefined;
        }
        finally {
            if (revision === generation) {
                requesting = false;
                observable.notify();
            }
        }
    }
    function pagehide() {
        generation++;
        releaseCapture();
        requesting = false;
        processing = false;
        loading = false;
        waiting = false;
    }
    return {
        ...observable,
        engine,
        layers,
        get position() {
            return sectionPosition(step);
        },
        get progress() {
            return (((beatAt({ bpm: engine.bpm }, wallTime()) % 64) + 64) % 64) / 64;
        },
        get recording() {
            return !!capture;
        },
        get busy() {
            return (requesting ||
                processing ||
                loading ||
                waiting ||
                [...popups.values()].some((popup) => !popup.closed));
        },
        get status() {
            return (status ||
                (requesting
                    ? "Разреши доступ к микрофону"
                    : processing
                        ? "Сохраняю слой…"
                        : ""));
        },
        record,
        recorderOnly,
        openRecorder,
        setGain(id, value) {
            const layer = layers.find((layer) => layer.id === id);
            if (!layer)
                return;
            layer.gain = Math.max(0, Math.min(2, value));
            const voice = voices.get(id);
            if (voice && context)
                voice.gain.gain.setTargetAtTime(layer.muted ? 0 : layer.gain, context.currentTime, 0.01);
            save();
            observable.notify();
        },
        toggleLayer(id) {
            const layer = layers.find((layer) => layer.id === id);
            if (!layer)
                return;
            layer.muted = !layer.muted;
            const voice = voices.get(id);
            if (voice && context)
                voice.gain.gain.setTargetAtTime(layer.muted ? 0 : layer.gain, context.currentTime, 0.01);
            save();
            observable.notify();
        },
        remove(id) {
            const index = layers.findIndex((layer) => layer.id === id);
            if (index < 0)
                return;
            const voice = voices.get(id);
            if (voice) {
                voice.source.stop();
                voice.source.disconnect();
                voice.gain.disconnect();
                voices.delete(id);
            }
            void sampleStore(`${key}:${id}`, null).catch(() => { });
            layers.splice(index, 1);
            save();
            observable.notify();
        },
        clear() {
            for (const layer of layers)
                void sampleStore(`${key}:${layer.id}`, null).catch(() => { });
            layers.splice(0);
            stopVoices();
            save();
            observable.notify();
        },
        connect() {
            disposed = false;
            const cleanup = engine.connect(), revision = ++generation;
            loading = true;
            observable.notify();
            window.addEventListener("message", message);
            window.addEventListener("pagehide", pagehide);
            const saved = recorderOnly ? [] : readStored(key, []);
            void (async () => {
                if (!Array.isArray(saved)) {
                    loading = false;
                    observable.notify();
                    return;
                }
                for (const item of saved.slice(0, 8)) {
                    if (!isRecord(item) ||
                        typeof item.id !== "string" ||
                        !isNumber(item.gain) ||
                        typeof item.muted !== "boolean")
                        continue;
                    try {
                        const blob = await sampleStore(`${key}:${item.id}`);
                        if (!(blob instanceof Blob))
                            continue;
                        const buffer = await audio().decodeAudioData(await blob.arrayBuffer());
                        if (disposed || revision !== generation)
                            return;
                        layers.push({
                            id: item.id,
                            gain: Math.max(0, Math.min(2, item.gain)),
                            muted: item.muted,
                            buffer,
                        });
                        observable.notify();
                    }
                    catch {
                        status = "Не удалось загрузить один из сохранённых слоёв.";
                        observable.notify();
                    }
                }
                loading = false;
                syncVoices();
                observable.notify();
            })();
            return () => {
                disposed = true;
                generation++;
                releaseCapture();
                window.removeEventListener("message", message);
                window.removeEventListener("pagehide", pagehide);
                popups.clear();
                cleanup();
                stopVoices();
                if (context)
                    void context.close();
            };
        },
    };
}
