const mode = new URLSearchParams(location.search).get("mode");
const modules = { tenorion: "./tenorion.mjs?v=6", drums: "./drums.mjs?v=6" };
await import(Object.hasOwn(modules, mode) ? modules[mode] : "./piano.mjs?v=6");
