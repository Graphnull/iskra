import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const KNOBS = [
    ["cutoff", "Фильтр", 200, 10000, "Hz"],
    ["resonance", "Резонанс", 0, 12, "Q"],
    ["attack", "Атака", 0.003, 2, "s"],
    ["decay", "Затухание", 0.02, 8, "s"],
    ["sustain", "Сустейн", 0, 1, "%"],
    ["release", "Релиз", 0.05, 4, "s"],
];
function formatValue(value, unit) {
    if (unit === "s")
        return `${Math.round(value * 1000)} мс`;
    if (unit === "%")
        return `${Math.round(value * 100)}%`;
    if (unit === "Hz")
        return `${Math.round(value)} Гц`;
    return value.toFixed(1);
}
export function envelopeShape(state) {
    const total = state.attack + state.decay + state.release + 1;
    const attackEnd = 8 + (state.attack / total) * 304;
    const decayEnd = attackEnd + (state.decay / total) * 304;
    const sustainEnd = decayEnd + 304 / total;
    const sustainY = 52 - state.sustain * 44;
    const points = [[8, 52]];
    const floor = 0.0001 / (state.sound === "bass" ? 0.42 : 0.18);
    function ramp(start, end, from, to) {
        for (let i = 1; i <= 24; i++) {
            const t = i / 24;
            points.push([
                start + (end - start) * t,
                52 - 44 * from * (to / from) ** t,
            ]);
        }
    }
    ramp(8, attackEnd, floor, 1);
    ramp(attackEnd, decayEnd, 1, Math.max(floor, state.sustain));
    points.push([sustainEnd, sustainY]);
    for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        points.push([
            sustainEnd + (312 - sustainEnd) * t,
            52 - 44 * state.sustain * Math.exp(-6.36 * t),
        ]);
    }
    return {
        path: points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" "),
        labels: [
            ["A", (8 + attackEnd) / 2],
            ["D", (attackEnd + decayEnd) / 2],
            ["S", (decayEnd + sustainEnd) / 2],
            ["R", (sustainEnd + 312) / 2],
        ],
    };
}
export function SynthPanel({ state, held, onChange, hidden, }) {
    const envelope = envelopeShape(state);
    return (_jsxs("section", { className: "synth-panel", "aria-label": "\u041F\u0443\u043B\u044C\u0442 \u0441\u0438\u043D\u0442\u0435\u0437\u0430\u0442\u043E\u0440\u0430", hidden: hidden, children: [_jsxs("div", { className: "envelope-view", children: [_jsxs("div", { className: "envelope-title", children: [_jsx("span", { children: "\u041E\u0433\u0438\u0431\u0430\u044E\u0449\u0430\u044F \u00B7 ADSR" }), _jsx("span", { children: held.length ? held.join(" · ") : "Играй Z–/ или Q–]" })] }), _jsxs("svg", { id: "envelope", viewBox: "0 0 320 64", role: "img", "aria-label": `Огибающая: атака ${formatValue(state.attack, "s")}, затухание ${formatValue(state.decay, "s")}, сустейн ${formatValue(state.sustain, "%")}, релиз ${formatValue(state.release, "s")}`, children: [_jsx("path", { className: "envelope-axis", d: "M8 5V52H312" }), _jsx("path", { id: "envelope-path", d: envelope.path }), _jsx("g", { children: envelope.labels.map(([label, x]) => (_jsx("text", { x: x, y: "63", textAnchor: "middle", children: label }, label))) })] })] }), KNOBS.map(([key, label, min, max, unit]) => {
                const logarithmic = unit === "s" || key === "cutoff";
                const encoded = Math.round(logarithmic
                    ? (Math.log(state[key] / min) / Math.log(max / min)) * 1000
                    : ((state[key] - min) / (max - min)) * 1000);
                const display = formatValue(state[key], unit);
                return (_jsxs("label", { className: "synth-knob", style: { "--angle": `${encoded * 0.27 - 135}deg` }, children: [_jsx("span", { children: label }), _jsxs("span", { className: "knob-dial", children: [_jsx("input", { type: "range", min: "0", max: "1000", step: "1", "aria-label": label, "aria-valuetext": display, value: encoded, onChange: (event) => {
                                        const value = Number(event.target.value);
                                        onChange(key, logarithmic
                                            ? min * (max / min) ** (value / 1000)
                                            : min + ((max - min) * value) / 1000);
                                    } }), _jsx("span", { className: "knob-pointer" })] }), _jsx("output", { children: display })] }, key));
            })] }));
}
