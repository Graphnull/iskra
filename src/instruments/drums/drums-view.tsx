import { useState } from "react";
import { createDrums, TRACKS } from "./drums.js";
import { DRUM_BINDINGS } from "./drum-notes.js";
import { SAMPLE_BINDINGS } from "./drum-samples.js";
import { at } from "../../core/guards.js";
import { useController } from "../../ui/hooks.js";
import {
  Header,
  PlaybackControls,
  SectionSelector,
} from "../../ui/controls.js";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js";
import { NoteGrid } from "../../ui/grid.js";
export function Drums() {
  const model = useController(createDrums),
    keyboard = useKeyboard(model);
  const [keys, setKeys] = useState(false),
    busy = model.recordState !== "idle";
  return (
    <main className="tenorion drum-machine" aria-labelledby="title">
      <Header
        title="Драм-машина"
        eyebrow="СОБЕРИ СВОЙ ГРУВ"
        view={keys ? "keys" : "grid"}
        onToggle={() => {
          keyboard.releaseAll();
          setKeys(!keys);
        }}
      />
      <PlaybackControls
        engine={model.engine}
        onClear={model.clear}
        disabled={busy}
        drums
      />
      <SectionSelector
        selected={model.sequence.state.selected}
        playing={model.playing}
        onSelect={model.select}
      />
      <button
        className="drum-record-window"
        type="button"
        hidden={!model.recordWindow}
        onClick={model.openRecordWindow}
      >
        Записать в отдельном окне ↗
      </button>
      <section
        className="live-keys"
        aria-label="Игра с клавиатуры, мышью или касанием"
        hidden={!keys}
      >
        <Keyboard binding={keyboard} labelFor={model.labelFor} />
      </section>
      <NoteGrid
        kind="drum"
        labels={TRACKS}
        selected={model.sequence.state.selected}
        playing={model.playing}
        hidden={keys}
        onEdit={model.edit}
        note={(row, column) => ({
          enabled: !!at(model.sequence.pattern, row)[column],
        })}
        rowContent={(row) => {
          if (row < 8) {
            const binding = at(DRUM_BINDINGS, row);
            return (
              <span className="drum-track-name" aria-hidden="true">
                {at(TRACKS, row)}
                <small>
                  {binding.note} · {binding.key}
                </small>
              </span>
            );
          }
          const slot = row - 8,
            binding = at(SAMPLE_BINDINGS, slot),
            sample = model.samples[slot],
            recording =
              model.recordState === "recording" && model.requestedSlot === slot;
          return (
            <span className="drum-track-name sample-track">
              <div>
                <button
                  type="button"
                  className={`sample-preview${sample ? " has-sample" : ""}`}
                  disabled={busy || !sample}
                  aria-label={`Прослушать семпл ${slot + 1}`}
                  title={
                    sample
                      ? `${at(TRACKS, row)} · ${binding.note} · ${sample.duration.toFixed(1)} с`
                      : "Запиши свой звук"
                  }
                  onClick={() => void model.preview(slot)}
                >
                  Семпл {slot + 1}
                </button>
                <button
                  type="button"
                  className={`sample-record${recording ? " is-recording" : ""}`}
                  disabled={busy && !recording}
                  aria-label={`${recording ? "Остановить запись" : "Записать"} семпл ${slot + 1}`}
                  onClick={() => model.record(slot)}
                >
                  {recording ? "■" : "●"}
                </button>
              </div>
              <small>
                {binding.key} ·{" "}
                {sample ? `${sample.duration.toFixed(1)} с` : "пусто"}
              </small>
            </span>
          );
        }}
      />
      {model.status && (
        <p id="record-status" className="sequencer-hint" role="status">
          {model.status}
        </p>
      )}
      <p className="sequencer-hint drum-hint" hidden={!!model.status}>
        4 секции × 16 шагов · красная точка — играет
      </p>
    </main>
  );
}
