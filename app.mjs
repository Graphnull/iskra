const parameters = new URLSearchParams(location.search);
const theme = parameters.get("_theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = theme;
document.querySelector('meta[name="theme-color"]').content = theme === "light" ? "#edf1f6" : "#171d29";
const mode = parameters.get("mode");
const modules = { tenorion: "./tenorion.mjs?v=8", drums: "./drums.mjs?v=8" };
await import(Object.hasOwn(modules, mode) ? modules[mode] : "./piano.mjs?v=6");
