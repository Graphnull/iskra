import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useController } from "./hooks.js?v=f1d1aaff72ac";
import { PlaybackControls, NumberControl, SectionSelector, } from "./controls.js?v=f1d1aaff72ac";
import { NoteGrid } from "./grid.js?v=f1d1aaff72ac";
import { createMelodicPlayer } from "../core/melodic-player.js?v=f1d1aaff72ac";
import { noteAt } from "../core/melodic-sequence.js?v=f1d1aaff72ac";
import { at } from "../core/guards.js?v=f1d1aaff72ac";
import { noteLabel } from "../core/scales.js?v=f1d1aaff72ac";
export function MelodicPanel({ instrument, hidden, activeLabels = [], }) {
    const model = useController(() => createMelodicPlayer(instrument));
    return (_jsxs("div", { className: "melodic-panel", hidden: hidden, children: [_jsx(PlaybackControls, { engine: model.engine, onClear: model.clear }), _jsx("div", { className: "melodic-tools", children: _jsxs("label", { children: ["\u041E\u043A\u0442\u0430\u0432\u0430", " ", _jsx(NumberControl, { label: "\u0421\u0434\u0432\u0438\u0433 \u043E\u043A\u0442\u0430\u0432\u044B", min: -2, max: 2, value: model.state.octave, onChange: model.setOctave })] }) }), _jsx(SectionSelector, { selected: model.state.selected, playing: model.playing, onSelect: model.select }), _jsx(NoteGrid, { kind: "synth", ariaLabel: instrument === "piano" ? "Ноты пианино" : "Ноты гитары", activeLabels: activeLabels, hidden: hidden, labels: Array.from({ length: 16 }, (_, row) => noteLabel(model.pitch(row))), selected: model.state.selected, playing: model.playing, onEdit: model.edit, note: (row, column) => {
                    const note = noteAt(at(model.state.sections, model.state.selected), row, column);
                    return {
                        enabled: !!note,
                        start: note?.start === column,
                        end: !!note && note.start + note.length - 1 === column,
                        ...(note ? { length: note.length } : {}),
                    };
                } })] }));
}
