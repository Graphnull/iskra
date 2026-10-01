import type { CSSProperties } from "react";
import type { SynthState, SynthParameters } from "./synth-sequence.js";
const KNOBS: readonly (readonly [
  keyof SynthParameters,
  string,
  number,
  number,
  string,
])[] = [
  ["cutoff", "Фильтр", 200, 10000, "Hz"],
  ["resonance", "Резонанс", 0, 12, "Q"],
  ["attack", "Атака", 0.003, 2, "s"],
  ["decay", "Затухание", 0.02, 8, "s"],
  ["sustain", "Сустейн", 0, 1, "%"],
  ["release", "Релиз", 0.05, 4, "s"],
];

function formatValue(value: number, unit: string): string {
  if (unit === "s") return `${Math.round(value * 1000)} мс`;
  if (unit === "%") return `${Math.round(value * 100)}%`;
  if (unit === "Hz") return `${Math.round(value)} Гц`;
  return value.toFixed(1);
}

export function envelopeShape(state: SynthState) {
  const total = state.attack + state.decay + state.release + 1;
  const attackEnd = 8 + (state.attack / total) * 304;
  const decayEnd = attackEnd + (state.decay / total) * 304;
  const sustainEnd = decayEnd + 304 / total;
  const sustainY = 52 - state.sustain * 44;
  const points: [number, number][] = [[8, 52]];
  const floor = 0.0001 / (state.sound === "bass" ? 0.42 : 0.18);
  function ramp(start: number, end: number, from: number, to: number): void {
    for (let i = 1; i <= 24; i++) {
      const t = i / 24;
      points.push([
        start + (end - start) * t,
        52 - 44 * from * (to / from) ** t,
      ]);
    }
  }
  ramp(8, attackEnd, floor, 1);
  ramp(attackEnd, decayEnd, 1, Math.max(floor, state.sustain));
  points.push([sustainEnd, sustainY]);
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    points.push([
      sustainEnd + (312 - sustainEnd) * t,
      52 - 44 * state.sustain * Math.exp(-6.36 * t),
    ]);
  }
  return {
    path: points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" "),
    labels: [
      ["A", (8 + attackEnd) / 2],
      ["D", (attackEnd + decayEnd) / 2],
      ["S", (decayEnd + sustainEnd) / 2],
      ["R", (sustainEnd + 312) / 2],
    ] satisfies readonly (readonly [string, number])[],
  };
}
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
  const envelope = envelopeShape(state);
  return (
    <section
      className="synth-panel"
      aria-label="Пульт синтезатора"
      hidden={hidden}
    >
      <div className="envelope-view">
        <div className="envelope-title">
          <span>Огибающая · ADSR</span>
          <span>{held.length ? held.join(" · ") : "Играй Z–/ или Q–]"}</span>
        </div>
        <svg
          id="envelope"
          viewBox="0 0 320 64"
          role="img"
          aria-label={`Огибающая: атака ${formatValue(state.attack, "s")}, затухание ${formatValue(state.decay, "s")}, сустейн ${formatValue(state.sustain, "%")}, релиз ${formatValue(state.release, "s")}`}
        >
          <path className="envelope-axis" d="M8 5V52H312" />
          <path id="envelope-path" d={envelope.path} />
          <g>
            {envelope.labels.map(([label, x]) => (
              <text key={label} x={x} y="63" textAnchor="middle">
                {label}
              </text>
            ))}
          </g>
        </svg>
      </div>
      {KNOBS.map(([key, label, min, max, unit]) => {
        const logarithmic = unit === "s" || key === "cutoff";
        const encoded = Math.round(
          logarithmic
            ? (Math.log(state[key] / min) / Math.log(max / min)) * 1000
            : ((state[key] - min) / (max - min)) * 1000,
        );
        const display = formatValue(state[key], unit);
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
