import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createPiano } from "./piano.js?v=44ddd5741a85";
import { useController } from "../../ui/hooks.js?v=44ddd5741a85";
import { FocusIndicator } from "../../ui/focus.js?v=44ddd5741a85";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js?v=44ddd5741a85";
export function Piano() {
    const model = useController(createPiano), keyboard = useKeyboard(model);
    return (_jsxs("main", { className: "piano", "aria-labelledby": "title", children: [_jsxs("header", { className: "heading", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "\u041A\u0410\u0420\u041C\u0410\u041D\u041D\u041E\u0415 \u041F\u0418\u0410\u041D\u0418\u041D\u041E" }), _jsx("h1", { id: "title", children: "\u0418\u0433\u0440\u0430\u0439 \u0441 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B" })] }), _jsx("span", { className: "sound-mark", "aria-label": "\u0417\u0432\u0443\u043A \u0432\u043A\u043B\u044E\u0447\u0451\u043D", children: "\u266B" })] }), _jsx(FocusIndicator, { compact: false }), _jsx(Keyboard, { binding: keyboard, labelFor: (key) => `${key.note}${key.octave}`, piano: true }), _jsxs("p", { className: "footer", children: ["\u0420\u0430\u0441\u043A\u043B\u0430\u0434\u043A\u0430 \u043D\u0435 \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u043D\u043E\u0442\u044B ", _jsx("span", { "aria-hidden": "true", children: "\u2726" }), " \u041C\u043E\u0436\u043D\u043E \u0438\u0433\u0440\u0430\u0442\u044C \u0430\u043A\u043A\u043E\u0440\u0434\u0430\u043C\u0438"] })] }));
}
