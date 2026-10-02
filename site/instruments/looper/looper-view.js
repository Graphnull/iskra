import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createLooper } from "./looper.js?v=b9986c18e090";
import { useController } from "../../ui/hooks.js?v=b9986c18e090";
import { Header, PlaybackControls } from "../../ui/controls.js?v=b9986c18e090";
function waveform(buffer, gain) {
    if (!buffer)
        return "";
    const data = buffer.getChannelData(0), count = 96, stride = Math.max(1, Math.floor(data.length / count));
    return Array.from({ length: count }, (_, i) => {
        let peak = 0;
        for (let j = i * stride; j < Math.min(data.length, (i + 1) * stride); j += Math.max(1, Math.floor(stride / 64)))
            peak = Math.max(peak, Math.abs(data[j] ?? 0));
        const amplitude = Math.min(1, peak * gain) * 18;
        return `M ${i} ${20 - amplitude} L ${i} ${20 + amplitude}`;
    }).join(" ");
}
export function Looper() {
    const model = useController(createLooper), position = model.position;
    return (_jsxs("main", { className: "tenorion looper", "aria-labelledby": "title", children: [_jsx(Header, { title: model.recorderOnly ? "Записать слой" : "Лупер" }), _jsx(PlaybackControls, { engine: model.engine, onClear: model.clear, clearLabel: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u0441\u043B\u043E\u0438", disabled: model.recording || model.busy }), _jsxs("div", { className: "loop-record-tools", children: [_jsxs("button", { className: `loop-record${model.recording ? " is-recording" : ""}`, type: "button", disabled: model.busy || (!model.recording && model.layers.length >= 8), onClick: () => void model.record(), children: [_jsx("span", { className: `loop-record-mark${model.recording ? " is-recording" : ""}`, "aria-hidden": "true" }), model.recording
                                ? "Завершить слой"
                                : model.busy
                                    ? "Подожди…"
                                    : "Записать слой"] }), !model.recorderOnly && (_jsx("button", { className: "loop-popup", "aria-label": "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0432 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u043C \u043E\u043A\u043D\u0435", title: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0432 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u043C \u043E\u043A\u043D\u0435", type: "button", disabled: model.busy || model.recording || model.layers.length >= 8, onClick: model.openRecorder, children: _jsx("span", { "aria-hidden": "true", children: "\u2197" }) }))] }), _jsxs("div", { className: "loop-workspace", children: [_jsxs("div", { className: "loop-timeline", "aria-label": `Секция ${position.section + 1}, шаг ${position.column + 1}`, children: [[0, 1, 2, 3].map((section) => (_jsx("span", { className: position.section === section ? "is-current" : "", children: section + 1 }, section))), _jsx("div", { className: "loop-cursor", style: { left: `${model.progress * 100}%` } })] }), _jsxs("div", { className: "loop-layers", children: [model.layers.length === 0 && (_jsxs("div", { className: "loop-empty", children: [_jsx("div", { className: "loop-empty-wave", "aria-hidden": "true", children: Array.from({ length: 23 }, (_, i) => (_jsx("i", { style: { height: `${8 + Math.sin(i * 1.7) ** 2 * 26}px` } }, i))) }), _jsx("strong", { children: model.recorderOnly ? "Новый слой" : "Начни с первого слоя" }), _jsx("p", { children: model.recorderOnly
                                            ? "Запись вернётся в исходный лупер. После сохранения это окно закроется."
                                            : "Нажми «Записать слой». Затем добавь следующий поверх него." })] })), model.layers.map((layer, index) => (_jsxs("section", { className: `loop-layer${layer.muted ? " is-muted" : ""}`, "aria-label": `Слой ${index + 1}`, children: [_jsxs("div", { className: "loop-layer-heading", children: [_jsxs("strong", { children: ["\u0421\u043B\u043E\u0439 ", index + 1] }), _jsx("button", { type: "button", "aria-pressed": !layer.muted, onClick: () => model.toggleLayer(layer.id), children: layer.muted ? "Без звука" : "Со звуком" }), _jsx("button", { type: "button", "aria-label": `Удалить слой ${index + 1}`, onClick: () => model.remove(layer.id), children: "\u00D7" })] }), _jsxs("svg", { viewBox: "0 0 96 40", preserveAspectRatio: "none", "aria-label": `Звук слоя ${index + 1}`, role: "img", children: [_jsx("path", { d: waveform(layer.buffer, layer.gain) }), _jsx("line", { x1: model.progress * 96, x2: model.progress * 96, y1: "0", y2: "40" })] }), _jsxs("label", { children: ["\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C", " ", _jsx("input", { "aria-label": `Громкость слоя ${index + 1}`, type: "range", min: "0", max: "2", step: "0.01", value: layer.gain, onChange: (event) => model.setGain(layer.id, Number(event.target.value)) }), _jsxs("span", { children: [Math.round(layer.gain * 100), "%"] })] })] }, layer.id)))] })] }), (model.status || model.recording) && (_jsx("p", { className: "loop-status", role: "status", children: model.status || "Записываю с текущей позиции · максимум один цикл" }))] }));
}
