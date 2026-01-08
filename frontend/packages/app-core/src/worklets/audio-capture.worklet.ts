/// <reference types="@types/audioworklet" />

class AudioCaptureProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private readonly chunkSize: number;

  constructor() {
    super();
    this.chunkSize = 2048;
    this.buffer = new Float32Array(0);
  }

  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    if (this.buffer.length === 0) {
      this.buffer = channel.slice();
    } else {
      const merged = new Float32Array(this.buffer.length + channel.length);
      merged.set(this.buffer);
      merged.set(channel, this.buffer.length);
      this.buffer = merged;
    }

    while (this.buffer.length >= this.chunkSize) {
      const chunk = this.buffer.subarray(0, this.chunkSize);
      const copy = new Float32Array(chunk.length);
      copy.set(chunk);
      this.port.postMessage(copy, [copy.buffer]);
      this.buffer = this.buffer.slice(this.chunkSize);
    }

    return true;
  }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);
