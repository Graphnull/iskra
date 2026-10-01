import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createPiano } from "./piano.js?v=b2a541907b97";
import { useController } from "../../ui/hooks.js?v=b2a541907b97";
import { Header } from "../../ui/controls.js?v=b2a541907b97";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js?v=b2a541907b97";
export function Piano() {
    const model = useController(createPiano), keyboard = useKeyboard(model);
    return (_jsxs("main", { className: "piano piano-instrument", "aria-labelledby": "title", children: [_jsx(Header, { title: "\u041F\u0438\u0430\u043D\u0438\u043D\u043E", eyebrow: "\u0418\u0413\u0420\u0410\u0419 \u0421 \u041A\u041B\u0410\u0412\u0418\u0410\u0422\u0423\u0420\u042B" }), _jsx("div", { className: "piano-keyboard", children: _jsx(Keyboard, { binding: keyboard, labelFor: (key) => `${key.note}${key.octave}`, piano: true }) }), _jsx("p", { className: "sequencer-hint", children: "Q\u2013] \u00B7 Z\u2013/ \u00B7 \u043B\u044E\u0431\u0430\u044F \u0440\u0430\u0441\u043A\u043B\u0430\u0434\u043A\u0430 \u00B7 \u043C\u043E\u0436\u043D\u043E \u0438\u0433\u0440\u0430\u0442\u044C \u0430\u043A\u043A\u043E\u0440\u0434\u0430\u043C\u0438" })] }));
}
