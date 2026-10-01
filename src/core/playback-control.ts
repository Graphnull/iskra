interface PlaybackOptions {
  prepare(): Promise<void>;
  start(): void;
  stop(): void;
  isRunning(): boolean;
}
export function bindPlayback(button: HTMLButtonElement, { prepare, start, stop, isRunning }: PlaybackOptions) {
  let generation = 0, starting = false;
  function cancelStart(): void {
    generation++;
    starting = false;
    button.disabled = false;
  }
  async function toggle(): Promise<void> {
    if (starting) return;
    if (isRunning()) { stop(); return; }
    const request = ++generation;
    starting = true;
    button.disabled = true;
    try {
      await prepare();
      if (request !== generation) return;
      start();
      button.textContent = '■ Стоп';
      button.setAttribute('aria-pressed', 'true');
    } catch {
      if (request !== generation) return;
      stop();
      button.textContent = 'Повторить';
    } finally {
      if (request === generation) { starting = false; button.disabled = false; }
    }
  }
  const listener = toggle;
  button.addEventListener('click', listener);
  return { cancelStart, dispose() { cancelStart(); button.removeEventListener('click', listener); } };
}
