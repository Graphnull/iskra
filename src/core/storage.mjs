// Session state wins for an existing tab; valid local state is the fallback.
// Storage can be absent or blocked in an iframe. Never accept damaged data just
// because it came from the first storage backend.
export function readStored(key, fallback, { validate = () => true, raw = false, host = globalThis } = {}) {
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      const stored = host[name].getItem(key);
      if (stored === null) continue;
      const value = raw ? stored : JSON.parse(stored);
      if (value !== null && validate(value)) return value;
    } catch { /* Continue with the next backend, or the supplied default. */ }
  }
  return fallback;
}
export function writeStored(key, value, { raw = false, host = globalThis } = {}) {
  const encoded = raw ? value : JSON.stringify(value);
  for (const name of ['sessionStorage', 'localStorage']) {
    try { host[name].setItem(key, encoded); } catch { /* Persistence is optional. */ }
  }
}
