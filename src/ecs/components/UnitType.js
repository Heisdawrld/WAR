import { Component } from '../Component.js';
export class UnitType extends Component {
  static get type() { return 'unitType'; }
  constructor(d = {}) { super(d); this.id = d.id ?? 'swordsman'; this.name = d.name ?? 'Swordsman'; this.icon = d.icon ?? '⚔️'; this.size = d.size ?? 1; this.color = d.color ?? 0xcc4444; this.speed = d.speed ?? 5; }
}
