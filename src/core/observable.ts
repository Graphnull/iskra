// Stable numeric snapshots notify the view without scheduling audio in React.
export function createObservable() {
  let revision = 0;
  const listeners = new Set<() => void>();
  return {
    snapshot: () => revision,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      revision++;
      for (const listener of listeners) listener();
    },
  };
}
