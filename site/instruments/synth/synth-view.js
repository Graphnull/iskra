import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { createSynth } from "./synth.js?v=c53522026b7d";
import { SynthPanel } from "./synth-panel.js?v=c53522026b7d";
import { SYNTH_ROWS, noteAt } from "./synth-sequence.js?v=c53522026b7d";
import { noteLabel } from "../../core/scales.js?v=c53522026b7d";
import { at } from "../../core/guards.js?v=c53522026b7d";
import { buildKeyMap } from "../../core/keyboard-map.js?v=c53522026b7d";
import { useController } from "../../ui/hooks.js?v=c53522026b7d";
import { useKeyboard } from "../../ui/keyboard.js?v=c53522026b7d";
import { Header, PlaybackControls, NumberControl, SectionSelector, } from "../../ui/controls.js?v=c53522026b7d";
import { NoteGrid } from "../../ui/grid.js?v=c53522026b7d";
const KEYS = buildKeyMap();
export function Synth() {
    const model = useController(createSynth), keyboard = useKeyboard(model), state = model.state;
    const [panel, setPanel] = useState(false);
    return (_jsxs("main", { className: "tenorion synth", "aria-labelledby": "title", children: [_jsx(Header, { title: "\u0421\u0438\u043D\u0442\u0435\u0437\u0430\u0442\u043E\u0440", alternateLabel: "\u041F\u0443\u043B\u044C\u0442", view: panel ? "panel" : "grid", onToggle: () => setPanel(!panel) }), _jsx(PlaybackControls, { engine: model.engine, onClear: model.clear, children: _jsxs("select", { "aria-label": "\u0417\u0432\u0443\u043A", value: state.sound, onChange: (event) => model.setSound(event.target.value), children: [_jsx("option", { value: "pad", children: "\u041C\u044F\u0433\u043A\u0438\u0439 \u0441\u0438\u043D\u0442" }), _jsx("option", { value: "bass", children: "808 \u0431\u0430\u0441" }), _jsx("option", { value: "lead", children: "\u041B\u0438\u0434" })] }) }), _jsxs("div", { className: "synth-tools", children: [_jsxs("label", { children: ["\u0414\u043B\u0438\u043D\u0430", " ", _jsx("select", { "aria-label": "\u0414\u043B\u0438\u043D\u0430 \u043D\u043E\u0442\u044B \u0432 \u0448\u0430\u0433\u0430\u0445", value: state.length, onChange: (event) => model.setLength(Number(event.target.value)), children: [1, 2, 4, 8, 16].map((value) => (_jsx("option", { value: value, children: value }, value))) })] }), _jsxs("label", { className: "wave-control", children: ["\u0412\u043E\u043B\u043D\u0430", " ", _jsxs("select", { "aria-label": "\u0424\u043E\u0440\u043C\u0430 \u0432\u043E\u043B\u043D\u044B", value: state.waveform, onChange: (event) => model.setWaveform(event.target.value), children: [_jsx("option", { value: "sine", children: "\u0421\u0438\u043D\u0443\u0441" }), _jsx("option", { value: "triangle", children: "\u0422\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A" }), _jsx("option", { value: "sawtooth", children: "\u041F\u0438\u043B\u0430" }), _jsx("option", { value: "square", children: "\u041F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A" })] })] }), _jsxs("label", { children: ["\u041E\u043A\u0442\u0430\u0432\u0430", " ", _jsx(NumberControl, { label: "\u0421\u0434\u0432\u0438\u0433 \u043E\u043A\u0442\u0430\u0432\u044B", value: state.octave, min: -2, max: 2, onChange: model.setOctave })] })] }), _jsx(SectionSelector, { selected: state.selected, playing: model.playing, onSelect: model.select }), _jsx(SynthPanel, { state: state, held: KEYS.filter((key) => keyboard.active.has(key.code)).map(model.labelFor), onChange: model.setParameter, onFilterType: model.setFilterType, onFilterControl: model.setFilterControl, readFrequency: model.filterFrequency, hidden: !panel }), _jsx(NoteGrid, { kind: "synth", selected: state.selected, playing: model.playing, hidden: panel, labels: Array.from({ length: SYNTH_ROWS }, (_, row) => noteLabel(model.pitch(row))), onEdit: model.edit, note: (row, column) => {
                    const note = noteAt(at(state.sections, state.selected), row, column);
                    return {
                        enabled: !!note,
                        start: note?.start === column,
                        end: !!note && note.start + note.length - 1 === column,
                        ...(note ? { length: note.length } : {}),
                    };
                } }), _jsx("p", { className: "sequencer-hint", children: "\u041D\u0430\u0436\u043C\u0438 \u2014 \u043D\u043E\u0442\u0430 \u00B7 \u043F\u0440\u043E\u0442\u044F\u043D\u0438 \u2014 \u0434\u043B\u0438\u043D\u0430 \u00B7 \u041F\u0443\u043B\u044C\u0442 \u2014 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0437\u0432\u0443\u043A\u0430" })] }));
}
