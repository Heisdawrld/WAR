export const BTStatus = { SUCCESS: 0, FAILURE: 1, RUNNING: 2 };
export class BTNode {
  constructor() { this.name = this.constructor.name; }
  tick(bb, dt) { return BTStatus.SUCCESS; }
  onEnter(bb) {} onExit(bb) {}
}
