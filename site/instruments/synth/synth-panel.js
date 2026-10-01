import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ADSREditor } from "../../ui/adsr.js?v=ee6d7c71cf26";
const FILTER_KEYS = {
    attack: "filterAttack",
    decay: "filterDecay",
    sustain: "filterSustain",
    release: "filterRelease",
};
const KNOBS = [
    ["cutoff", "Частота", 200, 10000, "Hz"],
    ["resonance", "Резонанс", 0, 12, "Q"],
    ["filterAmount", "Глубина фильтра", 0, 1, "%"],
];
export function SynthPanel({ state, held, onChange, hidden, }) {
    const [filter, setFilter] = useState(false);
    return (_jsxs("section", { className: "synth-panel", "aria-label": "\u041F\u0443\u043B\u044C\u0442 \u0441\u0438\u043D\u0442\u0435\u0437\u0430\u0442\u043E\u0440\u0430", hidden: hidden, children: [_jsxs("div", { className: "envelope-tabs", children: [_jsxs("div", { role: "group", "aria-label": "\u041E\u0433\u0438\u0431\u0430\u044E\u0449\u0430\u044F", children: [_jsx("button", { type: "button", "aria-pressed": !filter, onClick: () => setFilter(false), children: "\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C" }), _jsx("button", { type: "button", "aria-pressed": filter, onClick: () => setFilter(true), children: "\u0424\u0438\u043B\u044C\u0442\u0440" })] }), _jsx("span", { className: "held-notes", children: held.length ? held.join(" · ") : "Играй Z–/ или Q–]" })] }), _jsx(ADSREditor, { value: state, title: "\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C", hidden: filter, onChange: onChange }), _jsx(ADSREditor, { value: {
                    attack: state.filterAttack,
                    decay: state.filterDecay,
                    sustain: state.filterSustain,
                    release: state.filterRelease,
                }, title: "\u0424\u0438\u043B\u044C\u0442\u0440", hidden: !filter, onChange: (stage, value) => onChange(FILTER_KEYS[stage], value) }), KNOBS.map(([key, label, min, max, unit]) => {
                const logarithmic = key === "cutoff", encoded = Math.round(logarithmic
                    ? (Math.log(state[key] / min) / Math.log(max / min)) * 1000
                    : ((state[key] - min) / (max - min)) * 1000);
                const display = unit === "Hz"
                    ? `${Math.round(state[key])} Гц`
                    : unit === "%"
                        ? `${Math.round(state[key] * 100)}%`
                        : state[key].toFixed(1);
                return (_jsxs("label", { className: "synth-knob", style: { "--angle": `${encoded * 0.27 - 135}deg` }, children: [_jsx("span", { children: label }), _jsxs("span", { className: "knob-dial", children: [_jsx("input", { type: "range", min: "0", max: "1000", step: "1", "aria-label": label, "aria-valuetext": display, value: encoded, onChange: (event) => {
                                        const value = Number(event.target.value);
                                        onChange(key, logarithmic
                                            ? min * (max / min) ** (value / 1000)
                                            : min + ((max - min) * value) / 1000);
                                    } }), _jsx("span", { className: "knob-pointer" })] }), _jsx("output", { children: display })] }, key));
            })] }));
}
