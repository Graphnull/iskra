import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createPiano } from "./piano.js?v=71ab8094b827";
import { useController } from "../../ui/hooks.js?v=71ab8094b827";
import { Header } from "../../ui/controls.js?v=71ab8094b827";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js?v=71ab8094b827";
export function Piano() {
    const model = useController(createPiano), keyboard = useKeyboard(model);
    return (_jsxs("main", { className: "piano piano-instrument", "aria-labelledby": "title", children: [_jsx(Header, { title: "\u041F\u0438\u0430\u043D\u0438\u043D\u043E", eyebrow: "\u0418\u0413\u0420\u0410\u0419 \u0421 \u041A\u041B\u0410\u0412\u0418\u0410\u0422\u0423\u0420\u042B" }), _jsx("div", { className: "piano-keyboard", children: _jsx(Keyboard, { binding: keyboard, labelFor: (key) => `${key.note}${key.octave}`, piano: true }) })] }));
}
