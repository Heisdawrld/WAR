import { Component } from '../Component.js';
export class AIState extends Component {
  static get type() { return 'aiState'; }
  constructor(d = {}) { super(d); this.enabled = d.enabled ?? true; this.engageRange = d.engageRange ?? 40; this.blackboard = d.blackboard ?? {}; this.behaviorTreeId = d.behaviorTreeId ?? 'default'; }
  get bb() { return this.blackboard; }
  reset() { this.blackboard = {}; }
  clone() {
    const bb = {};
    for (const [k, v] of Object.entries(this.blackboard)) { if (v && typeof v === 'object' && v.constructor === Object) bb[k] = { ...v }; else bb[k] = v; }
    return new AIState({ enabled: this.enabled, engageRange: this.engageRange, blackboard: bb, behaviorTreeId: this.behaviorTreeId });
  }
}
