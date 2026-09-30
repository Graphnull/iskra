import { widgetStorageKey } from './widget-storage.mjs?v=8';

export const SECTION_COUNT = 4;
export const SECTION_STEPS = 16;
export function sectionPosition(step) {
  const position = ((step % (SECTION_COUNT * SECTION_STEPS)) + SECTION_COUNT * SECTION_STEPS) % (SECTION_COUNT * SECTION_STEPS);
  return { section: Math.floor(position / SECTION_STEPS), column: position % SECTION_STEPS };
}
function validPattern(pattern, rows) {
  return Array.isArray(pattern) && pattern.length === rows && pattern.every(row =>
    Array.isArray(row) && row.length === SECTION_STEPS && row.every(value => typeof value === 'boolean'));
}
export function restoreSections(saved, legacy, rows) {
  if (saved?.version === 2 && Number.isInteger(saved.selected) && saved.selected >= 0 && saved.selected < SECTION_COUNT
    && Array.isArray(saved.patterns) && saved.patterns.length === SECTION_COUNT
    && saved.patterns.every(pattern => validPattern(pattern, rows))) {
    return { version: 2, selected: saved.selected, patterns: saved.patterns.map(pattern => pattern.map(row => [...row])) };
  }
  // Repeat an old loop in every section so upgrading preserves its sound.
  const pattern = validPattern(legacy, rows) ? legacy : Array.from({ length: rows }, () => Array(SECTION_STEPS).fill(false));
  return { version: 2, selected: 0, patterns: Array.from({ length: SECTION_COUNT }, () => pattern.map(row => [...row])) };
}
export function createSections(name, rows) {
  const key = widgetStorageKey(`${name}-sections-v2`);
  const legacyKey = widgetStorageKey(`${name}-pattern-v1`);
  let saved, legacy;
  // Validate each candidate before accepting it; blocked storage is optional.
  for (const storageName of ['sessionStorage', 'localStorage']) {
    try {
      const candidate = JSON.parse(window[storageName].getItem(key));
      if (candidate?.version === 2 && Number.isInteger(candidate.selected) && candidate.selected >= 0 && candidate.selected < SECTION_COUNT
        && Array.isArray(candidate.patterns) && candidate.patterns.length === SECTION_COUNT && candidate.patterns.every(pattern => validPattern(pattern, rows))) {
        saved = candidate; break;
      }
    } catch {}
  }
  for (const storageName of ['sessionStorage', 'localStorage']) {
    try {
      const candidate = JSON.parse(window[storageName].getItem(legacyKey));
      if (validPattern(candidate, rows)) { legacy = candidate; break; }
    } catch {}
  }
  const state = restoreSections(saved, legacy, rows);
  return {
    state,
    get pattern() { return state.patterns[state.selected]; },
    save() {
      const value = JSON.stringify(state);
      for (const storageName of ['sessionStorage', 'localStorage']) {
        try { window[storageName].setItem(key, value); } catch {}
      }
    },
  };
}
export function mountSections(sequence, grid, cells) {
  const controls = document.createElement('div');
  controls.className = 'section-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Четыре секции по 16 шагов');
  const caption = document.createElement('span');
  caption.textContent = 'Секции';
  controls.append(caption);
  let playing = null;
  const buttons = Array.from({ length: SECTION_COUNT }, (_, section) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = section + 1;
    button.setAttribute('aria-label', `Секция ${section + 1}`);
    button.addEventListener('click', () => {
      sequence.state.selected = section;
      render();
      sequence.save();
    });
    controls.append(button);
    return button;
  });
  // Keep the section selector visible in both grid and keyboard views.
  grid.before(controls);
  function render() {
    buttons.forEach((button, section) => {
      button.setAttribute('aria-pressed', String(sequence.state.selected === section));
      button.classList.toggle('is-playing', playing?.section === section);
      if (playing?.section === section) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.title = `Секция ${section + 1}${playing?.section === section ? ' · играет' : ''}`;
    });
    cells.forEach((cell, index) => {
      const column = index % SECTION_STEPS;
      const enabled = sequence.pattern[Math.floor(index / SECTION_STEPS)][column];
      cell.classList.toggle('is-on', enabled);
      cell.setAttribute('aria-pressed', String(enabled));
      cell.classList.toggle('is-step', playing?.section === sequence.state.selected && playing.column === column);
    });
  }
  render();
  sequence.save();
  return {
    showStep(position) { playing = position; render(); },
    stop() { playing = null; render(); },
  };
}
