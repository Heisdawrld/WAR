import { BTNode, BTStatus } from './BTNode.js';
export class Inverter extends BTNode {
  constructor(child) { super(); this.child = child; }
  tick(bb, dt) { const s = this.child.tick(bb, dt); if (s === BTStatus.RUNNING) return BTStatus.RUNNING; return s === BTStatus.SUCCESS ? BTStatus.FAILURE : BTStatus.SUCCESS; }
}
