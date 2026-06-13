import { EventBus } from '../core/EventBus.js';
export class CombatSystem {
  constructor(world) { this.world = world; this._unsubs = [EventBus.on('combat:damage', e => this._onDamage(e))]; }
  update(dt) {} // event-driven, no per-frame tick needed
  _onDamage(e) {
    const target = this.world.getEntity(e.targetId); if (!target) return;
    const hp = target.get('health'); if (!hp || !hp.alive) return;
    const dealt = hp.takeDamage(e.damage); if (dealt <= 0) return;
    EventBus.emit('render:markdirty', { id: e.targetId });
    EventBus.emit('combat:damage:dealt', { attackerId: e.attackerId, targetId: e.targetId, damage: dealt, isMelee: e.isMelee });
    if (hp.isDead) EventBus.emit('combat:kill', { targetId: e.targetId, killerId: e.attackerId });
  }
  dispose() { for (const fn of this._unsubs) fn(); }
}
