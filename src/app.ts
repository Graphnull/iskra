import { element } from './core/dom.js';
const parameters = new URLSearchParams(location.search);
const theme = parameters.get("_theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = theme;
element('meta[name="theme-color"]', HTMLMetaElement).content = theme === "light" ? "#f3f2ef" : "#191918";
const mode = parameters.get("mode");
const modules = {
  tenorion: "./instruments/tenorion/tenorion.js",
  drums: "./instruments/drums/drums.js",
  synth: "./instruments/synth/synth.js",
  recorder: "./instruments/recorder/recorder.js",
};
await import(mode !== null && Object.hasOwn(modules, mode) ? modules[mode as keyof typeof modules] : "./instruments/piano/piano.js");
