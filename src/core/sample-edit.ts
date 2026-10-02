import { isRecord, isNumber } from "./guards.js";
export interface SampleSettings {
  gain: number;
  start: number;
}
export function sampleStartLimit(duration: number): number {
  return Math.max(0, duration - Math.min(0.01, duration / 2));
}
export function restoreSampleSettings(
  value: unknown,
  duration = Infinity,
): SampleSettings {
  const source = isRecord(value) ? value : {};
  return {
    gain: isNumber(source.gain) ? Math.max(0, Math.min(4, source.gain)) : 1,
    start: isNumber(source.start)
      ? Math.max(0, Math.min(sampleStartLimit(duration), source.start))
      : 0,
  };
}
// Keep peak transients from every channel, including quiet recordings.
export function sampleWaveform(buffer: AudioBuffer, bins = 120): number[] {
  const peaks = Array.from({ length: bins }, () => 0);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      const index = Math.min(bins - 1, Math.floor((i * bins) / data.length));
      peaks[index] = Math.max(peaks[index] ?? 0, Math.abs(data[i] ?? 0));
    }
  }
  return peaks;
}
