export type AudioCaptureSession = {
  audioContext: AudioContext;
  workletNode: AudioWorkletNode;
  source: MediaStreamAudioSourceNode;
  sampleRate: number;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
};

type AudioCaptureOptions = {
  sampleRate?: number;
  onChunk: (pcm16: Int16Array) => void;
};

const workletModuleUrl = new URL("../worklets/audio-capture.worklet.ts", import.meta.url);

export async function createAudioCaptureSession(
  stream: MediaStream,
  options: AudioCaptureOptions
): Promise<AudioCaptureSession> {
  const sampleRate = options.sampleRate ?? 16000;
  const audioContext = new AudioContext({ sampleRate, latencyHint: "interactive" });
  await audioContext.audioWorklet.addModule(workletModuleUrl);

  const workletNode = new AudioWorkletNode(audioContext, "audio-capture-processor");
  workletNode.port.onmessage = (event: MessageEvent<Float32Array | ArrayBuffer>) => {
    const payload = event.data;
    const float32 =
      payload instanceof Float32Array
        ? payload
        : new Float32Array(payload as ArrayBuffer);
    options.onChunk(float32ToInt16(float32));
  };

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(workletNode);

  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  workletNode.connect(silentGain);
  silentGain.connect(audioContext.destination);

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return {
    audioContext,
    workletNode,
    source,
    sampleRate,
    resume: async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    },
    stop: async () => {
      workletNode.port.onmessage = null;
      try {
        workletNode.disconnect();
      } catch {
        // ignore
      }
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      if (audioContext.state !== "closed") {
        await audioContext.close();
      }
    },
  };
}

export function float32ToInt16(buffer: Float32Array) {
  const output = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) {
    const value = Math.max(-1, Math.min(1, buffer[i]));
    output[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return output;
}

export function concatInt16(chunks: Int16Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Int16Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function pcm16ToWavBuffer(pcm16: Int16Array, sampleRate: number, channels = 1) {
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = pcm16.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < pcm16.length; i += 1) {
    view.setInt16(offset, pcm16[i], true);
    offset += bytesPerSample;
  }

  return buffer;
}

export function pcm16ToWavBlob(pcm16: Int16Array, sampleRate: number, channels = 1) {
  return new Blob([pcm16ToWavBuffer(pcm16, sampleRate, channels)], { type: "audio/wav" });
}
