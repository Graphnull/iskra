// Karplus–Strong: an excitation circulates through a damped string.
export function pluckedBuffer(
  audio: AudioContext,
  midi: number,
  strength = 0.8,
  duration = 4,
): AudioBuffer {
  const frequency = 440 * 2 ** ((midi - 69) / 12);
  const period = Math.max(2, Math.round(audio.sampleRate / frequency - 0.5));
  const buffer = audio.createBuffer(
    1,
    Math.ceil(audio.sampleRate * duration),
    audio.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < Math.min(period, samples.length); i++)
    samples[i] = (Math.random() * 2 - 1) * strength * 0.6;
  for (let i = period; i < samples.length; i++)
    samples[i] =
      0.497 * ((samples[i - period] ?? 0) + (samples[i - period + 1] ?? 0));
  return buffer;
}
