export class AudioEngine {
  constructor() {
    this.initialized = false;
    this.masterVolume = 0.5;
    this.ctx = null;
    this.masterGain = null;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not available');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSfx(name) {
    if (!this.initialized || !this.ctx) return;
    try {
      switch (name) {
        case 'click': this._playTone(800, 0.05, 'square', 0.15); break;
        case 'place': this._playTone(400, 0.08, 'sine', 0.2); break;
        case 'fight': this._playChord([200, 300, 400], 0.3, 'sawtooth', 0.12); break;
        case 'hit': this._playNoise(0.04, 0.15); break;
        case 'death': this._playTone(150, 0.15, 'sawtooth', 0.1); break;
        case 'victory': this._playChord([400, 500, 600, 800], 0.5, 'sine', 0.1); break;
        case 'defeat': this._playChord([200, 150, 100], 0.6, 'sawtooth', 0.08); break;
      }
    } catch (e) {}
  }

  _playTone(freq, duration, type = 'sine', volume = 0.1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _playChord(freqs, duration, type = 'sine', volume = 0.1) {
    for (const f of freqs) {
      this._playTone(f, duration, type, volume / freqs.length);
    }
  }

  _playNoise(duration, volume = 0.1) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  playMusic() {}
  stopMusic() {}

  setMasterVolume(v) {
    this.masterVolume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }
}
