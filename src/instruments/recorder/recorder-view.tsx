import { useEffect, useRef, useState } from "react";
import { createMicrophone, microphoneError } from "../../core/microphone.js";
import type { MicrophoneState } from "../../core/microphone.js";
import { isRecord } from "../../core/guards.js";
import { audioContext } from "../../core/dom.js";
import { restoreSampleSettings } from "../../core/sample-edit.js";
import type { SampleSettings } from "../../core/sample-edit.js";
import { decodeDrumSample, drumSampleVoice } from "../drums/drum-samples.js";
import { SampleEditor } from "../../ui/sample-editor.js";
interface Clip {
  blob: Blob;
  buffer: AudioBuffer;
}
export function Recorder() {
  const [state, setState] = useState<MicrophoneState>("idle"),
    [seconds, setSeconds] = useState(0),
    [status, setStatus] = useState(
      "Запиши звук, настрой и сохрани в инструмент.",
    ),
    [clip, setClip] = useState<Clip | null>(null),
    [settings, setSettings] = useState<SampleSettings>({ gain: 1, start: 0 }),
    [sending, setSending] = useState(false);
  const microphone = useRef<ReturnType<typeof createMicrophone> | null>(null),
    context = useRef<AudioContext | null>(null),
    voices = useRef(new Set<AudioBufferSourceNode>());
  const parameters = new URLSearchParams(location.search),
    session = parameters.get("session");
  const slot = Number(parameters.get("slot") ?? 0);
  useEffect(() => {
    let disposed = false;
    const mic = createMicrophone({
      onState(next, count = 0) {
        if (!disposed) {
          setState(next);
          setSeconds(count);
        }
      },
      async onBlob(blob) {
        if (!context.current) context.current = audioContext();
        const buffer = await decodeDrumSample(context.current, blob);
        if (disposed) return;
        setSettings({ gain: 1, start: 0 });
        setClip({ blob, buffer });
        setStatus("Настрой звук и нажми «Сохранить в инструмент».");
      },
      onError: (error) => {
        if (!disposed) setStatus(microphoneError(error));
      },
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
      if (data.type === "sample-received") {
        setSending(false);
        setStatus("Сохранено. Можно вернуться в инструмент.");
      }
      if (data.type === "sample-failed" && typeof data.error === "string") {
        setSending(false);
        setStatus(data.error);
      }
    };
    const dispose = () => {
      disposed = true;
      mic.dispose();
      for (const voice of voices.current) voice.stop();
      voices.current.clear();
      if (context.current && context.current.state !== "closed")
        void context.current.close();
      context.current = null;
    };
    window.addEventListener("message", message);
    window.addEventListener("pagehide", dispose);
    return () => {
      dispose();
      microphone.current = null;
      window.removeEventListener("message", message);
      window.removeEventListener("pagehide", dispose);
    };
  }, [session]);
  async function preview() {
    const active = context.current;
    if (!clip || !active) return;
    try {
      await active.resume();
      if (context.current !== active) return;
      const voice = drumSampleVoice(
        active,
        active.destination,
        clip.buffer,
        active.currentTime,
        settings,
      );
      if (voice) {
        voices.current.add(voice.source);
        voice.source.onended = () => {
          voices.current.delete(voice.source);
          voice.source.disconnect();
          voice.gain.disconnect();
        };
      }
    } catch (error) {
      setStatus(microphoneError(error));
    }
  }
  function save() {
    if (!clip || !window.opener || window.opener.closed || !session) {
      setStatus("Открой запись из инструмента.");
      return;
    }
    try {
      window.opener.postMessage(
        {
          type:
            parameters.get("target") === "drums"
              ? "drum-sample"
              : "synth-sample",
          session,
          blob: clip.blob,
          settings,
        },
        location.origin,
      );
      setSending(true);
      setStatus("Сохраняю в инструмент…");
    } catch (error) {
      setStatus(microphoneError(error));
    }
  }
  return (
    <main className={`piano recorder-panel${clip ? " is-editing" : ""}`}>
      <p className="eyebrow" hidden={!!clip}>
        СВОЙ ЗВУК
      </p>
      <h1>{clip ? "Настроить запись" : "Записать семпл"}</h1>
      <p hidden={!!clip}>Запиши голос или любой звук — до 10 секунд.</p>
      <button
        hidden={!!clip}
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
      {clip && (
        <>
          <SampleEditor
            buffer={clip.buffer}
            settings={settings}
            slot={Number.isInteger(slot) && slot >= 0 && slot < 4 ? slot : 0}
            busy={sending}
            closeLabel="Записать заново"
            onChange={(patch) =>
              setSettings(
                restoreSampleSettings(
                  { ...settings, ...patch },
                  clip.buffer.duration,
                ),
              )
            }
            onPreview={() => void preview()}
            onClose={() => {
              if (sending) return;
              for (const voice of voices.current) voice.stop();
              voices.current.clear();
              setClip(null);
              setStatus("Запиши новый звук.");
            }}
          />
          <button
            className="sample-save"
            type="button"
            disabled={sending}
            onClick={save}
          >
            {sending ? "Сохраняю…" : "Сохранить в инструмент"}
          </button>
        </>
      )}
      <p role="status">{status}</p>
    </main>
  );
}
