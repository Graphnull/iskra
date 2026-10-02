import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createPiano } from "./piano.js?v=744a04fa91ff";
import { useController } from "../../ui/hooks.js?v=744a04fa91ff";
import { Header } from "../../ui/controls.js?v=744a04fa91ff";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js?v=744a04fa91ff";
export function Piano() {
    const model = useController(createPiano), keyboard = useKeyboard(model);
    return (_jsxs("main", { className: "piano piano-instrument", "aria-labelledby": "title", children: [_jsx(Header, { title: "\u041F\u0438\u0430\u043D\u0438\u043D\u043E" }), _jsx("div", { className: "piano-keyboard", children: _jsx(Keyboard, { binding: keyboard, labelFor: (key) => `${key.note}${key.octave}`, piano: true }) })] }));
}
