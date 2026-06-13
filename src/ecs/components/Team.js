import { Component } from '../Component.js';
export class Team extends Component {
  static get type() { return 'team'; }
  constructor(d = {}) { super(d); this.side = d.side ?? 'red'; }
  get isRed() { return this.side === 'red'; } get isBlue() { return this.side === 'blue'; }
  isEnemyOf(o) { if (this.side === 'neutral' || o.side === 'neutral') return false; return this.side !== o.side; }
  isAllyOf(o) { return this.side === o.side || this.side === 'neutral' || o.side === 'neutral'; }
}
