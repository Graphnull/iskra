import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { sampleStartLimit, sampleWaveform } from "../core/sample-edit.js?v=c53522026b7d";
export function SampleEditor({ buffer, settings, slot, busy, onChange, onPreview, onClose, closeLabel = "Готово", }) {
    const peaks = useMemo(() => sampleWaveform(buffer), [buffer]);
    const pointer = useRef(null);
    const peak = Math.max(0.0001, ...peaks), x = (settings.start / buffer.duration) * 320;
    const bars = peaks
        .map((value, index) => {
        const height = (value / peak) * 29, at = ((index + 0.5) * 320) / peaks.length;
        return `M${at} ${34 - height}V${34 + height}`;
    })
        .join(" ");
    function move(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width)
            onChange({
                start: Math.max(0, Math.min(sampleStartLimit(buffer.duration), ((event.clientX - rect.left) / rect.width) * buffer.duration)),
            });
    }
    return (_jsxs("section", { className: "sample-editor", "aria-label": `Редактор семпла ${slot + 1}`, children: [_jsxs("header", { children: [_jsxs("strong", { children: ["\u0421\u0435\u043C\u043F\u043B ", slot + 1] }), _jsx("button", { type: "button", onClick: onClose, children: closeLabel })] }), _jsxs("svg", { viewBox: "0 0 320 68", preserveAspectRatio: "none", role: "img", "aria-label": "\u0412\u043E\u043B\u043D\u0430 \u0437\u0430\u043F\u0438\u0441\u0438. \u041A\u0440\u0430\u0441\u043D\u0430\u044F \u043B\u0438\u043D\u0438\u044F \u2014 \u043D\u0430\u0447\u0430\u043B\u043E \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F", className: "sample-wave", onPointerDown: (event) => {
                    if (event.button !== 0)
                        return;
                    event.preventDefault();
                    pointer.current = event.pointerId;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    move(event);
                }, onPointerMove: (event) => {
                    if (pointer.current === event.pointerId)
                        move(event);
                }, onPointerUp: () => {
                    pointer.current = null;
                }, onPointerCancel: () => {
                    pointer.current = null;
                }, onLostPointerCapture: () => {
                    pointer.current = null;
                }, children: [_jsx("path", { d: bars, className: "sample-wave-bars" }), _jsx("rect", { x: "0", y: "0", width: x, height: "68", className: "sample-wave-skipped" }), _jsx("path", { d: `M${x} 0V68`, className: "sample-wave-start" })] }), _jsxs("label", { children: ["\u041D\u0430\u0447\u0430\u043B\u043E", " ", _jsxs("output", { children: [settings.start.toFixed(3), " \u0441 \u00B7 \u0438\u0437 ", buffer.duration.toFixed(2), " \u0441"] }), _jsx("input", { type: "range", "aria-label": "\u041D\u0430\u0447\u0430\u043B\u043E \u0441\u0435\u043C\u043F\u043B\u0430", "aria-valuetext": `${Math.round(settings.start * 1000)} мс`, min: "0", max: sampleStartLimit(buffer.duration), step: "0.001", value: settings.start, onChange: (event) => onChange({ start: Number(event.target.value) }) })] }), _jsxs("label", { children: ["\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C ", _jsxs("output", { children: [Math.round(settings.gain * 100), "%"] }), _jsx("input", { type: "range", "aria-label": "\u0413\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C \u0441\u0435\u043C\u043F\u043B\u0430", "aria-valuetext": `${Math.round(settings.gain * 100)}%`, min: "0", max: "4", step: "0.01", value: settings.gain, onChange: (event) => onChange({ gain: Number(event.target.value) }) })] }), _jsx("button", { className: "sample-listen", type: "button", disabled: busy, onClick: onPreview, children: "\u25B6 \u041F\u0440\u043E\u0441\u043B\u0443\u0448\u0430\u0442\u044C" })] }));
}
