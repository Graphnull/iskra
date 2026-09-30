const mode = new URLSearchParams(location.search).get("mode");
await import(mode === "tenorion" ? "./tenorion.mjs" : "./piano.mjs");
