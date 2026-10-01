// Cross-origin Window references expose parent, length and indexed child windows.
// No parent DOM access or messages are needed to identify a frame's position.
export function framePosition(view: Window): number[] | null {
  const path = [];
  try {
    let current = view;
    while (current.parent !== current) {
      const parent = current.parent;
      let index = -1;
      for (let i = 0; i < parent.length; i++) if (parent[i] === current) { index = i; break; }
      if (index < 0) return null;
      path.unshift(index);
      current = parent;
    }
    return path;
  } catch { return null; }
}
export function storageKeyFor(base: string, view: Window, referrer: string, fallback: string): string {
  const path = framePosition(view);
  if (path?.length === 0) return base; // Preserve existing standalone saves.
  if (!path) return `${base}:unidentified:${fallback}`;
  return `${base}:frame:${encodeURIComponent(referrer || 'unknown-parent')}:${path.join('.')}`;
}
const fallback = typeof crypto !== 'undefined' ? crypto.randomUUID() : 'unavailable';
export function widgetStorageKey(base: string): string {
  return storageKeyFor(base, window, document.referrer, fallback);
}
