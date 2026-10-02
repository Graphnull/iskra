import { useState } from "react";
import { createTenorion, rowMidi, SIZE } from "./tenorion.js";
import { SCALES, isScaleId, noteLabel } from "../../core/scales.js";
import { at } from "../../core/guards.js";
import { useController } from "../../ui/hooks.js";
import {
  Header,
  PlaybackControls,
  NumberControl,
  SectionSelector,
} from "../../ui/controls.js";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js";
import { NoteGrid } from "../../ui/grid.js";
export function Tenorion() {
  const model = useController(createTenorion),
    keyboard = useKeyboard(model);
  const [keys, setKeys] = useState(false);
  return (
    <main className="tenorion" aria-labelledby="title">
      <Header
        title="Tenori-on"
        view={keys ? "keys" : "grid"}
        onToggle={() => {
          keyboard.releaseAll();
          setKeys(!keys);
        }}
      />
      <PlaybackControls engine={model.engine} onClear={model.clear}>
        <select
          aria-label="Инструмент"
          value={model.instrument}
          onChange={(event) => model.setInstrument(event.target.value)}
        >
          <option value="bell">Колокольчик</option>
          <option value="keys">Электропиано</option>
          <option value="pluck">Щипковый</option>
          <option value="pad">Синтезатор</option>
        </select>
      </PlaybackControls>
      <div className="harmony-controls">
        <select
          aria-label="Гамма"
          value={model.harmony.scale}
          onChange={(event) => {
            if (isScaleId(event.target.value))
              model.setHarmony({ ...model.harmony, scale: event.target.value });
          }}
        >
          {Object.entries(SCALES).map(([id, scale]) => (
            <option key={id} value={id}>
              {scale.name}
            </option>
          ))}
        </select>
        <label>
          Сдвиг{" "}
          <NumberControl
            label="Транспозиция в полутонах"
            value={model.harmony.transpose}
            min={-12}
            max={12}
            onChange={(value) =>
              model.setHarmony({
                ...model.harmony,
                transpose: Math.round(value),
              })
            }
          />
        </label>
        <label>
          Октава{" "}
          <NumberControl
            label="Сдвиг октавы"
            value={model.harmony.octave}
            min={-2}
            max={2}
            onChange={(value) =>
              model.setHarmony({ ...model.harmony, octave: Math.round(value) })
            }
          />
        </label>
      </div>
      <SectionSelector
        selected={model.sequence.state.selected}
        playing={model.playing}
        onSelect={model.select}
      />
      <section
        className="live-keys"
        aria-label="Игра с клавиатуры, мышью или касанием"
        hidden={!keys}
      >
        <Keyboard binding={keyboard} labelFor={model.labelFor} />
      </section>
      <NoteGrid
        kind="light"
        labels={Array.from({ length: SIZE }, (_, row) =>
          noteLabel(rowMidi(row, model.harmony)),
        )}
        selected={model.sequence.state.selected}
        playing={model.playing}
        hidden={keys}
        note={(row, column) => ({
          enabled: !!at(model.sequence.pattern, row)[column],
        })}
        onEdit={model.edit}
      />
    </main>
  );
}
