import { useRef } from "react";
import type { CSSProperties } from "react";
import {
  ENVELOPE_RANGES,
  envelopeGeometry,
  envelopeText,
  envelopeRatio,
  envelopeValue,
  envelopeDrag,
} from "../core/envelope.js";
import type { ADSR, EnvelopeStage } from "../core/envelope.js";
const STAGES: readonly EnvelopeStage[] = [
  "attack",
  "decay",
  "sustain",
  "release",
];
const NAMES: Record<EnvelopeStage, string> = {
  attack: "Атака",
  decay: "Затухание",
  sustain: "Сустейн",
  release: "Релиз",
};
const LETTERS: Record<EnvelopeStage, string> = {
  attack: "A",
  decay: "D",
  sustain: "S",
  release: "R",
};
interface Gesture {
  id: number;
  stage: EnvelopeStage;
  startX: number;
  startY: number;
  width: number;
  height: number;
  value: ADSR;
}
export function ADSREditor({
  value,
  title,
  onChange,
  hidden = false,
}: {
  value: ADSR;
  title: string;
  onChange(stage: EnvelopeStage, value: number): void;
  hidden?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null);
  const shape = envelopeGeometry(value);
  return (
    <div
      ref={container}
      className="adsr-editor"
      role="group"
      aria-label={`${title} · ADSR`}
      hidden={hidden}
    >
      <svg
        className="adsr-svg"
        viewBox="0 0 320 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={STAGES.map(
          (stage) => `${NAMES[stage]} ${envelopeText(stage, value[stage])}`,
        ).join(", ")}
      >
        <path className="envelope-axis" d="M12 5V68H308" />
        <path className="adsr-path" d={shape.path} />
        {STAGES.map((stage, index) => (
          <g key={stage}>
            <text x={index * 80 + 40} y="85" textAnchor="middle">
              {LETTERS[stage]} · {envelopeText(stage, value[stage])}
            </text>
          </g>
        ))}
        <text className="adsr-hint" x="160" y="98" textAnchor="middle">
          Тяни точки · A/D/R — время · S — уровень
        </text>
      </svg>
      {STAGES.map((stage) => {
        const point = shape.handles[stage],
          [min, max] = ENVELOPE_RANGES[stage];
        return (
          <button
            key={stage}
            type="button"
            className={`adsr-handle adsr-${stage}`}
            role="slider"
            aria-label={`${title}: ${NAMES[stage]}`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value[stage]}
            aria-valuetext={envelopeText(stage, value[stage])}
            aria-orientation={stage === "sustain" ? "vertical" : "horizontal"}
            title={`${NAMES[stage]}: ${envelopeText(stage, value[stage])}`}
            style={
              {
                left: `${(point.x / 320) * 100}%`,
                top: `${point.y}%`,
              } as CSSProperties
            }
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              const rect = container.current?.getBoundingClientRect();
              if (!rect?.width || !rect.height) return;
              event.preventDefault();
              event.currentTarget.focus();
              event.currentTarget.setPointerCapture(event.pointerId);
              gesture.current = {
                id: event.pointerId,
                stage,
                startX: event.clientX,
                startY: event.clientY,
                width: rect.width,
                height: rect.height,
                value: { ...value },
              };
            }}
            onPointerMove={(event) => {
              const drag = gesture.current;
              if (!drag || drag.id !== event.pointerId) return;
              onChange(
                drag.stage,
                envelopeDrag(
                  drag.value,
                  drag.stage,
                  ((event.clientX - drag.startX) * 320) / drag.width,
                  ((event.clientY - drag.startY) * 100) / drag.height,
                ),
              );
            }}
            onPointerUp={() => {
              gesture.current = null;
            }}
            onPointerCancel={() => {
              gesture.current = null;
            }}
            onLostPointerCapture={() => {
              gesture.current = null;
            }}
            onKeyDown={(event) => {
              const direction =
                event.key === "ArrowRight" || event.key === "ArrowUp"
                  ? 1
                  : event.key === "ArrowLeft" || event.key === "ArrowDown"
                    ? -1
                    : 0;
              if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                onChange(stage, event.key === "Home" ? min : max);
                return;
              }
              if (!direction) return;
              event.preventDefault();
              onChange(
                stage,
                envelopeValue(
                  stage,
                  envelopeRatio(stage, value[stage]) +
                    direction * (event.shiftKey ? 0.1 : 0.01),
                ),
              );
            }}
          >
            <span aria-hidden="true">{LETTERS[stage]}</span>
          </button>
        );
      })}
    </div>
  );
}
