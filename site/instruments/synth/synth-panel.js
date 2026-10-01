import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { FILTER_TYPES } from "./synth-sequence.js?v=c53522026b7d";
import { ADSREditor } from "../../ui/adsr.js?v=c53522026b7d";
const FILTER_KEYS = {
    attack: "filterAttack",
    decay: "filterDecay",
    sustain: "filterSustain",
    release: "filterRelease",
};
const DESCRIPTIONS = {
    lowpass: "Пропускает низкие, приглушает высокие",
    highpass: "Пропускает высокие, приглушает низкие",
    bandpass: "Пропускает полосу вокруг частоты",
    notch: "Приглушает полосу вокруг частоты",
};
export function SynthPanel({ state, held, onChange, hidden, onFilterType, onFilterControl, readFrequency, }) {
    const [filter, setFilter] = useState(false), [frequency, setFrequency] = useState(state.cutoff);
    const automatic = state.filterControl === "adsr";
    useEffect(() => {
        if (hidden || !filter || !automatic || !readFrequency)
            return;
        let frame = 0;
        const tick = () => {
            setFrequency(Math.round(readFrequency()));
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [hidden, filter, automatic, readFrequency]);
    const displayed = automatic ? frequency : state.cutoff;
    const encoded = Math.max(0, Math.min(1000, (Math.log(displayed / 20) / Math.log(1000)) * 1000));
    return (_jsxs("section", { className: `synth-panel${filter ? " is-filter" : ""}`, "aria-label": "\u041F\u0443\u043B\u044C\u0442 \u0441\u0438\u043D\u0442\u0435\u0437\u0430\u0442\u043E\u0440\u0430", hidden: hidden, children: [_jsxs("div", { className: "envelope-tabs", children: [_jsxs("div", { role: "group", "aria-label": "\u041E\u0433\u0438\u0431\u0430\u044E\u0449\u0430\u044F", children: [_jsx("button", { type: "button", "aria-pressed": !filter, onClick: () => setFilter(false), children: "\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C" }), _jsx("button", { type: "button", "aria-pressed": filter, onClick: () => setFilter(true), children: "\u0424\u0438\u043B\u044C\u0442\u0440" })] }), _jsx("span", { className: "held-notes", children: held.length ? held.join(" · ") : "Играй Z–/ или Q–]" })] }), filter && (_jsxs("div", { className: "filter-choice", children: [_jsx("select", { "aria-label": "\u0422\u0438\u043F \u0444\u0438\u043B\u044C\u0442\u0440\u0430", value: state.filterType, onChange: (e) => onFilterType?.(e.target.value), children: Object.entries(FILTER_TYPES).map(([value, label]) => (_jsx("option", { value: value, children: label }, value))) }), _jsxs("select", { "aria-label": "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u043E\u043C", value: state.filterControl, onChange: (e) => onFilterControl?.(e.target.value), children: [_jsx("option", { value: "manual", children: "\u041F\u043E\u043B\u0437\u0443\u043D\u043E\u043A" }), _jsx("option", { value: "adsr", children: "ADSR" })] })] })), _jsx(ADSREditor, { value: state, title: "\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C", hidden: filter, onChange: onChange }), _jsx(ADSREditor, { value: {
                    attack: state.filterAttack,
                    decay: state.filterDecay,
                    sustain: state.filterSustain,
                    release: state.filterRelease,
                }, title: "\u0424\u0438\u043B\u044C\u0442\u0440", hidden: !filter || !automatic, onChange: (stage, value) => onChange(FILTER_KEYS[stage], value) }), filter && (_jsxs(_Fragment, { children: [!automatic && (_jsx("p", { className: "filter-description", children: DESCRIPTIONS[state.filterType] })), _jsxs("label", { className: "filter-frequency", children: [automatic ? "Сейчас" : "Частота", _jsxs("output", { children: [Math.round(displayed), " \u0413\u0446"] }), _jsx("input", { type: "range", "aria-label": automatic ? "Текущая частота фильтра" : "Частота фильтра", "aria-valuetext": `${Math.round(displayed)} Гц`, min: "0", max: "1000", value: encoded, disabled: automatic, onChange: (e) => onChange("cutoff", Math.min(10000, 20 * 500 ** (Number(e.target.value) / 1000))) })] }), _jsxs("div", { className: "filter-parameters", children: [automatic && (_jsxs("label", { children: ["\u041D\u0430\u0447\u0430\u043B\u043E ", _jsxs("output", { children: [Math.round(state.cutoff), " \u0413\u0446"] }), _jsx("input", { type: "range", "aria-label": "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u0430\u044F \u0447\u0430\u0441\u0442\u043E\u0442\u0430 \u0444\u0438\u043B\u044C\u0442\u0440\u0430", min: "20", max: "10000", step: "10", value: state.cutoff, onChange: (e) => onChange("cutoff", Number(e.target.value)) })] })), _jsxs("label", { children: [state.filterType === "bandpass" || state.filterType === "notch"
                                        ? "Ширина / Q"
                                        : "Резонанс", _jsx("output", { children: state.resonance.toFixed(1) }), _jsx("input", { type: "range", "aria-label": "\u0420\u0435\u0437\u043E\u043D\u0430\u043D\u0441 \u0444\u0438\u043B\u044C\u0442\u0440\u0430", min: "0.1", max: "12", step: "0.1", value: state.resonance, onChange: (e) => onChange("resonance", Number(e.target.value)) })] }), automatic && (_jsxs("label", { children: ["\u0413\u043B\u0443\u0431\u0438\u043D\u0430 ", _jsxs("output", { children: [Math.round(state.filterAmount * 100), "%"] }), _jsx("input", { type: "range", "aria-label": "\u0413\u043B\u0443\u0431\u0438\u043D\u0430 \u0444\u0438\u043B\u044C\u0442\u0440\u0430", min: "0", max: "1", step: "0.01", value: state.filterAmount, onChange: (e) => onChange("filterAmount", Number(e.target.value)) })] }))] }), automatic && (_jsxs("p", { className: "filter-caption", children: [DESCRIPTIONS[state.filterType], " \u00B7 \u0434\u043B\u044F \u044F\u0440\u043A\u043E\u0433\u043E \u0437\u0432\u0443\u043A\u0430 \u0432\u044B\u0431\u0435\u0440\u0438 \u00AB\u041F\u0438\u043B\u0430\u00BB"] }))] }))] }));
}
