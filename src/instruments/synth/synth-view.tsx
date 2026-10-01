import { useState } from "react";
import { createSynth } from "./synth.js";
import { SynthPanel } from "./synth-panel.js";
import { SYNTH_ROWS, noteAt } from "./synth-sequence.js";
import { noteLabel } from "../../core/scales.js";
import { at } from "../../core/guards.js";
import { buildKeyMap } from "../../core/keyboard-map.js";
import { useController } from "../../ui/hooks.js";
import { useKeyboard } from "../../ui/keyboard.js";
import {
  Header,
  PlaybackControls,
  NumberControl,
  SectionSelector,
} from "../../ui/controls.js";
import { NoteGrid } from "../../ui/grid.js";
const KEYS = buildKeyMap();
export function Synth() {
  const model = useController(createSynth),
    keyboard = useKeyboard(model),
    state = model.state;
  const [panel, setPanel] = useState(false);
  return (
    <main className="tenorion synth" aria-labelledby="title">
      <Header
        title="Синтезатор"
        alternateLabel="Пульт"
        view={panel ? "panel" : "grid"}
        onToggle={() => setPanel(!panel)}
      />
      <PlaybackControls engine={model.engine} onClear={model.clear}>
        <select
          aria-label="Звук"
          value={state.sound}
          onChange={(event) => model.setSound(event.target.value)}
        >
          <option value="pad">Мягкий синт</option>
          <option value="bass">808 бас</option>
          <option value="lead">Лид</option>
        </select>
      </PlaybackControls>
      <div className="synth-tools">
        <label>
          Длина{" "}
          <select
            aria-label="Длина ноты в шагах"
            value={state.length}
            onChange={(event) => model.setLength(Number(event.target.value))}
          >
            {[1, 2, 4, 8, 16].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="wave-control">
          Волна{" "}
          <select
            aria-label="Форма волны"
            value={state.waveform}
            onChange={(event) => model.setWaveform(event.target.value)}
          >
            <option value="sine">Синус</option>
            <option value="triangle">Треугольник</option>
            <option value="sawtooth">Пила</option>
            <option value="square">Прямоугольник</option>
          </select>
        </label>
        <label>
          Октава{" "}
          <NumberControl
            label="Сдвиг октавы"
            value={state.octave}
            min={-2}
            max={2}
            onChange={model.setOctave}
          />
        </label>
      </div>
      <SectionSelector
        selected={state.selected}
        playing={model.playing}
        onSelect={model.select}
      />
      <SynthPanel
        state={state}
        held={KEYS.filter((key) => keyboard.active.has(key.code)).map(
          model.labelFor,
        )}
        onChange={model.setParameter}
        onFilterType={model.setFilterType}
        onFilterControl={model.setFilterControl}
        readFrequency={model.filterFrequency}
        hidden={!panel}
      />
      <NoteGrid
        kind="synth"
        selected={state.selected}
        playing={model.playing}
        hidden={panel}
        labels={Array.from({ length: SYNTH_ROWS }, (_, row) =>
          noteLabel(model.pitch(row)),
        )}
        onEdit={model.edit}
        note={(row, column) => {
          const note = noteAt(at(state.sections, state.selected), row, column);
          return {
            enabled: !!note,
            start: note?.start === column,
            end: !!note && note.start + note.length - 1 === column,
            ...(note ? { length: note.length } : {}),
          };
        }}
      />
      <p className="sequencer-hint">
        Нажми — нота · протяни — длина · Пульт — настройки звука
      </p>
    </main>
  );
}
