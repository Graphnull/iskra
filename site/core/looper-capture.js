class LoopCapture extends AudioWorkletProcessor {
    process(inputs) {
        const channels = inputs[0];
        if (channels?.[0]) {
            const mono = new Float32Array(channels[0].length);
            for (const channel of channels)
                for (let i = 0; i < mono.length; i++)
                    mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / channels.length;
            this.port.postMessage({ time: currentFrame / sampleRate, samples: mono }, [mono.buffer]);
        }
        return true;
    }
}
registerProcessor("iskra-loop-capture", LoopCapture);
export {};
