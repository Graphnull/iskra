import { createPiano } from "./piano.js";
import { useController } from "../../ui/hooks.js";
import { Header } from "../../ui/controls.js";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js";
export function Piano() {
  const model = useController(createPiano),
    keyboard = useKeyboard(model);
  return (
    <main className="piano piano-instrument" aria-labelledby="title">
      <Header title="Пианино" />
      <div className="piano-keyboard">
        <Keyboard
          binding={keyboard}
          labelFor={(key) => `${key.note}${key.octave}`}
          piano
        />
      </div>
    </main>
  );
}
