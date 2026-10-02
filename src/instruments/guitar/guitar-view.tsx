import { MelodicPanel } from "../../ui/melodic-panel.js";
import { useRef, useState } from "react";
import { Header } from "../../ui/controls.js";
import { useController } from "../../ui/hooks.js";
import { InstrumentStatus } from "../../ui/status.js";
import { createGuitar } from "./guitar.js";
import {
  crossedStrings,
  noteName,
  stringMidi,
  TUNING,
} from "./guitar-notes.js";
export function Guitar() {
  const model = useController(createGuitar);
  const strokes = useRef(new Map<number, number>());
  const [grid, setGrid] = useState(false);
  return (
    <main className="piano guitar-instrument" aria-labelledby="title">
      <Header
        title="Гитара"
        view={grid ? "grid" : "keys"}
        alternateLabel="Гриф"
        onToggle={() => {
          model.clear();
          strokes.current.clear();
          setGrid(!grid);
        }}
      />
      <MelodicPanel instrument="guitar" hidden={!grid} />
      <div className="guitar-toolbar" hidden={grid}>
        <span>Стандартный строй · 6 струн</span>
        <button type="button" onClick={model.clear}>
          Сброс
        </button>
      </div>
      <div
        className="guitar-neck"
        hidden={grid}
        role="group"
        aria-label="Зажатия на грифе"
      >
        <div className="guitar-fret-number" aria-hidden="true">
          Лад
        </div>
        {TUNING.map((_, string) => (
          <button
            className="guitar-open"
            key={string}
            type="button"
            aria-label={`Снять зажатие струны ${string + 1}`}
            onClick={() => model.toggle(string, model.fret(string))}
          >
            {noteName(stringMidi(string, model.fret(string)))}
          </button>
        ))}
        {[1, 2, 3, 4, 5].map((fret) => (
          <div className="guitar-fret" key={fret}>
            <span className="guitar-fret-number">{fret}</span>
            {TUNING.map((_, string) => (
              <button
                key={string}
                type="button"
                className={`guitar-point${model.fret(string) === fret ? " is-held" : ""}`}
                aria-label={`Струна ${string + 1}, лад ${fret}, ${noteName(stringMidi(string, fret))}`}
                aria-pressed={model.fret(string) === fret}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  if (event.pointerType === "mouse") {
                    model.toggle(string, fret);
                    return;
                  }
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  model.hold(event.pointerId, string, fret);
                }}
                onPointerUp={(event) => model.release(event.pointerId)}
                onPointerCancel={(event) => model.release(event.pointerId)}
                onLostPointerCapture={(event) => model.release(event.pointerId)}
                onClick={(event) => {
                  if (event.detail === 0) model.toggle(string, fret);
                }}
              >
                <span />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div
        className="guitar-strum"
        hidden={grid}
        role="group"
        aria-label="Проведи поперёк струн для боя"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          strokes.current.set(event.pointerId, x);
          void model.pluck(Math.max(0, Math.min(5, Math.floor(x * 6))));
        }}
        onPointerMove={(event) => {
          const from = strokes.current.get(event.pointerId);
          if (from === undefined) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          for (const string of crossedStrings(from, x))
            void model.pluck(string);
          strokes.current.set(event.pointerId, x);
        }}
        onPointerUp={(event) => strokes.current.delete(event.pointerId)}
        onPointerCancel={(event) => strokes.current.delete(event.pointerId)}
        onLostPointerCapture={(event) =>
          strokes.current.delete(event.pointerId)
        }
      >
        {TUNING.map((_, string) => (
          <button
            key={string}
            type="button"
            aria-label={`Щипнуть струну ${string + 1}`}
            className={`guitar-string${model.ringing(string) ? " is-ringing" : ""}`}
            onClick={(event) => {
              if (event.detail === 0) void model.pluck(string);
            }}
          >
            <span
              className="guitar-string-wire"
              style={{ width: `${2.5 - string * 0.3}px` }}
            />
            <span className="guitar-key">{"ZXCVBN"[string]}</span>
          </button>
        ))}
      </div>
      <InstrumentStatus>{model.status}</InstrumentStatus>
    </main>
  );
}
