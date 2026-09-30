import { buildKeyMap, ROWS } from "./keyboard-map.mjs?v=6";
import { bindKeyInput } from "./live-keyboard.mjs?v=6";
export { buildKeyMap };

export function releaseVoice(voice, now) {
  voice.release.gain.setValueAtTime(1, now);
  voice.release.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
  for (const oscillator of voice.oscillators) oscillator.stop(now + 0.77);
}

const keys = buildKeyMap();
if (typeof document !== "undefined") {
  const byCode = new Map(keys.map(key => [key.code, key]));
  const buttons = new Map();
  const voices = new Map();
  const focusControl = document.getElementById("focus-control");
  const focusLabel = document.getElementById("focus-label");
  let audioContext;

  function syncFocusStatus() {
    const focused = document.hasFocus() && !document.hidden;
    focusControl.classList.toggle("is-focused", focused);
    focusLabel.textContent = focused ? "Клавиатура активна" : "Нажми, чтобы включить клавиатуру";
    focusControl.setAttribute("aria-label", focused ? "Клавиатура активна" : "Нажмите, чтобы активировать клавиатуру");
  }

  function renderKeys() {
    for (const row of ROWS) {
      const container = document.getElementById(row.id);
      container.style.setProperty("--white-count", row.white.length);
      for (const key of keys.filter(item => item.row === row.id)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `key ${key.black ? "black" : "white"}`;
        button.setAttribute("aria-label", `${key.note}${key.octave}, клавиша ${key.label}`);
        button.dataset.code = key.code;
        if (key.black) {
          button.style.setProperty("--position", key.position);
          button.textContent = key.label;
        } else {
          button.innerHTML = `<span class="letter">${key.label}</span><span class="note">${key.note}</span>`;
        }
        container.append(button);
        buttons.set(key.code, button);
      }
    }
  }

  function startVoice(key, source) {
    if (voices.has(source)) return;
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const fundamental = audioContext.createOscillator();
    const overtone = audioContext.createOscillator();
    const overtoneLevel = audioContext.createGain();
    const tone = audioContext.createGain();
    const release = audioContext.createGain();
    fundamental.type = "triangle";
    fundamental.frequency.value = key.frequency;
    overtone.type = "sine";
    overtone.frequency.value = key.frequency * 2;
    overtoneLevel.gain.value = 0.16;
    const now = audioContext.currentTime;
    tone.gain.setValueAtTime(0.0001, now);
    tone.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    tone.gain.exponentialRampToValueAtTime(0.07, now + 0.35);
    tone.gain.exponentialRampToValueAtTime(0.035, now + 2);
    release.gain.value = 1;
    fundamental.connect(tone);
    overtone.connect(overtoneLevel).connect(tone);
    tone.connect(release).connect(audioContext.destination);
    fundamental.start();
    overtone.start();
    voices.set(source, { oscillators: [fundamental, overtone], release, code: key.code });
    buttons.get(key.code)?.classList.add("is-active");
  }

  function stopVoice(source) {
    const voice = voices.get(source);
    if (!voice) return;
    voices.delete(source);
    releaseVoice(voice, audioContext.currentTime);
    if (![...voices.values()].some(item => item.code === voice.code)) buttons.get(voice.code)?.classList.remove("is-active");
  }

  function stopAll() {
    for (const source of voices.keys()) stopVoice(source);
    for (const button of buttons.values()) button.classList.remove("is-active");
  }

  renderKeys();
  syncFocusStatus();
  focusControl.addEventListener("click", () => {
    window.focus();
    focusControl.focus();
    syncFocusStatus();
  });
  document.addEventListener("focusin", syncFocusStatus);
  window.addEventListener("focus", syncFocusStatus);
  bindKeyInput({
    onNoteOn(key, source) { startVoice(key, source); return source; },
    onNoteOff(source) { stopVoice(source); },
  });
  window.addEventListener("blur", () => { stopAll(); syncFocusStatus(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAll();
    syncFocusStatus();
  });
  for (const [code, button] of buttons) {
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      window.focus();
      syncFocusStatus();
      button.setPointerCapture(event.pointerId);
      startVoice(byCode.get(code), `pointer:${event.pointerId}`);
    });
    button.addEventListener("pointerup", event => stopVoice(`pointer:${event.pointerId}`));
    button.addEventListener("pointercancel", event => stopVoice(`pointer:${event.pointerId}`));
    button.addEventListener("lostpointercapture", event => stopVoice(`pointer:${event.pointerId}`));
    button.addEventListener("keydown", event => {
      if ((event.code !== "Enter" && event.code !== "Space") || event.repeat) return;
      event.preventDefault();
      startVoice(byCode.get(code), `button:${code}`);
    });
    button.addEventListener("keyup", event => {
      if (event.code === "Enter" || event.code === "Space") stopVoice(`button:${code}`);
    });
  }
}
