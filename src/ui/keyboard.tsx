import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { bindKeyInput } from "../core/live-keyboard.js";
import type { KeyInputOptions } from "../core/live-keyboard.js";
import { buildKeyMap, ROWS } from "../core/keyboard-map.js";
import type { PianoKey } from "../core/keyboard-map.js";
const KEYS = buildKeyMap();
export function useKeyboard<V>(options: KeyInputOptions<V>) {
  const current = useRef(options);
  current.current = options;
  const input = useRef<ReturnType<typeof bindKeyInput<V>> | null>(null);
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const binding = bindKeyInput<V>({
      onNoteOn: (key, source) => current.current.onNoteOn(key, source),
      onNoteOff: (voice) => current.current.onNoteOff?.(voice),
      onHighlight(key, held) {
        setActive((previous) => {
          const next = new Set(previous);
          if (held) next.add(key.code);
          else next.delete(key.code);
          return next;
        });
        current.current.onHighlight?.(key, held);
      },
    });
    input.current = binding;
    return () => {
      input.current = null;
      binding.dispose();
    };
  }, []);
  return {
    active,
    start: (key: PianoKey, source: string) => input.current?.start(key, source),
    end: (source: string) => input.current?.end(source),
    releaseAll: () => input.current?.releaseAll(),
  };
}
export type KeyboardBinding = ReturnType<typeof useKeyboard>;
interface KeyboardProps {
  binding: KeyboardBinding;
  labelFor(key: PianoKey): string;
  piano?: boolean;
}
export function Keyboard({ binding, labelFor, piano = false }: KeyboardProps) {
  return (
    <>
      {ROWS.map((row, index) => {
        const keyboard = (
          <div
            className="keyboard"
            id={row.id}
            style={{ "--white-count": row.white.length } as CSSProperties}
          >
            {KEYS.filter((key) => key.row === row.id).map((key) => (
              <button
                key={key.code}
                type="button"
                className={`key ${key.black ? "black" : "white"}${binding.active.has(key.code) ? " is-active" : ""}`}
                data-code={key.code}
                style={
                  key.black
                    ? ({ "--position": key.position } as CSSProperties)
                    : undefined
                }
                aria-label={`${labelFor(key)}, клавиша ${key.label}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  window.focus();
                  event.currentTarget.focus();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  binding.start(key, `pointer:${event.pointerId}`);
                }}
                onPointerUp={(event) =>
                  binding.end(`pointer:${event.pointerId}`)
                }
                onPointerCancel={(event) =>
                  binding.end(`pointer:${event.pointerId}`)
                }
                onLostPointerCapture={(event) =>
                  binding.end(`pointer:${event.pointerId}`)
                }
                onKeyDown={(event) => {
                  if (
                    ["Enter", "Space"].includes(event.code) &&
                    !event.repeat
                  ) {
                    event.preventDefault();
                    binding.start(key, `button:${key.code}`);
                  }
                }}
                onKeyUp={(event) => {
                  if (["Enter", "Space"].includes(event.code)) {
                    event.preventDefault();
                    binding.end(`button:${key.code}`);
                  }
                }}
              >
                <span className="letter">{key.label}</span>
                <span className="note">
                  {piano ? (key.black ? "" : key.note) : labelFor(key)}
                </span>
              </button>
            ))}
          </div>
        );
        return piano ? (
          <section
            key={row.id}
            className="octave"
            aria-label={
              index === 0 ? "Верхний ряд клавиатуры" : "Нижний ряд клавиатуры"
            }
          >
            <div className="octave-heading">
              <span>{index === 0 ? "ВЫШЕ" : "НИЖЕ"}</span>
              <span>{index === 0 ? "Q → ]" : "Z → /"}</span>
            </div>
            {keyboard}
          </section>
        ) : (
          <div key={row.id} className="keyboard-row">
            {keyboard}
          </div>
        );
      })}
    </>
  );
}
