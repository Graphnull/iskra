// These globals are supplied by AudioWorkletGlobalScope, not the page.
declare const currentFrame: number;
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(
  name: string,
  processor: typeof AudioWorkletProcessor,
): void;
class LoopCapture extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]): boolean {
    const channels = inputs[0];
    if (channels?.[0]) {
      const mono = new Float32Array(channels[0].length);
      for (const channel of channels)
        for (let i = 0; i < mono.length; i++)
          mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / channels.length;
      this.port.postMessage(
        { time: currentFrame / sampleRate, samples: mono },
        [mono.buffer],
      );
    }
    return true;
  }
}
registerProcessor("iskra-loop-capture", LoopCapture);
export {};
