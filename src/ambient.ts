export type NoiseKind = "white" | "pink" | "brown";

/** Fills a buffer with looping noise. Pink uses Paul Kellet's filter; brown integrates white noise. */
export function fillNoise(data: Float32Array, kind: NoiseKind, random: () => number = Math.random): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = random() * 2 - 1;
    if (kind === "white") data[i] = white * 0.35;
    else if (kind === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856; b4 = 0.55 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    } else {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 2.8;
    }
  }
}

/** One shared player for all Home tabs; nothing is downloaded and audio stops when the plugin unloads. */
export class AmbientPlayer {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private listeners = new Set<() => void>();
  kind: NoiseKind | null = null;

  get playing(): boolean { return this.source !== null; }

  onChange(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private emit(): void { for (const listener of this.listeners) listener(); }

  async play(kind: NoiseKind, volume: number): Promise<void> {
    this.stopSource();
    const context = this.context ??= new AudioContext();
    if (context.state === "suspended") await context.resume();
    const buffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
    fillNoise(buffer.getChannelData(0), kind);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.4);
    const source = context.createBufferSource();
    source.buffer = buffer; source.loop = true;
    source.connect(gain).connect(context.destination);
    source.start();
    this.source = source; this.gain = gain; this.kind = kind;
    this.emit();
  }

  setVolume(volume: number): void {
    if (this.gain && this.context) this.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
  }

  stop(): void { this.stopSource(); this.emit(); }

  private stopSource(): void {
    const source = this.source, gain = this.gain, context = this.context;
    this.source = null; this.gain = null; this.kind = null;
    if (!source || !gain || !context) return;
    gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
    window.setTimeout(() => { try { source.stop(); } catch { /* already stopped */ } source.disconnect(); gain.disconnect(); }, 400);
  }

  destroy(): void {
    this.stopSource();
    this.listeners.clear();
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
