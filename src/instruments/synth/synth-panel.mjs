const KNOBS = [
  ['cutoff', 'Фильтр', 200, 10000, 'Hz'],
  ['resonance', 'Резонанс', 0, 12, 'Q'],
  ['attack', 'Атака', 0.003, 2, 's'],
  ['decay', 'Затухание', 0.02, 8, 's'],
  ['sustain', 'Сустейн', 0, 1, '%'],
  ['release', 'Релиз', 0.05, 4, 's'],
];

function formatValue(value, unit) {
  if (unit === 's') return `${Math.round(value * 1000)} мс`;
  if (unit === '%') return `${Math.round(value * 100)}%`;
  if (unit === 'Hz') return `${Math.round(value)} Гц`;
  return value.toFixed(1);
}

// This panel owns only DOM and edit notifications. Audio and persistence belong
// to the instrument controller, so UI changes cannot restart playback.
export function mountSynthPanel(state, onChange) {
  const panel = document.createElement('section');
  panel.className = 'synth-panel';
  panel.setAttribute('aria-label', 'Пульт синтезатора');
  panel.innerHTML = `
    <div class="envelope-view">
      <div class="envelope-title"><span>Огибающая · ADSR</span><span id="held-notes">Играй Z–/ или Q–]</span></div>
      <svg id="envelope" viewBox="0 0 320 64" role="img" aria-label="Огибающая громкости">
        <path class="envelope-axis" d="M8 5V52H312"/><path id="envelope-path"/><g id="envelope-labels"></g>
      </svg>
    </div>`;
  const envelope = panel.querySelector('#envelope');
  const envelopePath = panel.querySelector('#envelope-path');
  const envelopeLabels = panel.querySelector('#envelope-labels');
  const heldLabel = panel.querySelector('#held-notes');
  const heldNotes = new Map();
  const refreshKnobs = [];

  function renderEnvelope() {
    const total = state.attack + state.decay + state.release + 1;
    const attackEnd = 8 + state.attack / total * 304;
    const decayEnd = attackEnd + state.decay / total * 304;
    const sustainEnd = decayEnd + 304 / total;
    const sustainY = 52 - state.sustain * 44;
    const points = [[8, 52]];
    const floor = .0001 / (state.sound === 'bass' ? .42 : .18);
    function ramp(start, end, from, to) {
      for (let i = 1; i <= 24; i++) {
        const t = i / 24;
        points.push([start + (end - start) * t, 52 - 44 * from * (to / from) ** t]);
      }
    }
    ramp(8, attackEnd, floor, 1);
    ramp(attackEnd, decayEnd, 1, Math.max(floor, state.sustain));
    points.push([sustainEnd, sustainY]);
    for (let i = 1; i <= 24; i++) {
      const t = i / 24;
      points.push([sustainEnd + (312 - sustainEnd) * t, 52 - 44 * state.sustain * Math.exp(-6.36 * t)]);
    }
    envelopePath.setAttribute('d', points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '));
    envelope.setAttribute('aria-label', `Огибающая: атака ${formatValue(state.attack, 's')}, затухание ${formatValue(state.decay, 's')}, сустейн ${formatValue(state.sustain, '%')}, релиз ${formatValue(state.release, 's')}`);
    envelopeLabels.innerHTML = [
      ['A', (8 + attackEnd) / 2], ['D', (attackEnd + decayEnd) / 2],
      ['S', (decayEnd + sustainEnd) / 2], ['R', (sustainEnd + 312) / 2],
    ].map(([label, x]) => `<text x="${x}" y="63" text-anchor="middle">${label}</text>`).join('');
  }

  for (const [key, label, min, max, unit] of KNOBS) {
    const item = document.createElement('label');
    item.className = 'synth-knob';
    item.innerHTML = `<span>${label}</span><span class="knob-dial"><input type="range" min="0" max="1000" step="1" aria-label="${label}"><span class="knob-pointer"></span></span><output></output>`;
    const input = item.querySelector('input');
    const output = item.querySelector('output');
    const logarithmic = unit === 's' || key === 'cutoff';
    const decode = value => logarithmic ? min * (max / min) ** (value / 1000) : min + (max - min) * value / 1000;
    const encode = value => logarithmic ? Math.log(value / min) / Math.log(max / min) * 1000 : (value - min) / (max - min) * 1000;
    function refresh() {
      input.value = Math.round(encode(state[key]));
      item.style.setProperty('--angle', `${Number(input.value) * .27 - 135}deg`);
      output.textContent = formatValue(state[key], unit);
      input.setAttribute('aria-valuetext', output.textContent);
    }
    input.addEventListener('input', () => {
      state[key] = decode(Number(input.value));
      refresh();
      renderEnvelope();
      onChange(key, state[key]);
    });
    refreshKnobs.push(refresh);
    refresh();
    panel.append(item);
  }
  renderEnvelope();
  return {
    panel,
    refresh() { refreshKnobs.forEach(refresh => refresh()); renderEnvelope(); },
    highlight(key, active, label) {
      if (active) heldNotes.set(key.code, label);
      else heldNotes.delete(key.code);
      heldLabel.textContent = heldNotes.size ? [...heldNotes.values()].join(' · ') : 'Играй Z–/ или Q–]';
    },
  };
}
