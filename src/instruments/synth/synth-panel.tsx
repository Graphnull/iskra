import { useEffect, useState } from "react";
import type { SynthState, SynthParameters } from "./synth-sequence.js";
import { FILTER_TYPES } from "./synth-sequence.js";
import type { EnvelopeStage } from "../../core/envelope.js";
import { ADSREditor } from "../../ui/adsr.js";
const FILTER_KEYS: Record<EnvelopeStage, keyof SynthParameters> = {
  attack: "filterAttack",
  decay: "filterDecay",
  sustain: "filterSustain",
  release: "filterRelease",
};
const DESCRIPTIONS = {
  lowpass: "Пропускает низкие, приглушает высокие",
  highpass: "Пропускает высокие, приглушает низкие",
  bandpass: "Пропускает полосу вокруг частоты",
  notch: "Приглушает полосу вокруг частоты",
};
export function SynthPanel({
  state,
  held,
  onChange,
  hidden,
  onFilterType,
  onFilterControl,
  readFrequency,
}: {
  state: SynthState;
  held: readonly string[];
  onChange(key: keyof SynthParameters, value: number): void;
  hidden: boolean;
  onFilterType?(value: string): void;
  onFilterControl?(value: string): void;
  readFrequency?(): number;
}) {
  const [filter, setFilter] = useState(false),
    [frequency, setFrequency] = useState(state.cutoff);
  const automatic = state.filterControl === "adsr";
  useEffect(() => {
    if (hidden || !filter || !automatic || !readFrequency) return;
    let frame = 0;
    const tick = () => {
      setFrequency(Math.round(readFrequency()));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hidden, filter, automatic, readFrequency]);
  const displayed = automatic ? frequency : state.cutoff;
  const encoded = Math.max(
    0,
    Math.min(1000, (Math.log(displayed / 20) / Math.log(1000)) * 1000),
  );
  return (
    <section
      className={`synth-panel${filter ? " is-filter" : ""}`}
      aria-label="Пульт синтезатора"
      hidden={hidden}
    >
      <div className="envelope-tabs">
        <div role="group" aria-label="Огибающая">
          <button
            type="button"
            aria-pressed={!filter}
            onClick={() => setFilter(false)}
          >
            Громкость
          </button>
          <button
            type="button"
            aria-pressed={filter}
            onClick={() => setFilter(true)}
          >
            Фильтр
          </button>
        </div>
        <span className="held-notes">
          {held.length ? held.join(" · ") : "Играй Z–/ или Q–]"}
        </span>
      </div>
      {filter && (
        <div className="filter-choice">
          <select
            aria-label="Тип фильтра"
            value={state.filterType}
            onChange={(e) => onFilterType?.(e.target.value)}
          >
            {Object.entries(FILTER_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Управление фильтром"
            value={state.filterControl}
            onChange={(e) => onFilterControl?.(e.target.value)}
          >
            <option value="manual">Ползунок</option>
            <option value="adsr">ADSR</option>
          </select>
        </div>
      )}
      <ADSREditor
        value={state}
        title="Громкость"
        hidden={filter}
        onChange={onChange}
      />
      <ADSREditor
        value={{
          attack: state.filterAttack,
          decay: state.filterDecay,
          sustain: state.filterSustain,
          release: state.filterRelease,
        }}
        title="Фильтр"
        hidden={!filter || !automatic}
        onChange={(stage, value) => onChange(FILTER_KEYS[stage], value)}
      />
      {filter && (
        <>
          {!automatic && (
            <p className="filter-description">
              {DESCRIPTIONS[state.filterType]}
            </p>
          )}
          <label className="filter-frequency">
            {automatic ? "Сейчас" : "Частота"}
            <output>{Math.round(displayed)} Гц</output>
            <input
              type="range"
              aria-label={
                automatic ? "Текущая частота фильтра" : "Частота фильтра"
              }
              aria-valuetext={`${Math.round(displayed)} Гц`}
              min="0"
              max="1000"
              value={encoded}
              disabled={automatic}
              onChange={(e) =>
                onChange(
                  "cutoff",
                  Math.min(10000, 20 * 500 ** (Number(e.target.value) / 1000)),
                )
              }
            />
          </label>
          <div className="filter-parameters">
            {automatic && (
              <label>
                Начало <output>{Math.round(state.cutoff)} Гц</output>
                <input
                  type="range"
                  aria-label="Начальная частота фильтра"
                  min="20"
                  max="10000"
                  step="10"
                  value={state.cutoff}
                  onChange={(e) => onChange("cutoff", Number(e.target.value))}
                />
              </label>
            )}
            <label>
              {state.filterType === "bandpass" || state.filterType === "notch"
                ? "Ширина / Q"
                : "Резонанс"}
              <output>{state.resonance.toFixed(1)}</output>
              <input
                type="range"
                aria-label="Резонанс фильтра"
                min="0.1"
                max="12"
                step="0.1"
                value={state.resonance}
                onChange={(e) => onChange("resonance", Number(e.target.value))}
              />
            </label>
            {automatic && (
              <label>
                Глубина <output>{Math.round(state.filterAmount * 100)}%</output>
                <input
                  type="range"
                  aria-label="Глубина фильтра"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.filterAmount}
                  onChange={(e) =>
                    onChange("filterAmount", Number(e.target.value))
                  }
                />
              </label>
            )}
          </div>
          {automatic && (
            <p className="filter-caption">
              {DESCRIPTIONS[state.filterType]} · для яркого звука выбери «Пила»
            </p>
          )}
        </>
      )}
    </section>
  );
}
