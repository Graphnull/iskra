const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_NOTES = { 0: "C♯", 1: "D♯", 3: "F♯", 4: "G♯", 5: "A♯" };
const ROWS = [
  { id: "upper-keyboard", octave: 5, white: "QWERTYUIOP[]", black: "2356790=", blackAfter: [0, 1, 3, 4, 5, 7, 8, 10] },
  { id: "lower-keyboard", octave: 4, white: "ZXCVBNM,./", black: "SDGHJL;", blackAfter: [0, 1, 3, 4, 5, 7, 8] },
];
const SEMITONES = { C: 0, "C♯": 1, D: 2, "D♯": 3, E: 4, F: 5, "F♯": 6, G: 7, "G♯": 8, A: 9, "A♯": 10, B: 11 };
const SPECIAL_CODE = { "2": "Digit2", "3": "Digit3", "5": "Digit5", "6": "Digit6", "7": "Digit7", "9": "Digit9", "0": "Digit0", "=": "Equal", "[": "BracketLeft", "]": "BracketRight", ",": "Comma", ".": "Period", "/": "Slash", ";": "Semicolon" };
const codeFor = label => SPECIAL_CODE[label] ?? `Key${label}`;

export function buildKeyMap() {
  const keys = [];
  for (const row of ROWS) {
    for (let i = 0; i < row.white.length; i++) {
      keys.push({ row: row.id, code: codeFor(row.white[i]), label: row.white[i], note: WHITE_NOTES[i % 7], octave: row.octave + Math.floor(i / 7), black: false, position: i });
    }
    for (let i = 0; i < row.black.length; i++) {
      const after = row.blackAfter[i];
      keys.push({ row: row.id, code: codeFor(row.black[i]), label: row.black[i], note: BLACK_NOTES[after % 7], octave: row.octave + Math.floor(after / 7), black: true, position: after + 1 });
    }
  }
  return keys.map(key => ({ ...key, frequency: 440 * 2 ** ((12 * (key.octave + 1) + SEMITONES[key.note] - 69) / 12) }));
}

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
  let audioContext;

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
  document.addEventListener("keydown", event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = byCode.get(event.code);
    if (!key) return;
    event.preventDefault();
    startVoice(key, `keyboard:${event.code}`);
  });
  document.addEventListener("keyup", event => stopVoice(`keyboard:${event.code}`));
  window.addEventListener("blur", stopAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAll();
  });
  for (const [code, button] of buttons) {
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
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
