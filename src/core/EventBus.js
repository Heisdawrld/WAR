class EventBusClass {
  constructor() { this._listeners = new Map(); this._paused = false; this._queue = []; }
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }
  once(event, fn) { const w = (p) => { this.off(event, w); fn(p); }; return this.on(event, w); }
  off(event, fn) { this._listeners.get(event)?.delete(fn); }
  emit(event, payload) {
    if (this._paused) { this._queue.push({ event, payload }); return; }
    this._dispatch(event, payload);
  }
  _dispatch(event, payload) {
    const list = this._listeners.get(event);
    if (list) for (const fn of list) { try { fn(payload); } catch (e) { console.error(`[EventBus] ${event}:`, e); } }
  }
  pause() { this._paused = true; }
  resume() {
    this._paused = false;
    const q = this._queue.slice(); this._queue.length = 0;
    for (const { event, payload } of q) this._dispatch(event, payload);
  }
  clear() { this._listeners.clear(); this._queue.length = 0; }
}
export const EventBus = new EventBusClass();
