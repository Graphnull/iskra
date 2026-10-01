import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createMicrophone, microphoneError } from "../../core/microphone.js?v=27da1cf7fbab";
import { isRecord } from "../../core/guards.js?v=27da1cf7fbab";
export function Recorder() {
    const [state, setState] = useState("idle"), [seconds, setSeconds] = useState(0), [status, setStatus] = useState("Запись вернётся в инструмент.");
    const microphone = useRef(null);
    useEffect(() => {
        const parameters = new URLSearchParams(location.search), session = parameters.get("session");
        const kind = parameters.get("target") === "drums" ? "drum-sample" : "synth-sample";
        const mic = createMicrophone({
            onState(next, count = 0) {
                setState(next);
                setSeconds(count);
            },
            async onBlob(blob) {
                if (!window.opener || !session)
                    throw new Error("Открой запись из инструмента.");
                window.opener.postMessage({ type: kind, session, blob }, location.origin);
                setStatus("Запись отправлена в инструмент…");
            },
            onError: (error) => setStatus(microphoneError(error)),
        });
        microphone.current = mic;
        const message = (event) => {
            const data = event.data;
            if (!isRecord(data) ||
                event.origin !== location.origin ||
                event.source !== window.opener ||
                data.session !== session)
                return;
            if (data.type === "sample-received")
                setStatus("Семпл готов. Можно вернуться в инструмент.");
            if (data.type === "sample-failed" && typeof data.error === "string")
                setStatus(data.error);
        };
        const pagehide = () => mic.dispose();
        window.addEventListener("message", message);
        window.addEventListener("pagehide", pagehide);
        return () => {
            microphone.current = null;
            mic.dispose();
            window.removeEventListener("message", message);
            window.removeEventListener("pagehide", pagehide);
        };
    }, []);
    return (_jsxs("main", { className: "piano recorder-panel", children: [_jsx("p", { className: "eyebrow", children: "\u0421\u0412\u041E\u0419 \u0417\u0412\u0423\u041A" }), _jsx("h1", { children: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0435\u043C\u043F\u043B" }), _jsx("p", { children: "\u0417\u0430\u043F\u0438\u0448\u0438 \u0433\u043E\u043B\u043E\u0441 \u0438\u043B\u0438 \u043B\u044E\u0431\u043E\u0439 \u0437\u0432\u0443\u043A \u2014 \u0434\u043E 10 \u0441\u0435\u043A\u0443\u043D\u0434." }), _jsx("button", { className: `record-large${state === "recording" ? " is-recording" : ""}`, type: "button", disabled: state === "requesting" || state === "processing", onClick: () => {
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
                            : "● Начать запись" }), _jsx("p", { role: "status", children: status })] }));
}
