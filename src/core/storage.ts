export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
interface StorageHost {
  readonly sessionStorage?: StorageBackend;
  readonly localStorage?: StorageBackend;
}
interface ReadOptions<T> {
  validate: (value: unknown) => value is T;
  raw?: boolean;
  host?: StorageHost;
}
interface WriteOptions { raw?: boolean; host?: StorageHost }
export function readStored<T, F>(key: string, fallback: F, options: ReadOptions<T>): T | F;
export function readStored(key: string, fallback: unknown, options?: WriteOptions): unknown;
export function readStored(key: string, fallback: unknown, { validate = () => true, raw = false, host = globalThis }: WriteOptions & { validate?: (value: unknown) => boolean } = {}): unknown {
  for (const name of ['sessionStorage', 'localStorage'] as const) {
    try {
      const stored = host[name]?.getItem(key);
      if (stored === null || stored === undefined) continue;
      const value: unknown = raw ? stored : JSON.parse(stored);
      if (validate(value)) return value;
    } catch { /* Try the next backend. */ }
  }
  return fallback;
}
export function writeStored(key: string, value: unknown, { raw = false, host = globalThis }: WriteOptions = {}): void {
  const encoded = raw && typeof value === 'string' ? value : JSON.stringify(value);
  if (encoded === undefined) throw new TypeError('State must be serializable');
  for (const name of ['sessionStorage', 'localStorage'] as const) {
    try { host[name]?.setItem(key, encoded); } catch { /* Persistence is optional. */ }
  }
}
