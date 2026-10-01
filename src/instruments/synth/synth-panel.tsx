import { useState } from "react";
import type { CSSProperties } from "react";
import type { SynthState, SynthParameters } from "./synth-sequence.js";
import type { EnvelopeStage } from "../../core/envelope.js";
import { ADSREditor } from "../../ui/adsr.js";
const FILTER_KEYS: Record<EnvelopeStage, keyof SynthParameters> = {
  attack: "filterAttack",
  decay: "filterDecay",
  sustain: "filterSustain",
  release: "filterRelease",
};
const KNOBS: readonly (readonly [
  keyof SynthParameters,
  string,
  number,
  number,
  string,
])[] = [
  ["cutoff", "Частота", 200, 10000, "Hz"],
  ["resonance", "Резонанс", 0, 12, "Q"],
  ["filterAmount", "Глубина фильтра", 0, 1, "%"],
];
export function SynthPanel({
  state,
  held,
  onChange,
  hidden,
}: {
  state: SynthState;
  held: readonly string[];
  onChange(key: keyof SynthParameters, value: number): void;
  hidden: boolean;
}) {
  const [filter, setFilter] = useState(false);
  return (
    <section
      className="synth-panel"
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
        hidden={!filter}
        onChange={(stage, value) => onChange(FILTER_KEYS[stage], value)}
      />
      {KNOBS.map(([key, label, min, max, unit]) => {
        const logarithmic = key === "cutoff",
          encoded = Math.round(
            logarithmic
              ? (Math.log(state[key] / min) / Math.log(max / min)) * 1000
              : ((state[key] - min) / (max - min)) * 1000,
          );
        const display =
          unit === "Hz"
            ? `${Math.round(state[key])} Гц`
            : unit === "%"
              ? `${Math.round(state[key] * 100)}%`
              : state[key].toFixed(1);
        return (
          <label
            key={key}
            className="synth-knob"
            style={{ "--angle": `${encoded * 0.27 - 135}deg` } as CSSProperties}
          >
            <span>{label}</span>
            <span className="knob-dial">
              <input
                type="range"
                min="0"
                max="1000"
                step="1"
                aria-label={label}
                aria-valuetext={display}
                value={encoded}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  onChange(
                    key,
                    logarithmic
                      ? min * (max / min) ** (value / 1000)
                      : min + ((max - min) * value) / 1000,
                  );
                }}
              />
              <span className="knob-pointer" />
            </span>
            <output>{display}</output>
          </label>
        );
      })}
    </section>
  );
}
