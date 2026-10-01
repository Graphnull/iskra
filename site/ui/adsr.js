import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { ENVELOPE_RANGES, envelopeGeometry, envelopeText, envelopeRatio, envelopeValue, envelopeDrag, } from "../core/envelope.js?v=06d05f371f9a";
const STAGES = [
    "attack",
    "decay",
    "sustain",
    "release",
];
const NAMES = {
    attack: "Атака",
    decay: "Затухание",
    sustain: "Сустейн",
    release: "Релиз",
};
const LETTERS = {
    attack: "A",
    decay: "D",
    sustain: "S",
    release: "R",
};
export function ADSREditor({ value, title, onChange, hidden = false, }) {
    const container = useRef(null), gesture = useRef(null);
    const shape = envelopeGeometry(value);
    return (_jsxs("div", { ref: container, className: "adsr-editor", role: "group", "aria-label": `${title} · ADSR`, hidden: hidden, children: [_jsxs("svg", { className: "adsr-svg", viewBox: "0 0 320 100", preserveAspectRatio: "none", role: "img", "aria-label": STAGES.map((stage) => `${NAMES[stage]} ${envelopeText(stage, value[stage])}`).join(", "), children: [_jsx("path", { className: "envelope-axis", d: "M12 5V68H308" }), _jsx("path", { className: "adsr-path", d: shape.path }), STAGES.map((stage, index) => (_jsx("g", { children: _jsxs("text", { x: index * 80 + 40, y: "85", textAnchor: "middle", children: [LETTERS[stage], " \u00B7 ", envelopeText(stage, value[stage])] }) }, stage))), _jsx("text", { className: "adsr-hint", x: "160", y: "98", textAnchor: "middle", children: "\u0422\u044F\u043D\u0438 \u0442\u043E\u0447\u043A\u0438 \u00B7 A/D/R \u2014 \u0432\u0440\u0435\u043C\u044F \u00B7 S \u2014 \u0443\u0440\u043E\u0432\u0435\u043D\u044C" })] }), STAGES.map((stage) => {
                const point = shape.handles[stage], [min, max] = ENVELOPE_RANGES[stage];
                return (_jsx("button", { type: "button", className: `adsr-handle adsr-${stage}`, role: "slider", "aria-label": `${title}: ${NAMES[stage]}`, "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": value[stage], "aria-valuetext": envelopeText(stage, value[stage]), "aria-orientation": stage === "sustain" ? "vertical" : "horizontal", title: `${NAMES[stage]}: ${envelopeText(stage, value[stage])}`, style: {
                        left: `${(point.x / 320) * 100}%`,
                        top: `${point.y}%`,
                    }, onPointerDown: (event) => {
                        if (event.button !== 0)
                            return;
                        const rect = container.current?.getBoundingClientRect();
                        if (!rect?.width || !rect.height)
                            return;
                        event.preventDefault();
                        event.currentTarget.focus();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        gesture.current = {
                            id: event.pointerId,
                            stage,
                            startX: event.clientX,
                            startY: event.clientY,
                            width: rect.width,
                            height: rect.height,
                            value: { ...value },
                        };
                    }, onPointerMove: (event) => {
                        const drag = gesture.current;
                        if (!drag || drag.id !== event.pointerId)
                            return;
                        onChange(drag.stage, envelopeDrag(drag.value, drag.stage, ((event.clientX - drag.startX) * 320) / drag.width, ((event.clientY - drag.startY) * 100) / drag.height));
                    }, onPointerUp: () => {
                        gesture.current = null;
                    }, onPointerCancel: () => {
                        gesture.current = null;
                    }, onLostPointerCapture: () => {
                        gesture.current = null;
                    }, onKeyDown: (event) => {
                        const direction = event.key === "ArrowRight" || event.key === "ArrowUp"
                            ? 1
                            : event.key === "ArrowLeft" || event.key === "ArrowDown"
                                ? -1
                                : 0;
                        if (event.key === "Home" || event.key === "End") {
                            event.preventDefault();
                            onChange(stage, event.key === "Home" ? min : max);
                            return;
                        }
                        if (!direction)
                            return;
                        event.preventDefault();
                        onChange(stage, envelopeValue(stage, envelopeRatio(stage, value[stage]) +
                            direction * (event.shiftKey ? 0.1 : 0.01)));
                    }, children: _jsx("span", { "aria-hidden": "true", children: LETTERS[stage] }) }, stage));
            })] }));
}
