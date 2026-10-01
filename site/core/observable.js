// Stable numeric snapshots notify the view without scheduling audio in React.
export function createObservable() {
    let revision = 0;
    const listeners = new Set();
    return {
        snapshot: () => revision,
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        notify() {
            revision++;
            for (const listener of listeners)
                listener();
        },
    };
}
