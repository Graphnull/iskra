import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { bindKeyInput } from "../core/live-keyboard.js?v=f1d1aaff72ac";
import { buildKeyMap, ROWS } from "../core/keyboard-map.js?v=f1d1aaff72ac";
const KEYS = buildKeyMap();
export function useKeyboard(options) {
    const current = useRef(options);
    current.current = options;
    const input = useRef(null);
    const [active, setActive] = useState(new Set());
    useEffect(() => {
        const binding = bindKeyInput({
            onNoteOn: (key, source) => current.current.onNoteOn(key, source),
            onNoteOff: (voice) => current.current.onNoteOff?.(voice),
            onHighlight(key, held) {
                setActive((previous) => {
                    const next = new Set(previous);
                    if (held)
                        next.add(key.code);
                    else
                        next.delete(key.code);
                    return next;
                });
                current.current.onHighlight?.(key, held);
            },
        });
        input.current = binding;
        return () => {
            input.current = null;
            binding.dispose();
        };
    }, []);
    return {
        active,
        start: (key, source) => input.current?.start(key, source),
        end: (source) => input.current?.end(source),
        releaseAll: () => input.current?.releaseAll(),
    };
}
export function Keyboard({ binding, labelFor, piano = false }) {
    return (_jsx(_Fragment, { children: ROWS.map((row, index) => {
            const keyboard = (_jsx("div", { className: "keyboard", id: row.id, style: { "--white-count": row.white.length }, children: KEYS.filter((key) => key.row === row.id).map((key) => (_jsxs("button", { type: "button", className: `key ${key.black ? "black" : "white"}${binding.active.has(key.code) ? " is-active" : ""}`, "data-code": key.code, style: key.black
                        ? { "--position": key.position }
                        : undefined, "aria-label": `${labelFor(key)}, клавиша ${key.label}`, onPointerDown: (event) => {
                        event.preventDefault();
                        window.focus();
                        event.currentTarget.focus();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        binding.start(key, `pointer:${event.pointerId}`);
                    }, onPointerUp: (event) => binding.end(`pointer:${event.pointerId}`), onPointerCancel: (event) => binding.end(`pointer:${event.pointerId}`), onLostPointerCapture: (event) => binding.end(`pointer:${event.pointerId}`), onKeyDown: (event) => {
                        if (["Enter", "Space"].includes(event.code) &&
                            !event.repeat) {
                            event.preventDefault();
                            binding.start(key, `button:${key.code}`);
                        }
                    }, onKeyUp: (event) => {
                        if (["Enter", "Space"].includes(event.code)) {
                            event.preventDefault();
                            binding.end(`button:${key.code}`);
                        }
                    }, children: [_jsx("span", { className: "letter", children: key.label }), _jsx("span", { className: "note", children: piano ? (key.black ? "" : key.note) : labelFor(key) })] }, key.code))) }));
            return piano ? (_jsxs("section", { className: "octave", "aria-label": index === 0 ? "Верхний ряд клавиатуры" : "Нижний ряд клавиатуры", children: [_jsxs("div", { className: "octave-heading", children: [_jsx("span", { children: index === 0 ? "ВЫШЕ" : "НИЖЕ" }), _jsx("span", { children: index === 0 ? "Q → ]" : "Z → /" })] }), keyboard] }, row.id)) : (_jsx("div", { className: "keyboard-row", children: keyboard }, row.id));
        }) }));
}
