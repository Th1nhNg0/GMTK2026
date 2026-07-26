import { SOUND_FREQUENCIES, type SoundEvent } from "./soundEvents";

class AudioManager {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private sfx?: GainNode;
  private musicBuffer?: AudioBuffer;
  private musicSource?: AudioBufferSourceNode;
  private buffers = new Map<SoundEvent, AudioBuffer>();
  private muted = false;
  private musicActive = false;
  private masterVolume = 0.7;
  private musicVolume = 0.35;
  private sfxVolume = 0.75;

  async unlock(): Promise<void> {
    if (typeof window === "undefined" || !("AudioContext" in window)) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.music = this.context.createGain();
      this.sfx = this.context.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(this.context.destination);
      this.syncGains();
      this.buildBuffers();
      this.buildMusicBuffer();
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.syncMusic();
  }

  play(event: SoundEvent): void {
    if (!this.context || !this.sfx || this.muted) return;
    const buffer = this.buffers.get(event);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.sfx);
    source.start();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.syncGains();
  }

  setMasterVolume(value: number): void {
    this.masterVolume = value;
    this.syncGains();
  }

  setMusicVolume(value: number): void {
    this.musicVolume = value;
    this.syncGains();
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = value;
    this.syncGains();
  }

  setMusicActive(active: boolean): void {
    this.musicActive = active;
    this.syncMusic();
  }

  private syncGains(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.masterVolume;
    if (this.music) this.music.gain.value = this.musicVolume;
    if (this.sfx) this.sfx.gain.value = this.sfxVolume;
  }

  private buildBuffers(): void {
    if (!this.context) return;
    for (const [event, [frequency, duration]] of Object.entries(SOUND_FREQUENCIES) as Array<
      [SoundEvent, [number, number]]
    >) {
      const frames = Math.max(1, Math.floor(this.context.sampleRate * duration));
      const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let frame = 0; frame < frames; frame += 1) {
        const progress = frame / frames;
        const envelope = Math.pow(1 - progress, 2);
        data[frame] =
          Math.sin((frame / this.context.sampleRate) * Math.PI * 2 * frequency) * envelope * 0.22;
      }
      this.buffers.set(event, buffer);
    }
  }

  private buildMusicBuffer(): void {
    if (!this.context) return;
    const sampleRate = this.context.sampleRate;
    const duration = 8;
    const frames = sampleRate * duration;
    const buffer = this.context.createBuffer(1, frames, sampleRate);
    const data = buffer.getChannelData(0);
    const bassNotes = [110, 110, 146.83, 123.47, 110, 164.81, 146.83, 123.47];

    for (let frame = 0; frame < frames; frame += 1) {
      const time = frame / sampleRate;
      const beat = Math.floor(time) % bassNotes.length;
      const beatProgress = time % 1;
      const bassEnvelope = Math.min(1, beatProgress * 18) * Math.pow(1 - beatProgress, 2.6);
      const bass = Math.sin(time * Math.PI * 2 * (bassNotes[beat] ?? 110)) * bassEnvelope * 0.07;

      const halfBeatProgress = (time * 2) % 1;
      const tickEnvelope = Math.exp(-halfBeatProgress * 34);
      const tickFrequency = Math.floor(time * 2) % 2 === 0 ? 920 : 690;
      const tick = Math.sin(time * Math.PI * 2 * tickFrequency) * tickEnvelope * 0.025;

      const barProgress = time % 4;
      const accentEnvelope = barProgress < 0.1 ? Math.exp(-barProgress * 28) : 0;
      const accent = Math.sin(time * Math.PI * 2 * 220) * accentEnvelope * 0.025;
      data[frame] = bass + tick + accent;
    }

    this.musicBuffer = buffer;
  }

  private syncMusic(): void {
    if (!this.context || !this.music || !this.musicBuffer) return;
    if (!this.musicActive) {
      if (this.musicSource) {
        this.musicSource.stop();
        this.musicSource.disconnect();
        this.musicSource = undefined;
      }
      return;
    }
    if (this.musicSource) return;
    const source = this.context.createBufferSource();
    source.buffer = this.musicBuffer;
    source.loop = true;
    source.connect(this.music);
    source.start();
    this.musicSource = source;
  }
}

export const audioManager = new AudioManager();
