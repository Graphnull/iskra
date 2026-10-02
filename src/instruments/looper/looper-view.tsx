import { InstrumentStatus } from "../../ui/status.js";
import { createLooper } from "./looper.js";
import { useController } from "../../ui/hooks.js";
import { Header, PlaybackControls } from "../../ui/controls.js";
function waveform(buffer: AudioBuffer | null, gain: number): string {
  if (!buffer) return "";
  const data = buffer.getChannelData(0),
    count = 96,
    stride = Math.max(1, Math.floor(data.length / count));
  return Array.from({ length: count }, (_, i) => {
    let peak = 0;
    for (
      let j = i * stride;
      j < Math.min(data.length, (i + 1) * stride);
      j += Math.max(1, Math.floor(stride / 64))
    )
      peak = Math.max(peak, Math.abs(data[j] ?? 0));
    const amplitude = Math.min(1, peak * gain) * 18;
    return `M ${i} ${20 - amplitude} L ${i} ${20 + amplitude}`;
  }).join(" ");
}
export function Looper() {
  const model = useController(createLooper),
    position = model.position;
  return (
    <main className="tenorion looper" aria-labelledby="title">
      <Header title={model.recorderOnly ? "Записать слой" : "Лупер"} />
      <PlaybackControls
        engine={model.engine}
        onClear={model.clear}
        clearLabel="Удалить все слои"
        disabled={model.recording || model.busy}
      />
      <div className="loop-record-tools">
        <button
          className={`loop-record${model.recording ? " is-recording" : ""}`}
          type="button"
          disabled={
            model.busy || (!model.recording && model.layers.length >= 8)
          }
          onClick={() => void model.record()}
        >
          <span
            className={`loop-record-mark${model.recording ? " is-recording" : ""}`}
            aria-hidden="true"
          />
          {model.recording
            ? "Завершить слой"
            : model.busy
              ? "Подожди…"
              : "Записать слой"}
        </button>
        {!model.recorderOnly && (
          <button
            className="loop-popup"
            aria-label="Записать в отдельном окне"
            title="Записать в отдельном окне"
            type="button"
            disabled={model.busy || model.recording || model.layers.length >= 8}
            onClick={model.openRecorder}
          >
            <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
      <div className="loop-workspace">
        <div
          className="loop-timeline"
          aria-label={`Секция ${position.section + 1}, шаг ${position.column + 1}`}
        >
          {[0, 1, 2, 3].map((section) => (
            <span
              key={section}
              className={position.section === section ? "is-current" : ""}
            >
              {section + 1}
            </span>
          ))}
          <div
            className="loop-cursor"
            style={{ left: `${model.progress * 100}%` }}
          />
        </div>
        <div className="loop-layers">
          {model.layers.length === 0 && (
            <div className="loop-empty">
              <div className="loop-empty-wave" aria-hidden="true">
                {Array.from({ length: 23 }, (_, i) => (
                  <i
                    key={i}
                    style={{ height: `${8 + Math.sin(i * 1.7) ** 2 * 26}px` }}
                  />
                ))}
              </div>
              <strong>
                {model.recorderOnly ? "Новый слой" : "Начни с первого слоя"}
              </strong>
              <p>
                {model.recorderOnly
                  ? "Запись вернётся в исходный лупер. После сохранения это окно закроется."
                  : "Нажми «Записать слой». Затем добавь следующий поверх него."}
              </p>
            </div>
          )}
          {model.layers.map((layer, index) => (
            <section
              className={`loop-layer${layer.muted ? " is-muted" : ""}`}
              key={layer.id}
              aria-label={`Слой ${index + 1}`}
            >
              <div className="loop-layer-heading">
                <strong>Слой {index + 1}</strong>
                <button
                  type="button"
                  aria-pressed={!layer.muted}
                  onClick={() => model.toggleLayer(layer.id)}
                >
                  {layer.muted ? "Без звука" : "Со звуком"}
                </button>
                <button
                  type="button"
                  aria-label={`Удалить слой ${index + 1}`}
                  onClick={() => model.remove(layer.id)}
                >
                  ×
                </button>
              </div>
              <svg
                viewBox="0 0 96 40"
                preserveAspectRatio="none"
                aria-label={`Звук слоя ${index + 1}`}
                role="img"
              >
                <path d={waveform(layer.buffer, layer.gain)} />
                <line
                  x1={model.progress * 96}
                  x2={model.progress * 96}
                  y1="0"
                  y2="40"
                />
              </svg>
              <label>
                Громкость{" "}
                <input
                  aria-label={`Громкость слоя ${index + 1}`}
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={layer.gain}
                  onChange={(event) =>
                    model.setGain(layer.id, Number(event.target.value))
                  }
                />
                <span>{Math.round(layer.gain * 100)}%</span>
              </label>
            </section>
          ))}
        </div>
      </div>
      <InstrumentStatus>
        {model.status ||
          (model.recording
            ? "Записываю с текущей позиции · максимум один цикл"
            : "")}
      </InstrumentStatus>
    </main>
  );
}
