import { SampleEditor } from "../../ui/sample-editor.js";
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
    busy = model.recordState !== "idle",
    editingSlot = model.editingSlot,
    editedSample = editingSlot === null ? null : model.samples[editingSlot];
  return (
    <main className="tenorion drum-machine" aria-labelledby="title">
      <Header
        title="Драм-машина"
        eyebrow="СОБЕРИ СВОЙ ГРУВ"
        view={keys ? "keys" : "grid"}
        onToggle={() => {
          keyboard.releaseAll();
          model.openSample(null);
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
        hidden={!keys || model.editingSlot !== null}
      >
        <Keyboard binding={keyboard} labelFor={model.labelFor} />
      </section>
      {editingSlot !== null && editedSample && (
        <SampleEditor
          buffer={editedSample}
          settings={at(model.sampleSettings, editingSlot)}
          slot={editingSlot}
          busy={busy}
          onChange={(patch) => model.setSampleSettings(editingSlot, patch)}
          onPreview={() => void model.preview(editingSlot)}
          onClose={() => model.openSample(null)}
        />
      )}
      <NoteGrid
        kind="drum"
        labels={TRACKS}
        selected={model.sequence.state.selected}
        playing={model.playing}
        hidden={keys || model.editingSlot !== null}
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
                  aria-label={`Настроить семпл ${slot + 1}`}
                  title={
                    sample
                      ? `Настроить ${at(TRACKS, row)} · громкость и начало`
                      : "Запиши свой звук"
                  }
                  onClick={() => model.openSample(slot)}
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
        {editingSlot !== null
          ? "Нажми на волну — сдвинь начало · Q/W/E/R — семплы"
          : "4 секции × 16 шагов · красная точка — играет"}
      </p>
    </main>
  );
}
