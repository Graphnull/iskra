import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { createTenorion, rowMidi, SIZE } from "./tenorion.js?v=a5f3c549b024";
import { SCALES, isScaleId, noteLabel } from "../../core/scales.js?v=a5f3c549b024";
import { at } from "../../core/guards.js?v=a5f3c549b024";
import { useController } from "../../ui/hooks.js?v=a5f3c549b024";
import { Header, PlaybackControls, NumberControl, SectionSelector, } from "../../ui/controls.js?v=a5f3c549b024";
import { Keyboard, useKeyboard } from "../../ui/keyboard.js?v=a5f3c549b024";
import { NoteGrid } from "../../ui/grid.js?v=a5f3c549b024";
export function Tenorion() {
    const model = useController(createTenorion), keyboard = useKeyboard(model);
    const [keys, setKeys] = useState(false);
    return (_jsxs("main", { className: "tenorion", "aria-labelledby": "title", children: [_jsx(Header, { title: "Tenori-on", view: keys ? "keys" : "grid", onToggle: () => {
                    keyboard.releaseAll();
                    setKeys(!keys);
                } }), _jsx(PlaybackControls, { engine: model.engine, onClear: model.clear, children: _jsxs("select", { "aria-label": "\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442", value: model.instrument, onChange: (event) => model.setInstrument(event.target.value), children: [_jsx("option", { value: "bell", children: "\u041A\u043E\u043B\u043E\u043A\u043E\u043B\u044C\u0447\u0438\u043A" }), _jsx("option", { value: "keys", children: "\u042D\u043B\u0435\u043A\u0442\u0440\u043E\u043F\u0438\u0430\u043D\u043E" }), _jsx("option", { value: "pluck", children: "\u0429\u0438\u043F\u043A\u043E\u0432\u044B\u0439" }), _jsx("option", { value: "pad", children: "\u0421\u0438\u043D\u0442\u0435\u0437\u0430\u0442\u043E\u0440" })] }) }), _jsxs("div", { className: "harmony-controls", children: [_jsx("select", { "aria-label": "\u0413\u0430\u043C\u043C\u0430", value: model.harmony.scale, onChange: (event) => {
                            if (isScaleId(event.target.value))
                                model.setHarmony({ ...model.harmony, scale: event.target.value });
                        }, children: Object.entries(SCALES).map(([id, scale]) => (_jsx("option", { value: id, children: scale.name }, id))) }), _jsxs("label", { children: ["\u0421\u0434\u0432\u0438\u0433", " ", _jsx(NumberControl, { label: "\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0432 \u043F\u043E\u043B\u0443\u0442\u043E\u043D\u0430\u0445", value: model.harmony.transpose, min: -12, max: 12, onChange: (value) => model.setHarmony({
                                    ...model.harmony,
                                    transpose: Math.round(value),
                                }) })] }), _jsxs("label", { children: ["\u041E\u043A\u0442\u0430\u0432\u0430", " ", _jsx(NumberControl, { label: "\u0421\u0434\u0432\u0438\u0433 \u043E\u043A\u0442\u0430\u0432\u044B", value: model.harmony.octave, min: -2, max: 2, onChange: (value) => model.setHarmony({ ...model.harmony, octave: Math.round(value) }) })] })] }), _jsx(SectionSelector, { selected: model.sequence.state.selected, playing: model.playing, onSelect: model.select }), _jsx("section", { className: "live-keys", "aria-label": "\u0418\u0433\u0440\u0430 \u0441 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B, \u043C\u044B\u0448\u044C\u044E \u0438\u043B\u0438 \u043A\u0430\u0441\u0430\u043D\u0438\u0435\u043C", hidden: !keys, children: _jsx(Keyboard, { binding: keyboard, labelFor: model.labelFor }) }), _jsx(NoteGrid, { kind: "light", labels: Array.from({ length: SIZE }, (_, row) => noteLabel(rowMidi(row, model.harmony))), selected: model.sequence.state.selected, playing: model.playing, hidden: keys, note: (row, column) => ({
                    enabled: !!at(model.sequence.pattern, row)[column],
                }), onEdit: model.edit })] }));
}
