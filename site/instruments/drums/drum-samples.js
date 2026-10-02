import { restoreSampleSettings } from "../../core/sample-edit.js?v=a3d1f500d2df";
import { drumForMidi } from "./drum-notes.js?v=a3d1f500d2df";
import { sampleBounds } from "../../core/microphone.js?v=a3d1f500d2df";
export const SAMPLE_BINDINGS = [
    { midi: 72, note: "C5", key: "Q" },
    { midi: 74, note: "D5", key: "W" },
    { midi: 76, note: "E5", key: "E" },
    { midi: 77, note: "F5", key: "R" },
];
export function drumTrackForMidi(midi) {
    const slot = SAMPLE_BINDINGS.findIndex((binding) => binding.midi === midi);
    return slot < 0 ? drumForMidi(midi) : 8 + slot;
}
export async function decodeDrumSample(context, blob) {
    if (blob.size > 5 * 1024 * 1024)
        throw new Error("Запись слишком большая. Запиши до 10 секунд.");
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > 12)
        throw new Error("Запись слишком длинная. Запиши до 10 секунд.");
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
    const { start, end } = sampleBounds(channels, decoded.sampleRate);
    const buffer = context.createBuffer(decoded.numberOfChannels, end - start, decoded.sampleRate);
    channels.forEach((channel, index) => buffer.copyToChannel(channel.subarray(start, end), index));
    return buffer;
}
export function drumSampleVoice(context, output, buffer, time, settings) {
    if (!buffer)
        return null;
    const { gain: level, start } = restoreSampleSettings(settings, buffer.duration);
    const duration = buffer.duration - start;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    // Play once at its recorded pitch, with a short fade at either edge.
    gain.gain.setValueAtTime(level ? 0.0001 : 0, time);
    const fade = Math.min(0.005, duration / 4);
    gain.gain.linearRampToValueAtTime(0.8 * level, time + fade);
    gain.gain.setValueAtTime(0.8 * level, time + duration - fade);
    gain.gain.linearRampToValueAtTime(level ? 0.0001 : 0, time + duration);
    source.connect(gain).connect(output);
    source.start(time, start);
    source.stop(time + duration + 0.02);
    return { source, gain, time };
}
