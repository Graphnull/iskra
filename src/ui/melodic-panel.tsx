import { useController } from "./hooks.js";
import {
  PlaybackControls,
  NumberControl,
  SectionSelector,
} from "./controls.js";
import { NoteGrid } from "./grid.js";
import { createMelodicPlayer } from "../core/melodic-player.js";
import type { MelodicInstrument } from "../core/melodic-player.js";
import { noteAt } from "../core/melodic-sequence.js";
import { at } from "../core/guards.js";
import { noteLabel } from "../core/scales.js";
export function MelodicPanel({
  instrument,
  hidden,
  activeLabels = [],
}: {
  instrument: MelodicInstrument;
  hidden: boolean;
  activeLabels?: readonly string[];
}) {
  const model = useController(() => createMelodicPlayer(instrument));
  return (
    <div className="melodic-panel" hidden={hidden}>
      <PlaybackControls engine={model.engine} onClear={model.clear} />
      <div className="melodic-tools">
        <label>
          Октава{" "}
          <NumberControl
            label="Сдвиг октавы"
            min={-2}
            max={2}
            value={model.state.octave}
            onChange={model.setOctave}
          />
        </label>
      </div>
      <SectionSelector
        selected={model.state.selected}
        playing={model.playing}
        onSelect={model.select}
      />
      <NoteGrid
        kind="synth"
        ariaLabel={instrument === "piano" ? "Ноты пианино" : "Ноты гитары"}
        activeLabels={activeLabels}
        hidden={hidden}
        labels={Array.from({ length: 16 }, (_, row) =>
          noteLabel(model.pitch(row)),
        )}
        selected={model.state.selected}
        playing={model.playing}
        onEdit={model.edit}
        note={(row, column) => {
          const note = noteAt(
            at(model.state.sections, model.state.selected),
            row,
            column,
          );
          return {
            enabled: !!note,
            start: note?.start === column,
            end: !!note && note.start + note.length - 1 === column,
            ...(note ? { length: note.length } : {}),
          };
        }}
      />
    </div>
  );
}
