export function readStored(key, fallback, { validate = () => true, raw = false, host = globalThis } = {}) {
    for (const name of ['sessionStorage', 'localStorage']) {
        try {
            const stored = host[name]?.getItem(key);
            if (stored === null || stored === undefined)
                continue;
            const value = raw ? stored : JSON.parse(stored);
            if (validate(value))
                return value;
        }
        catch { /* Try the next backend. */ }
    }
    return fallback;
}
export function writeStored(key, value, { raw = false, host = globalThis } = {}) {
    const encoded = raw && typeof value === 'string' ? value : JSON.stringify(value);
    if (encoded === undefined)
        throw new TypeError('State must be serializable');
    for (const name of ['sessionStorage', 'localStorage']) {
        try {
            host[name]?.setItem(key, encoded);
        }
        catch { /* Persistence is optional. */ }
    }
}
