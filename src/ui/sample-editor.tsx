import { useMemo, useRef } from "react";
import type { PointerEvent } from "react";
import { sampleStartLimit, sampleWaveform } from "../core/sample-edit.js";
import type { SampleSettings } from "../core/sample-edit.js";
export function SampleEditor({
  buffer,
  settings,
  slot,
  busy,
  onChange,
  onPreview,
  onClose,
}: {
  buffer: AudioBuffer;
  settings: SampleSettings;
  slot: number;
  busy: boolean;
  onChange(patch: Partial<SampleSettings>): void;
  onPreview(): void;
  onClose(): void;
}) {
  const peaks = useMemo(() => sampleWaveform(buffer), [buffer]);
  const pointer = useRef<number | null>(null);
  const peak = Math.max(0.0001, ...peaks),
    x = (settings.start / buffer.duration) * 320;
  const bars = peaks
    .map((value, index) => {
      const height = (value / peak) * 29,
        at = ((index + 0.5) * 320) / peaks.length;
      return `M${at} ${34 - height}V${34 + height}`;
    })
    .join(" ");
  function move(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width)
      onChange({
        start: Math.max(
          0,
          Math.min(
            sampleStartLimit(buffer.duration),
            ((event.clientX - rect.left) / rect.width) * buffer.duration,
          ),
        ),
      });
  }
  return (
    <section
      className="sample-editor"
      aria-label={`Редактор семпла ${slot + 1}`}
    >
      <header>
        <strong>Семпл {slot + 1}</strong>
        <button type="button" onClick={onClose}>
          Готово
        </button>
      </header>
      <svg
        viewBox="0 0 320 68"
        preserveAspectRatio="none"
        role="img"
        aria-label="Волна записи. Красная линия — начало воспроизведения"
        className="sample-wave"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event);
        }}
        onPointerMove={(event) => {
          if (pointer.current === event.pointerId) move(event);
        }}
        onPointerUp={() => {
          pointer.current = null;
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
        onLostPointerCapture={() => {
          pointer.current = null;
        }}
      >
        <path d={bars} className="sample-wave-bars" />
        <rect
          x="0"
          y="0"
          width={x}
          height="68"
          className="sample-wave-skipped"
        />
        <path d={`M${x} 0V68`} className="sample-wave-start" />
      </svg>
      <label>
        Начало{" "}
        <output>
          {settings.start.toFixed(3)} с · из {buffer.duration.toFixed(2)} с
        </output>
        <input
          type="range"
          aria-label="Начало семпла"
          aria-valuetext={`${Math.round(settings.start * 1000)} мс`}
          min="0"
          max={sampleStartLimit(buffer.duration)}
          step="0.001"
          value={settings.start}
          onChange={(event) => onChange({ start: Number(event.target.value) })}
        />
      </label>
      <label>
        Громкость <output>{Math.round(settings.gain * 100)}%</output>
        <input
          type="range"
          aria-label="Громкость семпла"
          aria-valuetext={`${Math.round(settings.gain * 100)}%`}
          min="0"
          max="4"
          step="0.01"
          value={settings.gain}
          onChange={(event) => onChange({ gain: Number(event.target.value) })}
        />
      </label>
      <button
        className="sample-listen"
        type="button"
        disabled={busy}
        onClick={onPreview}
      >
        ▶ Прослушать
      </button>
    </section>
  );
}
