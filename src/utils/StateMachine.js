export class StateMachine {
  constructor(initial = 'idle', ctx = null) {
    this.currentState = initial; this.previousState = null; this.context = ctx;
    this._states = new Map(); this._transitions = new Map(); this.addState(initial);
  }
  addState(name, h = {}) { this._states.set(name, { onEnter: h.onEnter || null, onExit: h.onExit || null, onUpdate: h.onUpdate || null }); }
  addTransition(from, to, action) { if (!this._transitions.has(from)) this._transitions.set(from, new Map()); this._transitions.get(from).set(action, to); }
  getNextState(action) { return this._transitions.get(this.currentState)?.get(action) || null; }
  transition(a) { const n = this.getNextState(a); return n ? this.forceState(n) : false; }
  forceState(next, p) {
    if (!this._states.has(next) || next === this.currentState) return false;
    const cur = this._states.get(this.currentState);
    if (cur?.onExit) cur.onExit(this.context);
    this.previousState = this.currentState; this.currentState = next;
    const n = this._states.get(next);
    if (n?.onEnter) n.onEnter(this.context, p);
    return true;
  }
  update(d) { this._states.get(this.currentState)?.onUpdate?.(d, this.context); }
  is(s) { return this.currentState === s; }
  can(a) { return this.getNextState(a) !== null; }
  get availableActions() { return [...(this._transitions.get(this.currentState)?.keys() || [])]; }
  reset() { this.forceState(this._states.keys().next().value); this.previousState = null; }
}
