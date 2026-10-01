import { createPiano } from "./piano.js";
import { useController } from "../../ui/hooks.js";
import { FocusIndicator } from "../../ui/focus.js";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js";
export function Piano() {
  const model = useController(createPiano),
    keyboard = useKeyboard(model);
  return (
    <main className="piano" aria-labelledby="title">
      <header className="heading">
        <div>
          <p className="eyebrow">КАРМАННОЕ ПИАНИНО</p>
          <h1 id="title">Играй с клавиатуры</h1>
        </div>
        <span className="sound-mark" aria-label="Звук включён">
          ♫
        </span>
      </header>
      <FocusIndicator compact={false} />
      <Keyboard
        binding={keyboard}
        labelFor={(key) => `${key.note}${key.octave}`}
        piano
      />
      <p className="footer">
        Раскладка не влияет на ноты <span aria-hidden="true">✦</span> Можно
        играть аккордами
      </p>
    </main>
  );
}
