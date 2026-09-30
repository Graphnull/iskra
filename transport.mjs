// Every device derives musical phase from Unix time and the selected BPM.
export const DEFAULT_TRANSPORT = { bpm: 110, revision: 0, sender: "" };
export const wallTime = () => Date.now();
export function beatAt(state, time) {
  return time * state.bpm / 15000;
}
export function boundaryAfter(state, time) {
  const step = Math.ceil(beatAt(state, time));
  return { step, time: step * 15000 / state.bpm };
}
export function changeTempo(state, bpm, sender) {
  return { bpm, revision: state.revision + 1, sender };
}
const valid = state => state && Number.isFinite(state.bpm) && state.bpm >= 40 && state.bpm <= 240
  && Number.isSafeInteger(state.revision) && state.revision >= 0 && typeof state.sender === "string";
export function createTransport(onChange, onAvailability) {
  const key = "piano-shared-transport-v1";
  const sender = crypto.randomUUID();
  let state = { ...DEFAULT_TRANSPORT }, channel;
  function read() {
    try { const stored = JSON.parse(localStorage.getItem(key)); return valid(stored) ? stored : null; } catch { return null; }
  }
  function accept(candidate) {
    if (!valid(candidate)) return;
    if (candidate.revision < state.revision || (candidate.revision === state.revision && candidate.sender <= state.sender)) return;
    state = { bpm: candidate.bpm, revision: candidate.revision, sender: candidate.sender };
    onChange(state);
  }
  accept(read());
  try {
    channel = new BroadcastChannel(key);
    channel.onmessage = event => {
      if (event.data?.type === "hello") channel.postMessage({ type: "state", state });
      else if (event.data?.type === "state") accept(event.data.state);
    };
    channel.postMessage({ type: "hello" });
    onAvailability(true);
  } catch { onAvailability(false); }
  window.addEventListener("storage", event => { if (event.key === key) accept(read()); });
  return {
    get state() { return state; },
    async setTempo(bpm) {
      const update = () => {
        accept(read());
        if (bpm === state.bpm) return;
        const next = changeTempo(state, bpm, sender);
        accept(next);
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* BroadcastChannel still works without persistence. */ }
        channel?.postMessage({ type: "state", state: next });
      };
      if (navigator.locks) {
        try { await navigator.locks.request(key, update); } catch { update(); }
      } else update();
    },
    refresh() { accept(read()); channel?.postMessage({ type: "hello" }); },
    close() { channel?.close(); },
  };
}
