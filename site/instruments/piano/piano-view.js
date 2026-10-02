import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { buildKeyMap } from "../../core/keyboard-map.js?v=f1d1aaff72ac";
import { noteLabel } from "../../core/scales.js?v=f1d1aaff72ac";
import { useState } from "react";
import { MelodicPanel } from "../../ui/melodic-panel.js?v=f1d1aaff72ac";
import { createPiano } from "./piano.js?v=f1d1aaff72ac";
import { useController } from "../../ui/hooks.js?v=f1d1aaff72ac";
import { Header } from "../../ui/controls.js?v=f1d1aaff72ac";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js?v=f1d1aaff72ac";
export function Piano() {
    const model = useController(createPiano), keyboard = useKeyboard(model);
    const [grid, setGrid] = useState(false);
    return (_jsxs("main", { className: "piano piano-instrument", "aria-labelledby": "title", children: [_jsx(Header, { title: "\u041F\u0438\u0430\u043D\u0438\u043D\u043E", view: grid ? "grid" : "keys", onToggle: () => setGrid(!grid) }), _jsx(MelodicPanel, { instrument: "piano", hidden: !grid, activeLabels: buildKeyMap()
                    .filter((key) => keyboard.active.has(key.code))
                    .map((key) => noteLabel(key.midi)) }), _jsx("div", { className: "piano-keyboard", hidden: grid, children: _jsx(Keyboard, { binding: keyboard, labelFor: (key) => `${key.note}${key.octave}`, piano: true }) })] }));
}
