
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createWavBlob(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);
  return new Blob([header, pcmData], { type: 'audio/wav' });
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const SHOTGUN_MIC_CONSTRAINTS = {
  audio: {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    channelCount: { ideal: 1 }, // Mono focuses audio bean patterns like cardboard and shotgun mics
    sampleRate: { ideal: 48000 },
    latency: { ideal: 0.005 }
  }
};

export function applyVoiceFocusFilter(stream: MediaStream): MediaStream {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return stream;

    const ctx = new AudioContextClass({ sampleRate: 16000 });
    const source = ctx.createMediaStreamSource(stream);

    // 1. Highpass Filter: Cuts out extreme low vibration, wind, engine rumble, AC hums (below 85Hz)
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(85, ctx.currentTime);
    hp.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. Lowpass Filter: Cuts high frequency static hiss, whistle, computer crackles (above 3400Hz)
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3400, ctx.currentTime);
    lp.Q.setValueAtTime(0.707, ctx.currentTime);

    // 3. Peaking Filter: Boost the voice presence band slightly (vocal warm clarity boost)
    const peak = ctx.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.setValueAtTime(1500, ctx.currentTime);
    peak.Q.setValueAtTime(1.0, ctx.currentTime);
    peak.gain.setValueAtTime(3, ctx.currentTime);

    // 4. Dynamics Compressor: Smooth out vocal levels with very fast action to prevent spikes/clips
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-32, ctx.currentTime);
    comp.knee.setValueAtTime(8, ctx.currentTime);
    comp.ratio.setValueAtTime(3, ctx.currentTime);
    comp.attack.setValueAtTime(0.003, ctx.currentTime);
    comp.release.setValueAtTime(0.15, ctx.currentTime);

    // 5. Intelligent Noise Gate: Detects signal RMS strength to suppress non-voice/ambient silence
    const gateNode = ctx.createScriptProcessor(2048, 1, 1);
    gateNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      let sumOfSquares = 0;
      for (let i = 0; i < input.length; i++) {
        sumOfSquares += input[i] * input[i];
      }
      const rms = Math.sqrt(sumOfSquares / input.length);

      // Noise gate threshold: values below 0.007 are mostly room reverb, background noise, or computer fans
      const voiceThreshold = 0.007;
      if (rms < voiceThreshold) {
        // Complete silence for other sounds/noises
        for (let i = 0; i < input.length; i++) {
          output[i] = 0;
        }
      } else {
        // Clean high-fidelity vocal delivery
        for (let i = 0; i < input.length; i++) {
          output[i] = input[i];
        }
      }
    };

    const dest = ctx.createMediaStreamDestination();
    source.connect(hp);
    hp.connect(lp);
    lp.connect(peak);
    peak.connect(comp);
    comp.connect(gateNode);
    gateNode.connect(dest);

    // Persist refs so garbage collection doesn't cease stream processing
    const cleanStream = dest.stream;
    (cleanStream as any)._audioCtx = ctx;
    (cleanStream as any)._gateNode = gateNode;
    (cleanStream as any)._rawStream = stream;

    return cleanStream;
  } catch (err) {
    console.warn("Failed to apply premium voice focuses filter, returning original stream:", err);
    return stream;
  }
}
