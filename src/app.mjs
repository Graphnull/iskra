const parameters = new URLSearchParams(location.search);
const theme = parameters.get("_theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = theme;
document.querySelector('meta[name="theme-color"]').content = theme === "light" ? "#f3f2ef" : "#191918";
const mode = parameters.get("mode");
const modules = {
  tenorion: "./instruments/tenorion/tenorion.mjs?v=274f22366041",
  drums: "./instruments/drums/drums.mjs?v=274f22366041",
  synth: "./instruments/synth/synth.mjs?v=274f22366041",
  recorder: "./instruments/recorder/recorder.mjs?v=274f22366041",
};
await import(Object.hasOwn(modules, mode) ? modules[mode] : "./instruments/piano/piano.mjs?v=274f22366041");
