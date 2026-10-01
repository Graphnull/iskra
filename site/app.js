import { element } from './core/dom.js?v=2ce4b858cdb4';
const parameters = new URLSearchParams(location.search);
const theme = parameters.get("_theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = theme;
element('meta[name="theme-color"]', HTMLMetaElement).content = theme === "light" ? "#f3f2ef" : "#191918";
const mode = parameters.get("mode");
const modules = {
    tenorion: "./instruments/tenorion/tenorion.js?v=2ce4b858cdb4",
    drums: "./instruments/drums/drums.js?v=2ce4b858cdb4",
    synth: "./instruments/synth/synth.js?v=2ce4b858cdb4",
    recorder: "./instruments/recorder/recorder.js?v=2ce4b858cdb4",
};
await import(mode !== null && Object.hasOwn(modules, mode) ? modules[mode] : "./instruments/piano/piano.js?v=2ce4b858cdb4");
