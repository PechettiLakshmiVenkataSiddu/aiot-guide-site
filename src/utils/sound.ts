/**
 * Central Sound Synthesizer using pure Web Audio API.
 * Synthesizes frequencies dynamically - zero audio files required.
 * Muted until the first tap/user gesture, with persistent mute and volume settings.
 */

export type SoundEffect =
  | 'tap'
  | 'step-done'
  | 'project-done'
  | 'error'
  | 'hum-toggle';

const MUTE_STORAGE_KEY = 'aiot_sound_muted';
const VOLUME_STORAGE_KEY = 'aiot_sound_volume';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true; // Initially muted until first tap or user enables
  private volume: number = 0.5; // Default 50%
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private isAmbientPlaying: boolean = false;

  constructor() {
    try {
      const storedMute = localStorage.getItem(MUTE_STORAGE_KEY);
      if (storedMute !== null) {
        this.isMuted = storedMute === 'true';
      }
      const storedVol = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (storedVol !== null) {
        this.volume = parseFloat(storedVol);
      }
    } catch {
      this.isMuted = true;
      this.volume = 0.5;
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    } catch {
      // ignore
    }
    if (muted && this.isAmbientPlaying) {
      this.stopAmbientHum();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volume));
    } catch {
      // ignore
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(this.volume * 0.05, this.ctx.currentTime);
    }
  }

  /**
   * Synthesize named sound effect
   */
  public play(effect: SoundEffect): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, now);
    masterGain.connect(ctx.destination);

    switch (effect) {
      case 'tap': {
        // Soft high-frequency subtle transient (1200Hz -> 400Hz over 15ms)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.02);
        break;
      }

      case 'step-done': {
        // Cheerful rising dual-tone blip (523Hz [C5] -> 659Hz [E5])
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.setValueAtTime(659.25, now + 0.05);
        osc2.frequency.setValueAtTime(1046.5, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);
        osc1.start(now);
        osc2.start(now + 0.05);
        osc1.stop(now + 0.16);
        osc2.stop(now + 0.16);
        break;
      }

      case 'project-done': {
        // Major chord shimmer arpeggio: C5 -> E5 -> G5 -> C6
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          const noteTime = now + idx * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.25, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(noteTime);
          osc.stop(noteTime + 0.45);
        });
        break;
      }

      case 'error': {
        // Low sawtooth alert buzz (130Hz -> 90Hz, 150ms)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      case 'hum-toggle': {
        if (this.isAmbientPlaying) {
          this.stopAmbientHum();
        } else {
          this.startAmbientHum();
        }
        break;
      }
    }
  }

  public startAmbientHum(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    if (this.isAmbientPlaying) return;
    const now = ctx.currentTime;
    this.ambientOsc = ctx.createOscillator();
    this.ambientGain = ctx.createGain();

    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.setValueAtTime(55, now); // Grounding 55Hz (A1) low hum

    this.ambientGain.gain.setValueAtTime(0.001, now);
    this.ambientGain.gain.linearRampToValueAtTime(this.volume * 0.04, now + 1.0);

    this.ambientOsc.connect(this.ambientGain);
    this.ambientGain.connect(ctx.destination);

    this.ambientOsc.start(now);
    this.isAmbientPlaying = true;
  }

  public stopAmbientHum(): void {
    if (!this.isAmbientPlaying || !this.ambientGain || !this.ambientOsc || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    setTimeout(() => {
      try {
        this.ambientOsc?.stop();
        this.ambientOsc?.disconnect();
      } catch {
        // ignore
      }
      this.isAmbientPlaying = false;
      this.ambientOsc = null;
      this.ambientGain = null;
    }, 550);
  }

  public isAmbientActive(): boolean {
    return this.isAmbientPlaying;
  }
}

export const sound = new SoundEngine();
