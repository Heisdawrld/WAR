import { Howl, Howler } from 'howler';

export class AudioEngine {
  constructor() {
    this.initialized = false;
    this.music = null;
    this.sfx = {};
    this.masterVolume = 0.7;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.3;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.sfx.sword = new Howl({ src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+JkIyEfXV4g4uTi4B4dX2LkoyDe3h7iJGNg3p4fImSjYN7eH2Kk46Ee3h9ipOOhHt4fYqTjoR7eH2Kk46Ee3h9ipOOhHt4fYqTjoR7eH2Kk46Ee3h9ipOOhA=='], volume: 0.3, sprite: { hit: [0, 200] } });
    this.sfx.arrow = new Howl({ src: ['data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YToFAACAgIB/gH9/gIGBgYCAf4CAf4CAf4CAf4CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='], volume: 0.2, sprite: { shoot: [0, 300] } });
    this.sfx.death = new Howl({ src: ['data:audio/wav;base64,UklGRmIFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUoFAACAgH9/f3+AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='], volume: 0.4, sprite: { die: [0, 400] } });
  }

  playSfx(name) {
    if (!this.initialized) return;
    const sfx = this.sfx[name];
    if (sfx) {
      sfx.volume(this.sfxVolume * this.masterVolume);
      const sprite = Object.keys(sfx._sprite || {})[0];
      if (sprite) sfx.play(sprite);
      else sfx.play();
    }
  }

  playMusic() {
    if (!this.initialized || this.music) return;
    this.music = new Howl({
      src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAA='],
      loop: true,
      volume: this.musicVolume * this.masterVolume
    });
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music = null;
    }
  }

  setMasterVolume(v) { this.masterVolume = v; }
  setSfxVolume(v) { this.sfxVolume = v; }
  setMusicVolume(v) { this.musicVolume = v; }

  resume() { Howler.resume(); }
}
