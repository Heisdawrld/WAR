import { Component } from '../Component.js';
export class Transform extends Component {
  static get type() { return 'transform'; }
  constructor(d = {}) { super(d); this.x = d.x ?? 0; this.y = d.y ?? 0; this.z = d.z ?? 0; this.rotation = d.rotation ?? 0; this.vx = d.vx ?? 0; this.vy = d.vy ?? 0; this.vz = d.vz ?? 0; this.scale = d.scale ?? 1; }
  distanceTo(o) { const dx = this.x - o.x, dy = this.y - o.y, dz = this.z - o.z; return Math.sqrt(dx*dx + dy*dy + dz*dz); }
}
