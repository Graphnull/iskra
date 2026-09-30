export const SYNTH_STEPS = 64;
export const SYNTH_ROWS = 16;
export function synthPosition(step) {
  const position = ((step % 256) + 256) % 256;
  return { section: Math.floor(position / SYNTH_STEPS), column: position % SYNTH_STEPS };
}
export function noteAt(notes, row, column) {
  return notes.find(note => note.row === row && column >= note.start && column < note.start + note.length);
}
export function putNote(notes, row, start, length) {
  const next = { row, start, length: Math.min(length, SYNTH_STEPS - start) };
  return [...notes.filter(note => note.row !== row || note.start + note.length <= start || note.start >= start + next.length), next];
}
export function restoreSynth(saved) {
  const empty = () => ({ version: 1, selected: 0, page: 0, octave: 0, sound: 'pad', root: 60, loop: true, length: 4, cutoff: 4500, sections: [[], [], [], []] });
  if (saved?.version !== 1 || !Array.isArray(saved.sections) || saved.sections.length !== 4) return empty();
  const state = empty();
  for (let section = 0; section < 4; section++) {
    const notes = saved.sections[section];
    if (!Array.isArray(notes) || notes.length > SYNTH_ROWS * SYNTH_STEPS) return empty();
    for (const note of notes) {
      if (!note || ![note.row,note.start,note.length].every(Number.isInteger) || note.row < 0 || note.row >= SYNTH_ROWS
        || note.start < 0 || note.start >= SYNTH_STEPS || note.length < 1 || note.start + note.length > SYNTH_STEPS) return empty();
      state.sections[section] = putNote(state.sections[section], note.row, note.start, note.length);
    }
  }
  for (const key of ['selected', 'page']) if (Number.isInteger(saved[key]) && saved[key] >= 0 && saved[key] < 4) state[key] = saved[key];
  if (Number.isInteger(saved.octave) && Math.abs(saved.octave) <= 2) state.octave = saved.octave;
  if (['pad','bass','lead','sample'].includes(saved.sound)) state.sound = saved.sound;
  if (Number.isInteger(saved.root) && saved.root >= 48 && saved.root <= 72) state.root = saved.root;
  if (typeof saved.loop === 'boolean') state.loop = saved.loop;
  if ([1,2,4,8,16,32,64].includes(saved.length)) state.length = saved.length;
  if (Number.isFinite(saved.cutoff) && saved.cutoff >= 200 && saved.cutoff <= 10000) state.cutoff = saved.cutoff;
  return state;
}
export function activeSynthNotes(state, step) {
  const { section, column } = synthPosition(step);
  return state.sections[section].filter(note => note.start <= column && note.start + note.length > column)
    .map(note => ({ ...note, remaining: note.start + note.length - column }));
}
