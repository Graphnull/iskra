import { createLooper } from "./looper.js";
import { useController } from "../../ui/hooks.js";
import { Header, PlaybackControls } from "../../ui/controls.js";
function waveform(buffer: AudioBuffer | null): string {
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
    return `M ${i} ${20 - peak * 18} L ${i} ${20 + peak * 18}`;
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
      <button
        className={`loop-record${model.recording ? " is-recording" : ""}`}
        type="button"
        disabled={model.busy || (!model.recording && model.layers.length >= 8)}
        onClick={() => void model.record()}
      >
        {model.recording
          ? "■ Завершить слой"
          : model.busy
            ? "Подожди…"
            : "● Записать слой"}
      </button>
      <p className="loop-status" role="status">
        {model.status ||
          (model.recording
            ? "Записываю с текущей позиции · максимум один цикл"
            : "Микрофон · запись с текущего места")}
      </p>
      {!model.recorderOnly && (
        <button
          className="loop-popup"
          type="button"
          disabled={model.busy || model.recording || model.layers.length >= 8}
          onClick={model.openRecorder}
        >
          Записать в отдельном окне ↗
        </button>
      )}
      <div className="loop-layers">
        {model.layers.length === 0 && (
          <p className="loop-empty">
            {model.recorderOnly
              ? "Запись вернётся в исходный лупер. После сохранения это окно закроется."
              : "Запиши первый слой, затем добавь следующий поверх него. Лучше использовать наушники."}
          </p>
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
              <path d={waveform(layer.buffer)} />
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
      <p className="sequencer-hint">
        4 секции · 64 шага · до 8 слоёв · слои сохраняются
      </p>
    </main>
  );
}
