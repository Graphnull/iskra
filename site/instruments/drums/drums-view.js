import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SampleEditor } from "../../ui/sample-editor.js?v=a3d1f500d2df";
import { useState } from "react";
import { createDrums, TRACKS } from "./drums.js?v=a3d1f500d2df";
import { DRUM_BINDINGS } from "./drum-notes.js?v=a3d1f500d2df";
import { SAMPLE_BINDINGS } from "./drum-samples.js?v=a3d1f500d2df";
import { at } from "../../core/guards.js?v=a3d1f500d2df";
import { useController } from "../../ui/hooks.js?v=a3d1f500d2df";
import { Header, PlaybackControls, SectionSelector, } from "../../ui/controls.js?v=a3d1f500d2df";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js?v=a3d1f500d2df";
import { NoteGrid } from "../../ui/grid.js?v=a3d1f500d2df";
export function Drums() {
    const model = useController(createDrums), keyboard = useKeyboard(model);
    const [keys, setKeys] = useState(false), busy = model.recordState !== "idle", editingSlot = model.editingSlot, editedSample = editingSlot === null ? null : model.samples[editingSlot];
    return (_jsxs("main", { className: "tenorion drum-machine", "aria-labelledby": "title", children: [_jsx(Header, { title: "\u0414\u0440\u0430\u043C-\u043C\u0430\u0448\u0438\u043D\u0430", eyebrow: "\u0421\u041E\u0411\u0415\u0420\u0418 \u0421\u0412\u041E\u0419 \u0413\u0420\u0423\u0412", view: keys ? "keys" : "grid", onToggle: () => {
                    keyboard.releaseAll();
                    model.openSample(null);
                    setKeys(!keys);
                } }), _jsx(PlaybackControls, { engine: model.engine, onClear: model.clear, disabled: busy, drums: true }), _jsx(SectionSelector, { selected: model.sequence.state.selected, playing: model.playing, onSelect: model.select }), _jsx("button", { className: "drum-record-window", type: "button", hidden: !model.recordWindow, onClick: model.openRecordWindow, children: "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0432 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u043C \u043E\u043A\u043D\u0435 \u2197" }), _jsx("section", { className: "live-keys", "aria-label": "\u0418\u0433\u0440\u0430 \u0441 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B, \u043C\u044B\u0448\u044C\u044E \u0438\u043B\u0438 \u043A\u0430\u0441\u0430\u043D\u0438\u0435\u043C", hidden: !keys || model.editingSlot !== null, children: _jsx(Keyboard, { binding: keyboard, labelFor: model.labelFor }) }), editingSlot !== null && editedSample && (_jsx(SampleEditor, { buffer: editedSample, settings: at(model.sampleSettings, editingSlot), slot: editingSlot, busy: busy, onChange: (patch) => model.setSampleSettings(editingSlot, patch), onPreview: () => void model.preview(editingSlot), onClose: () => model.openSample(null) })), _jsx(NoteGrid, { kind: "drum", labels: TRACKS, selected: model.sequence.state.selected, playing: model.playing, hidden: keys || model.editingSlot !== null, onEdit: model.edit, note: (row, column) => ({
                    enabled: !!at(model.sequence.pattern, row)[column],
                }), rowContent: (row) => {
                    if (row < 8) {
                        const binding = at(DRUM_BINDINGS, row);
                        return (_jsxs("span", { className: "drum-track-name", "aria-hidden": "true", children: [at(TRACKS, row), _jsxs("small", { children: [binding.note, " \u00B7 ", binding.key] })] }));
                    }
                    const slot = row - 8, binding = at(SAMPLE_BINDINGS, slot), sample = model.samples[slot], recording = model.recordState === "recording" && model.requestedSlot === slot;
                    return (_jsxs("span", { className: "drum-track-name sample-track", children: [_jsxs("div", { children: [_jsxs("button", { type: "button", className: `sample-preview${sample ? " has-sample" : ""}`, disabled: busy, "aria-label": `Открыть запись семпла ${slot + 1}`, title: sample
                                            ? `Записать ${at(TRACKS, row)} в отдельном окне`
                                            : "Запиши свой звук", onClick: () => model.record(slot), children: ["\u0421\u0435\u043C\u043F\u043B ", slot + 1] }), _jsx("button", { type: "button", className: `sample-record${recording ? " is-recording" : ""}`, disabled: busy && !recording, "aria-label": `${recording ? "Остановить запись" : "Записать"} семпл ${slot + 1}`, onClick: () => model.record(slot), children: recording ? "■" : "●" })] }), _jsxs("small", { children: [binding.key, " \u00B7", " ", sample ? `${sample.duration.toFixed(1)} с` : "пусто"] })] }));
                } }), model.status && (_jsx("p", { id: "record-status", className: "sequencer-hint", role: "status", children: model.status })), _jsx("p", { className: "sequencer-hint drum-hint", hidden: !!model.status, children: editingSlot !== null
                    ? "Нажми на волну — сдвинь начало · Q/W/E/R — семплы"
                    : "4 секции × 16 шагов · красная точка — играет" })] }));
}
