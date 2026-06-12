export class AudioEngine {
  constructor() {
    this.initialized = false;
    this.masterVolume = 0.7;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
  }

  playSfx(name) {}
  playMusic() {}
  stopMusic() {}
  resume() {}
  setMasterVolume(v) { this.masterVolume = v; }
}
