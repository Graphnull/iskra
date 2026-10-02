import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createMicrophone, microphoneError } from "../../core/microphone.js?v=a3d1f500d2df";
import { isRecord } from "../../core/guards.js?v=a3d1f500d2df";
import { audioContext } from "../../core/dom.js?v=a3d1f500d2df";
import { restoreSampleSettings } from "../../core/sample-edit.js?v=a3d1f500d2df";
import { decodeDrumSample, drumSampleVoice } from "../drums/drum-samples.js?v=a3d1f500d2df";
import { SampleEditor } from "../../ui/sample-editor.js?v=a3d1f500d2df";
export function Recorder() {
    const [state, setState] = useState("idle"), [seconds, setSeconds] = useState(0), [status, setStatus] = useState("Запиши звук, настрой и сохрани в инструмент."), [clip, setClip] = useState(null), [settings, setSettings] = useState({ gain: 1, start: 0 }), [sending, setSending] = useState(false);
    const microphone = useRef(null), context = useRef(null), voices = useRef(new Set());
    const parameters = new URLSearchParams(location.search), session = parameters.get("session");
    const slot = Number(parameters.get("slot") ?? 0);
    useEffect(() => {
        let disposed = false, acceptingSaved = true, revision = 0;
        async function loadClip(blob, value) {
            const generation = ++revision;
            if (!context.current)
                context.current = audioContext();
            const buffer = await decodeDrumSample(context.current, blob);
            if (disposed || generation !== revision)
                return;
            setSettings(restoreSampleSettings(value, buffer.duration));
            setClip({ blob, buffer });
            setStatus("Настрой звук и нажми «Сохранить в инструмент».");
        }
        const mic = createMicrophone({
            onState(next, count = 0) {
                if (next === "requesting" || next === "recording") {
                    acceptingSaved = false;
                    revision++;
                }
                if (!disposed) {
                    setState(next);
                    setSeconds(count);
                }
            },
            async onBlob(blob) {
                acceptingSaved = false;
                await loadClip(blob, null);
            },
            onError: (error) => {
                if (!disposed)
                    setStatus(microphoneError(error));
            },
        });
        microphone.current = mic;
        const message = (event) => {
            const data = event.data;
            if (!isRecord(data) ||
                event.origin !== location.origin ||
                event.source !== window.opener ||
                data.session !== session)
                return;
            if (data.type === "sample-loaded" &&
                data.blob instanceof Blob &&
                acceptingSaved) {
                acceptingSaved = false;
                void loadClip(data.blob, data.settings).catch((error) => {
                    if (!disposed)
                        setStatus(microphoneError(error));
                });
            }
            if (data.type === "sample-received") {
                setSending(false);
                setStatus("Сохранено. Можно вернуться в инструмент.");
                window.close();
            }
            if (data.type === "sample-failed" && typeof data.error === "string") {
                setSending(false);
                setStatus(data.error);
            }
        };
        const dispose = () => {
            disposed = true;
            mic.dispose();
            for (const voice of voices.current)
                voice.stop();
            voices.current.clear();
            if (context.current && context.current.state !== "closed")
                void context.current.close();
            context.current = null;
        };
        window.addEventListener("message", message);
        window.addEventListener("pagehide", dispose);
        if (window.opener && session)
            window.opener.postMessage({ type: "sample-ready", session }, location.origin);
        return () => {
            dispose();
            microphone.current = null;
            window.removeEventListener("message", message);
            window.removeEventListener("pagehide", dispose);
        };
    }, [session]);
    async function preview() {
        const active = context.current;
        if (!clip || !active)
            return;
        try {
            await active.resume();
            if (context.current !== active)
                return;
            const voice = drumSampleVoice(active, active.destination, clip.buffer, active.currentTime, settings);
            if (voice) {
                voices.current.add(voice.source);
                voice.source.onended = () => {
                    voices.current.delete(voice.source);
                    voice.source.disconnect();
                    voice.gain.disconnect();
                };
            }
        }
        catch (error) {
            setStatus(microphoneError(error));
        }
    }
    function save() {
        if (!clip || !window.opener || window.opener.closed || !session) {
            setStatus("Открой запись из инструмента.");
            return;
        }
        try {
            window.opener.postMessage({
                type: parameters.get("target") === "drums"
                    ? "drum-sample"
                    : "synth-sample",
                session,
                blob: clip.blob,
                settings,
            }, location.origin);
            setSending(true);
            setStatus("Сохраняю в инструмент…");
        }
        catch (error) {
            setStatus(microphoneError(error));
        }
    }
    return (_jsxs("main", { className: `piano recorder-panel${clip ? " is-editing" : ""}`, children: [_jsx("p", { className: "eyebrow", hidden: !!clip, children: "\u0421\u0412\u041E\u0419 \u0417\u0412\u0423\u041A" }), _jsx("h1", { children: clip ? "Настроить запись" : "Записать семпл" }), _jsx("p", { hidden: !!clip, children: "\u0417\u0430\u043F\u0438\u0448\u0438 \u0433\u043E\u043B\u043E\u0441 \u0438\u043B\u0438 \u043B\u044E\u0431\u043E\u0439 \u0437\u0432\u0443\u043A \u2014 \u0434\u043E 10 \u0441\u0435\u043A\u0443\u043D\u0434." }), _jsx("button", { hidden: !!clip, className: `record-large${state === "recording" ? " is-recording" : ""}`, type: "button", disabled: state === "requesting" || state === "processing", onClick: () => {
                    const mic = microphone.current;
                    if (mic?.recording)
                        mic.stop();
                    else
                        void mic?.start();
                }, children: state === "recording"
                    ? `■ Остановить · ${seconds} с`
                    : state === "requesting"
                        ? "Разреши микрофон…"
                        : state === "processing"
                            ? "Обработка…"
                            : "● Начать запись" }), clip && (_jsxs(_Fragment, { children: [_jsx(SampleEditor, { buffer: clip.buffer, settings: settings, slot: Number.isInteger(slot) && slot >= 0 && slot < 4 ? slot : 0, busy: sending, closeLabel: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E", onChange: (patch) => setSettings(restoreSampleSettings({ ...settings, ...patch }, clip.buffer.duration)), onPreview: () => void preview(), onClose: () => {
                            if (sending)
                                return;
                            for (const voice of voices.current)
                                voice.stop();
                            voices.current.clear();
                            setClip(null);
                            setStatus("Запиши новый звук.");
                        } }), _jsx("button", { className: "sample-save", type: "button", disabled: sending, onClick: save, children: sending ? "Сохраняю…" : "Сохранить в инструмент" })] })), _jsx("p", { role: "status", children: status })] }));
}
