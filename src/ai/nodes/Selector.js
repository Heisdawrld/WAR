import { BTNode, BTStatus } from './BTNode.js';
export class Selector extends BTNode {
  constructor(children = []) { super(); this.children = children; }
  tick(bb, dt) { for (const c of this.children) { const s = c.tick(bb, dt); if (s !== BTStatus.FAILURE) return s; } return BTStatus.FAILURE; }
}
