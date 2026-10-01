import { Fragment, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Position } from "../core/sections.js";
export interface GridNote {
  enabled: boolean;
  start?: boolean;
  end?: boolean;
  length?: number;
}
interface GridProps {
  kind: "light" | "drum" | "synth";
  labels: readonly string[];
  rowContent?(row: number): ReactNode;
  selected: number;
  playing: Position | null;
  note(row: number, column: number): GridNote;
  onEdit(row: number, column: number, length?: number): void;
  hidden?: boolean;
}
const OFFSETS: Partial<Record<string, readonly [number, number]>> = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
};
export function NoteGrid({
  kind,
  labels,
  rowContent,
  selected,
  playing,
  note,
  onEdit,
  hidden = false,
}: GridProps) {
  const [focused, setFocused] = useState(0);
  const cells = useRef(new Map<number, HTMLButtonElement>());
  const drag = useRef<{
    id: number;
    row: number;
    start: number;
    end: number;
  } | null>(null);
  // Selection invalidates an unfinished gesture without replacing focused cells.
  const previous = useRef(selected);
  if (previous.current !== selected) {
    previous.current = selected;
    drag.current = null;
  }
  return (
    <div
      className={
        kind === "drum"
          ? "drum-grid"
          : `light-grid${kind === "synth" ? " synth-grid" : ""}`
      }
      role="group"
      aria-label={
        kind === "synth"
          ? "Ноты синтезатора"
          : kind === "drum"
            ? "Восемь ударных и четыре семпла, шестнадцать шагов"
            : "Сетка нот: 16 шагов, 16 высот"
      }
      hidden={hidden}
      onPointerDown={(event) => {
        if (
          kind !== "synth" ||
          event.button !== 0 ||
          !(event.target instanceof Element)
        )
          return;
        const cell = event.target.closest<HTMLButtonElement>(".synth-cell");
        if (!cell) return;
        event.preventDefault();
        cell.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          id: event.pointerId,
          row: Number(cell.dataset.row),
          start: Number(cell.dataset.column),
          end: Number(cell.dataset.column),
        };
      }}
      onPointerMove={(event) => {
        const gesture = drag.current;
        if (!gesture || gesture.id !== event.pointerId) return;
        const cell = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLButtonElement>(".synth-cell");
        if (
          cell &&
          event.currentTarget.contains(cell) &&
          Number(cell.dataset.row) === gesture.row
        )
          gesture.end = Number(cell.dataset.column);
      }}
      onPointerUp={(event) => {
        const gesture = drag.current;
        if (!gesture || gesture.id !== event.pointerId) return;
        drag.current = null;
        if (gesture.start === gesture.end) onEdit(gesture.row, gesture.start);
        else
          onEdit(
            gesture.row,
            Math.min(gesture.start, gesture.end),
            Math.abs(gesture.end - gesture.start) + 1,
          );
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      {kind === "drum" && (
        <>
          <span />
          {Array.from({ length: 16 }, (_, column) => (
            <span key={column} className="drum-step-number" aria-hidden="true">
              {column + 1}
            </span>
          ))}
        </>
      )}
      {labels.map((label, row) => (
        <Fragment key={row}>
          {rowContent ? (
            rowContent(row)
          ) : (
            <span className="row-note" aria-hidden="true">
              {label}
            </span>
          )}
          {Array.from({ length: 16 }, (_, column) => {
            const value = note(row, column),
              index = row * 16 + column;
            return (
              <button
                key={column}
                ref={(node) => {
                  if (node) cells.current.set(index, node);
                  else cells.current.delete(index);
                }}
                type="button"
                data-row={row}
                data-column={column}
                tabIndex={focused === index ? 0 : -1}
                className={`${kind}-cell${kind === "drum" && Math.floor(column / 4) % 2 ? " alternate-beat" : ""}${value.enabled ? " is-on" : ""}${value.start ? " note-start" : ""}${value.end ? " note-end" : ""}${playing?.section === selected && playing.column === column ? " is-step" : ""}`}
                aria-label={
                  kind === "light"
                    ? `Шаг ${column + 1}, нота ${label}`
                    : `${label}, шаг ${column + 1}${value.length ? `, нота ${value.length} шагов` : ""}`
                }
                aria-pressed={value.enabled}
                onFocus={() => setFocused(index)}
                onClick={(event) => {
                  if (kind !== "synth" || event.detail === 0)
                    onEdit(row, column);
                }}
                onKeyDown={(event) => {
                  const offset = OFFSETS[event.key];
                  if (!offset) return;
                  event.preventDefault();
                  const next =
                    ((row + offset[0] + labels.length) % labels.length) * 16 +
                    ((column + offset[1] + 16) % 16);
                  setFocused(next);
                  cells.current.get(next)?.focus();
                }}
              />
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
