export class SeedRandom {
  constructor(seed = Date.now()) { this._seed = seed >>> 0; this._state = this._seed; }
  reset() { this._state = this._seed; }
  get seed() { return this._seed; }
  set seed(v) { this._seed = v >>> 0; this._state = this._seed; }
  next() {
    let t = (this._state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min, max) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = this.int(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  toJSON() { return { seed: this._seed, state: this._state }; }
  fromJSON(j) { this._seed = j.seed >>> 0; this._state = j.state >>> 0; }
}
