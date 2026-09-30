const mode = new URLSearchParams(location.search).get("mode");
const modules = { tenorion: "./tenorion.mjs?v=4", drums: "./drums.mjs?v=3" };
await import(Object.hasOwn(modules, mode) ? modules[mode] : "./piano.mjs");
