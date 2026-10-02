import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Position } from "../core/sections.js";
import type { SequencerEngine } from "../core/sequencer-engine.js";
import { FocusIndicator } from "./focus.js";
export function Header({
  title,
  view,
  onToggle,
  alternateLabel = "Клавиши",
}: {
  title: string;
  view?: "grid" | "keys" | "panel";
  onToggle?: () => void;
  alternateLabel?: string;
}) {
  return (
    <header className="heading">
      <div>
        <h1 id="title">{title}</h1>
      </div>
      <div className="live-actions">
        <FocusIndicator />
        {onToggle && (
          <button
            type="button"
            className="view-toggle"
            aria-pressed={view !== "grid"}
            onClick={onToggle}
          >
            {view === "grid" ? alternateLabel : "Сетка"}
          </button>
        )}
      </div>
    </header>
  );
}
export function NumberControl({
  value,
  onChange,
  label,
  min,
  max,
}: {
  value: number;
  onChange(value: number): void;
  label: string;
  min: number;
  max: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const next = Math.min(
      max,
      Math.max(
        min,
        text.trim() !== "" && Number.isFinite(Number(text))
          ? Number(text)
          : value,
      ),
    );
    setText(String(next));
    onChange(next);
  };
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={text}
      aria-label={label}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
export function PlaybackControls({
  engine,
  onClear,
  children,
  disabled = false,
  drums = false,
  clearLabel = "Очистить текущую секцию",
}: {
  engine: SequencerEngine;
  onClear(): void;
  children?: ReactNode;
  disabled?: boolean;
  drums?: boolean;
  clearLabel?: string;
}) {
  return (
    <div className={`sequencer-controls${drums ? " drum-controls" : ""}`}>
      <button
        id="play"
        type="button"
        aria-pressed={engine.running}
        disabled={engine.starting || disabled}
        onClick={() => void engine.toggle()}
      >
        {engine.running
          ? "Звук включён"
          : engine.failed
            ? "Повторить"
            : "Звук выключен"}
      </button>
      {children}
      <label className="tempo">
        {drums && "Темп "}
        <NumberControl
          label="Темп в ударах в минуту"
          value={engine.bpm}
          min={40}
          max={240}
          onChange={engine.setTempo}
        />
      </label>
      <button
        type="button"
        aria-label={clearLabel}
        title={clearLabel}
        disabled={disabled}
        onClick={onClear}
      >
        Сброс
      </button>
    </div>
  );
}
export function SectionSelector({
  selected,
  playing,
  onSelect,
}: {
  selected: number;
  playing: Position | null;
  onSelect(section: number): void;
}) {
  return (
    <div
      className="section-controls"
      role="group"
      aria-label="Четыре секции по 16 шагов"
    >
      <span>Секции</span>
      {[0, 1, 2, 3].map((section) => (
        <button
          key={section}
          type="button"
          data-section={section}
          aria-label={`Секция ${section + 1}`}
          aria-pressed={selected === section}
          aria-current={playing?.section === section ? "step" : undefined}
          className={playing?.section === section ? "is-playing" : ""}
          onClick={() => onSelect(section)}
        >
          {section + 1}
        </button>
      ))}
    </div>
  );
}
