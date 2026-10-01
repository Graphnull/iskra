import { useEffect, useRef, useState } from "react";
import { createMicrophone, microphoneError } from "../../core/microphone.js";
import type { MicrophoneState } from "../../core/microphone.js";
import { isRecord } from "../../core/guards.js";
export function Recorder() {
  const [state, setState] = useState<MicrophoneState>("idle"),
    [seconds, setSeconds] = useState(0),
    [status, setStatus] = useState("Запись вернётся в инструмент.");
  const microphone = useRef<ReturnType<typeof createMicrophone> | null>(null);
  useEffect(() => {
    const parameters = new URLSearchParams(location.search),
      session = parameters.get("session");
    const kind =
      parameters.get("target") === "drums" ? "drum-sample" : "synth-sample";
    const mic = createMicrophone({
      onState(next, count = 0) {
        setState(next);
        setSeconds(count);
      },
      async onBlob(blob) {
        if (!window.opener || !session)
          throw new Error("Открой запись из инструмента.");
        window.opener.postMessage(
          { type: kind, session, blob },
          location.origin,
        );
        setStatus("Запись отправлена в инструмент…");
      },
      onError: (error) => setStatus(microphoneError(error)),
    });
    microphone.current = mic;
    const message = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (
        !isRecord(data) ||
        event.origin !== location.origin ||
        event.source !== window.opener ||
        data.session !== session
      )
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
  return (
    <main className="piano recorder-panel">
      <p className="eyebrow">СВОЙ ЗВУК</p>
      <h1>Записать семпл</h1>
      <p>Запиши голос или любой звук — до 10 секунд.</p>
      <button
        className={`record-large${state === "recording" ? " is-recording" : ""}`}
        type="button"
        disabled={state === "requesting" || state === "processing"}
        onClick={() => {
          const mic = microphone.current;
          if (mic?.recording) mic.stop();
          else void mic?.start();
        }}
      >
        {state === "recording"
          ? `■ Остановить · ${seconds} с`
          : state === "requesting"
            ? "Разреши микрофон…"
            : state === "processing"
              ? "Обработка…"
              : "● Начать запись"}
      </button>
      <p role="status">{status}</p>
    </main>
  );
}
