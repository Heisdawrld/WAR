import { EventBus } from '../core/EventBus.js';
export class CleanupSystem {
  constructor(world, deathDelay = 1.5) {
    this.world = world; this.deathDelay = deathDelay;
    this._timers = new Map();
    this._unsubs = [EventBus.on('combat:kill', e => this._onKill(e))];
  }
  lateUpdate(dt) {
    for (const [id, t] of this._timers) {
      const nt = t - dt;
      if (nt <= 0) { this._timers.delete(id); this.world.destroyEntity(id); EventBus.emit('combat:corpse:removed', { entityId: id }); }
      else this._timers.set(id, nt);
    }
    for (const e of this.world.query('health')) {
      const hp = e.get('health'); if (hp && hp.isDead && !this._timers.has(e.id)) this._timers.set(e.id, this.deathDelay);
    }
    this.world.flushDestroyed();
  }
  _onKill(e) { this._timers.set(e.targetId, this.deathDelay); EventBus.emit('particle:spawn', { type: 'dust', entityId: e.targetId }); }
  clear() { for (const id of this._timers.keys()) this.world.destroyEntity(id); this._timers.clear(); this.world.flushDestroyed(); }
  dispose() { this.clear(); for (const fn of this._unsubs) fn(); }
}
