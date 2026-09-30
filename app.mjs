const parameters = new URLSearchParams(location.search);
const theme = parameters.get("_theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = theme;
document.querySelector('meta[name="theme-color"]').content = theme === "light" ? "#f3f2ef" : "#191918";
const mode = parameters.get("mode");
const modules = { tenorion: "./tenorion.mjs?v=10", drums: "./drums.mjs?v=12", synth: "./synth.mjs?v=11", recorder: "./recorder.mjs?v=12" };
await import(Object.hasOwn(modules, mode) ? modules[mode] : "./piano.mjs?v=6");
