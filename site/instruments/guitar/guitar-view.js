import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MelodicPanel } from "../../ui/melodic-panel.js?v=f1d1aaff72ac";
import { useRef, useState } from "react";
import { Header } from "../../ui/controls.js?v=f1d1aaff72ac";
import { useController } from "../../ui/hooks.js?v=f1d1aaff72ac";
import { InstrumentStatus } from "../../ui/status.js?v=f1d1aaff72ac";
import { createGuitar } from "./guitar.js?v=f1d1aaff72ac";
import { crossedStrings, noteName, stringMidi, TUNING, } from "./guitar-notes.js?v=f1d1aaff72ac";
export function Guitar() {
    const model = useController(createGuitar);
    const strokes = useRef(new Map());
    const [grid, setGrid] = useState(false);
    return (_jsxs("main", { className: "piano guitar-instrument", "aria-labelledby": "title", children: [_jsx(Header, { title: "\u0413\u0438\u0442\u0430\u0440\u0430", view: grid ? "grid" : "keys", alternateLabel: "\u0413\u0440\u0438\u0444", onToggle: () => {
                    model.clear();
                    strokes.current.clear();
                    setGrid(!grid);
                } }), _jsx(MelodicPanel, { instrument: "guitar", hidden: !grid }), _jsxs("div", { className: "guitar-toolbar", hidden: grid, children: [_jsx("span", { children: "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439 \u0441\u0442\u0440\u043E\u0439 \u00B7 6 \u0441\u0442\u0440\u0443\u043D" }), _jsx("button", { type: "button", onClick: model.clear, children: "\u0421\u0431\u0440\u043E\u0441" })] }), _jsxs("div", { className: "guitar-neck", hidden: grid, role: "group", "aria-label": "\u0417\u0430\u0436\u0430\u0442\u0438\u044F \u043D\u0430 \u0433\u0440\u0438\u0444\u0435", children: [_jsx("div", { className: "guitar-fret-number", "aria-hidden": "true", children: "\u041B\u0430\u0434" }), TUNING.map((_, string) => (_jsx("button", { className: "guitar-open", type: "button", "aria-label": `Снять зажатие струны ${string + 1}`, onClick: () => model.toggle(string, model.fret(string)), children: noteName(stringMidi(string, model.fret(string))) }, string))), [1, 2, 3, 4, 5].map((fret) => (_jsxs("div", { className: "guitar-fret", children: [_jsx("span", { className: "guitar-fret-number", children: fret }), TUNING.map((_, string) => (_jsx("button", { type: "button", className: `guitar-point${model.fret(string) === fret ? " is-held" : ""}`, "aria-label": `Струна ${string + 1}, лад ${fret}, ${noteName(stringMidi(string, fret))}`, "aria-pressed": model.fret(string) === fret, onPointerDown: (event) => {
                                    if (event.button !== 0)
                                        return;
                                    if (event.pointerType === "mouse") {
                                        model.toggle(string, fret);
                                        return;
                                    }
                                    event.preventDefault();
                                    event.currentTarget.setPointerCapture(event.pointerId);
                                    model.hold(event.pointerId, string, fret);
                                }, onPointerUp: (event) => model.release(event.pointerId), onPointerCancel: (event) => model.release(event.pointerId), onLostPointerCapture: (event) => model.release(event.pointerId), onClick: (event) => {
                                    if (event.detail === 0)
                                        model.toggle(string, fret);
                                }, children: _jsx("span", {}) }, string)))] }, fret)))] }), _jsx("div", { className: "guitar-strum", hidden: grid, role: "group", "aria-label": "\u041F\u0440\u043E\u0432\u0435\u0434\u0438 \u043F\u043E\u043F\u0435\u0440\u0451\u043A \u0441\u0442\u0440\u0443\u043D \u0434\u043B\u044F \u0431\u043E\u044F", onPointerDown: (event) => {
                    if (event.button !== 0)
                        return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = (event.clientX - rect.left) / rect.width;
                    strokes.current.set(event.pointerId, x);
                    void model.pluck(Math.max(0, Math.min(5, Math.floor(x * 6))));
                }, onPointerMove: (event) => {
                    const from = strokes.current.get(event.pointerId);
                    if (from === undefined)
                        return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = (event.clientX - rect.left) / rect.width;
                    for (const string of crossedStrings(from, x))
                        void model.pluck(string);
                    strokes.current.set(event.pointerId, x);
                }, onPointerUp: (event) => strokes.current.delete(event.pointerId), onPointerCancel: (event) => strokes.current.delete(event.pointerId), onLostPointerCapture: (event) => strokes.current.delete(event.pointerId), children: TUNING.map((_, string) => (_jsxs("button", { type: "button", "aria-label": `Щипнуть струну ${string + 1}`, className: `guitar-string${model.ringing(string) ? " is-ringing" : ""}`, onClick: (event) => {
                        if (event.detail === 0)
                            void model.pluck(string);
                    }, children: [_jsx("span", { className: "guitar-string-wire", style: { width: `${2.5 - string * 0.3}px` } }), _jsx("span", { className: "guitar-key", children: "ZXCVBN"[string] })] }, string))) }), _jsx(InstrumentStatus, { children: model.status })] }));
}
