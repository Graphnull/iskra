export function pianoTone(
  audio: AudioContext,
  destination: AudioNode,
  frequency: number,
  time: number,
) {
  const fundamental = audio.createOscillator(),
    overtone = audio.createOscillator(),
    overtoneLevel = audio.createGain(),
    tone = audio.createGain(),
    release = audio.createGain();
  fundamental.type = "triangle";
  fundamental.frequency.value = frequency;
  overtone.type = "sine";
  overtone.frequency.value = frequency * 2;
  overtoneLevel.gain.value = 0.16;
  tone.gain.setValueAtTime(0.0001, time);
  tone.gain.exponentialRampToValueAtTime(0.16, time + 0.02);
  tone.gain.exponentialRampToValueAtTime(0.07, time + 0.35);
  tone.gain.exponentialRampToValueAtTime(0.035, time + 2);
  release.gain.value = 1;
  fundamental.connect(tone);
  overtone.connect(overtoneLevel).connect(tone);
  tone.connect(release).connect(destination);
  let remaining = 2;
  const ended = () => {
    if (--remaining === 0) {
      fundamental.disconnect();
      overtone.disconnect();
      overtoneLevel.disconnect();
      tone.disconnect();
      release.disconnect();
    }
  };
  fundamental.onended = ended;
  overtone.onended = ended;
  fundamental.start(time);
  overtone.start(time);
  return { release, oscillators: [fundamental, overtone] };
}
