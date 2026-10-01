import { drumForMidi } from './drum-notes.js?v=2ce4b858cdb4';
import { sampleBounds } from '../../core/microphone.js?v=2ce4b858cdb4';
export const SAMPLE_BINDINGS = [
    { midi: 72, note: 'C5', key: 'Q' },
    { midi: 74, note: 'D5', key: 'W' },
    { midi: 76, note: 'E5', key: 'E' },
    { midi: 77, note: 'F5', key: 'R' },
];
export function drumTrackForMidi(midi) {
    const slot = SAMPLE_BINDINGS.findIndex(binding => binding.midi === midi);
    return slot < 0 ? drumForMidi(midi) : 8 + slot;
}
export async function decodeDrumSample(context, blob) {
    if (blob.size > 5 * 1024 * 1024)
        throw new Error('Запись слишком большая. Запиши до 10 секунд.');
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > 12)
        throw new Error('Запись слишком длинная. Запиши до 10 секунд.');
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
    const { start, end } = sampleBounds(channels, decoded.sampleRate);
    const buffer = context.createBuffer(decoded.numberOfChannels, end - start, decoded.sampleRate);
    channels.forEach((channel, index) => buffer.copyToChannel(channel.subarray(start, end), index));
    return buffer;
}
export function drumSampleVoice(context, output, buffer, time) {
    if (!buffer)
        return null;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    // Play once at its recorded pitch, with a short fade at either edge.
    gain.gain.setValueAtTime(0.0001, time);
    const fade = Math.min(0.005, buffer.duration / 4);
    gain.gain.linearRampToValueAtTime(0.8, time + fade);
    gain.gain.setValueAtTime(0.8, time + buffer.duration - fade);
    gain.gain.linearRampToValueAtTime(0.0001, time + buffer.duration);
    source.connect(gain).connect(output);
    source.start(time);
    source.stop(time + buffer.duration + 0.02);
    return { source, gain, time };
}
