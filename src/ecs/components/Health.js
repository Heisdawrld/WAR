import { Component } from '../Component.js';
export class Health extends Component {
  static get type() { return 'health'; }
  constructor(d = {}) { super(d); this.hp = d.hp ?? 100; this.maxHp = d.maxHp ?? 100; this.alive = d.alive ?? true; }
  takeDamage(amt) { if (!this.alive) return 0; const a = Math.min(amt, this.hp); this.hp -= a; if (this.hp <= 0) { this.hp = 0; this.alive = false; } return a; }
  heal(amt) { if (!this.alive) return 0; const b = this.hp; this.hp = Math.min(this.hp + amt, this.maxHp); return this.hp - b; }
  get healthPercent() { return this.maxHp > 0 ? this.hp / this.maxHp : 0; }
  get isDead() { return !this.alive; }
}
