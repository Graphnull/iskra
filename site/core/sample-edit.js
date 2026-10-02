import { isRecord, isNumber } from "./guards.js?v=f1d1aaff72ac";
export function sampleStartLimit(duration) {
    return Math.max(0, duration - Math.min(0.01, duration / 2));
}
export function restoreSampleSettings(value, duration = Infinity) {
    const source = isRecord(value) ? value : {};
    return {
        gain: isNumber(source.gain) ? Math.max(0, Math.min(4, source.gain)) : 1,
        start: isNumber(source.start)
            ? Math.max(0, Math.min(sampleStartLimit(duration), source.start))
            : 0,
    };
}
// Keep peak transients from every channel, including quiet recordings.
export function sampleWaveform(buffer, bins = 120) {
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
