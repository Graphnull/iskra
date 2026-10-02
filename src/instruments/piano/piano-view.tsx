import { buildKeyMap } from "../../core/keyboard-map.js";
import { noteLabel } from "../../core/scales.js";
import { useState } from "react";
import { MelodicPanel } from "../../ui/melodic-panel.js";
import { createPiano } from "./piano.js";
import { useController } from "../../ui/hooks.js";
import { Header } from "../../ui/controls.js";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js";
export function Piano() {
  const model = useController(createPiano),
    keyboard = useKeyboard(model);
  const [grid, setGrid] = useState(false);
  return (
    <main className="piano piano-instrument" aria-labelledby="title">
      <Header
        title="Пианино"
        view={grid ? "grid" : "keys"}
        onToggle={() => setGrid(!grid)}
      />
      <MelodicPanel
        instrument="piano"
        hidden={!grid}
        activeLabels={buildKeyMap()
          .filter((key) => keyboard.active.has(key.code))
          .map((key) => noteLabel(key.midi))}
      />
      <div className="piano-keyboard" hidden={grid}>
        <Keyboard
          binding={keyboard}
          labelFor={(key) => `${key.note}${key.octave}`}
          piano
        />
      </div>
    </main>
  );
}
