// Frames retain their position in a global 64-step loop, including wraparound.
export const loopSeconds = (bpm: number) => (64 * 15) / bpm;
export function loopPhase(time: number, duration: number): number {
  return ((time % duration) + duration) % duration;
}
export function placeLoopChunk(
  target: Float32Array,
  chunk: Float32Array,
  frame: number,
) {
  for (let i = 0; i < chunk.length; i++) {
    const index =
      (((frame + i) % target.length) + target.length) % target.length;
    target[index] = (target[index] ?? 0) + (chunk[i] ?? 0);
  }
}
export function loopWav(samples: Float32Array, rate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 4),
    view = new DataView(bytes);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 3, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 32, true);
  text(36, "data");
  view.setUint32(40, samples.length * 4, true);
  for (let i = 0; i < samples.length; i++)
    view.setFloat32(44 + i * 4, samples[i] ?? 0, true);
  return new Blob([bytes], { type: "audio/wav" });
}
