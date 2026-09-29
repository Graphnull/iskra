const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_NOTES = ["C♯", "D♯", "F♯", "G♯", "A♯"];
const BLACK_AFTER = [0, 1, 3, 4, 5];
const ROWS = [
  { id: "upper-keyboard", octave: 5, white: "QWERTYU", black: "23567" },
  { id: "lower-keyboard", octave: 4, white: "ZXCVBNM", black: "SDGHJ" },
];
const SEMITONES = { C: 0, "C♯": 1, D: 2, "D♯": 3, E: 4, F: 5, "F♯": 6, G: 7, "G♯": 8, A: 9, "A♯": 10, B: 11 };
const DIGIT_CODE = { "2": "Digit2", "3": "Digit3", "5": "Digit5", "6": "Digit6", "7": "Digit7" };

export function buildKeyMap() {
  const keys = [];
  for (const row of ROWS) {
    for (let i = 0; i < 7; i++) {
      keys.push({ row: row.id, code: `Key${row.white[i]}`, label: row.white[i], note: WHITE_NOTES[i], octave: row.octave, black: false, position: i });
    }
    for (let i = 0; i < 5; i++) {
      keys.push({ row: row.id, code: row.octave === 5 ? DIGIT_CODE[row.black[i]] : `Key${row.black[i]}`, label: row.black[i], note: BLACK_NOTES[i], octave: row.octave, black: true, position: BLACK_AFTER[i] + 1 });
    }
  }
  return keys.map(key => ({ ...key, frequency: 440 * 2 ** ((12 * (key.octave + 1) + SEMITONES[key.note] - 69) / 12) }));
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
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = key.frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.09, audioContext.currentTime + 0.25);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    voices.set(source, { oscillator, gain, code: key.code });
    buttons.get(key.code)?.classList.add("is-active");
  }

  function stopVoice(source) {
    const voice = voices.get(source);
    if (!voice) return;
    const now = audioContext.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.001), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    voice.oscillator.stop(now + 0.14);
    voices.delete(source);
    if (![...voices.values()].some(item => item.code === voice.code)) buttons.get(voice.code)?.classList.remove("is-active");
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
  window.addEventListener("blur", () => { for (const source of voices.keys()) stopVoice(source); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) for (const source of voices.keys()) stopVoice(source);
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
