import { readStored, writeStored } from './storage.mjs?v=274f22366041';
import { widgetStorageKey } from './widget-storage.mjs?v=274f22366041';

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
function validSavedSections(saved, rows, previousRows = []) {
  const acceptedRows = [rows, ...previousRows.filter(count => count < rows)];
  return saved?.version === 2 && Number.isInteger(saved.selected) && saved.selected >= 0 && saved.selected < SECTION_COUNT
    && Array.isArray(saved.patterns) && saved.patterns.length === SECTION_COUNT
    && acceptedRows.some(count => saved.patterns.every(pattern => validPattern(pattern, count)));
}
export function restoreSections(saved, legacy, rows, previousRows = []) {
  const expand = pattern => Array.from({ length: rows }, (_, row) => [...(pattern[row] ?? Array(SECTION_STEPS).fill(false))]);
  if (validSavedSections(saved, rows, previousRows)) {
    return { version: 2, selected: saved.selected, patterns: saved.patterns.map(expand) };
  }
  // Repeat an old loop in every section so upgrading preserves its sound.
  const pattern = [rows, ...previousRows.filter(count => count < rows)].some(count => validPattern(legacy, count)) ? legacy : [];
  return { version: 2, selected: 0, patterns: Array.from({ length: SECTION_COUNT }, () => expand(pattern)) };
}
export function createSections(name, rows, { previousRows = [] } = {}) {
  const key = widgetStorageKey(`${name}-sections-v2`);
  const legacyKey = widgetStorageKey(`${name}-pattern-v1`);
  const saved = readStored(key, null, { validate: value => validSavedSections(value, rows, previousRows) });
  const legacy = readStored(legacyKey, null, {
    validate: value => [rows, ...previousRows.filter(count => count < rows)].some(count => validPattern(value, count)),
  });
  const state = restoreSections(saved, legacy, rows, previousRows);
  return {
    state,
    get pattern() { return state.patterns[state.selected]; },
    save() { writeStored(key, state); },
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
