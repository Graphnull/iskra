import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { FocusIndicator } from "./focus.js?v=06d05f371f9a";
export function Header({ title, eyebrow, view, onToggle, alternateLabel = "Клавиши", }) {
    return (_jsxs("header", { className: "heading", children: [_jsxs("div", { children: [eyebrow && _jsx("p", { className: "eyebrow", children: eyebrow }), _jsx("h1", { id: "title", children: title })] }), _jsxs("div", { className: "live-actions", children: [_jsx(FocusIndicator, {}), onToggle && (_jsx("button", { type: "button", className: "view-toggle", "aria-pressed": view !== "grid", onClick: onToggle, children: view === "grid" ? alternateLabel : "Сетка" }))] })] }));
}
export function NumberControl({ value, onChange, label, min, max, }) {
    const [text, setText] = useState(String(value));
    useEffect(() => setText(String(value)), [value]);
    const commit = () => {
        const next = Math.min(max, Math.max(min, text.trim() !== "" && Number.isFinite(Number(text))
            ? Number(text)
            : value));
        setText(String(next));
        onChange(next);
    };
    return (_jsx("input", { type: "number", min: min, max: max, value: text, "aria-label": label, onChange: (event) => setText(event.target.value), onBlur: commit, onKeyDown: (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
            }
        } }));
}
export function PlaybackControls({ engine, onClear, children, disabled = false, drums = false, }) {
    return (_jsxs("div", { className: `sequencer-controls${drums ? " drum-controls" : ""}`, children: [_jsx("button", { id: "play", type: "button", "aria-pressed": engine.running, disabled: engine.starting || disabled, onClick: () => void engine.toggle(), children: engine.running ? "■ Стоп" : engine.failed ? "Повторить" : "▶ Играть" }), children, _jsxs("label", { className: "tempo", children: [drums && "Темп ", _jsx(NumberControl, { label: "\u0422\u0435\u043C\u043F \u0432 \u0443\u0434\u0430\u0440\u0430\u0445 \u0432 \u043C\u0438\u043D\u0443\u0442\u0443", value: engine.bpm, min: 40, max: 240, onChange: engine.setTempo })] }), _jsx("button", { type: "button", "aria-label": "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0443\u044E \u0441\u0435\u043A\u0446\u0438\u044E", title: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0442\u0435\u043A\u0443\u0449\u0443\u044E \u0441\u0435\u043A\u0446\u0438\u044E", onClick: onClear, children: "\u0421\u0431\u0440\u043E\u0441" })] }));
}
export function SectionSelector({ selected, playing, onSelect, }) {
    return (_jsxs("div", { className: "section-controls", role: "group", "aria-label": "\u0427\u0435\u0442\u044B\u0440\u0435 \u0441\u0435\u043A\u0446\u0438\u0438 \u043F\u043E 16 \u0448\u0430\u0433\u043E\u0432", children: [_jsx("span", { children: "\u0421\u0435\u043A\u0446\u0438\u0438" }), [0, 1, 2, 3].map((section) => (_jsx("button", { type: "button", "data-section": section, "aria-label": `Секция ${section + 1}`, "aria-pressed": selected === section, "aria-current": playing?.section === section ? "step" : undefined, className: playing?.section === section ? "is-playing" : "", onClick: () => onSelect(section), children: section + 1 }, section)))] }));
}
