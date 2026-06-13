import { EventBus } from '../core/EventBus.js';
import { BehaviorRegistry } from '../ai/BehaviorRegistry.js';
export class AISystem {
  constructor(world) { this.world = world; this.registry = new BehaviorRegistry(); this._unsubs = [EventBus.on('ecs:entity:created', e => this._initBB(e.id))]; }
  update(dt) {
    const ents = this.world.query('transform', 'health', 'team', 'combat', 'aiState');
    for (const entity of ents) {
      const ai = entity.get('aiState'); if (!ai.enabled) continue;
      const tree = this.registry.get(ai.behaviorTreeId); if (!tree) continue;
      const bb = ai.bb;
      bb.entity = entity; bb.world = this.world; bb.transform = entity.get('transform'); bb.combat = entity.get('combat'); bb.team = entity.get('team'); bb.unitType = entity.get('unitType'); bb.engageRange = ai.engageRange;
      if (bb.spawnPos === undefined && bb.transform) bb.spawnPos = { x: bb.transform.x, z: bb.transform.z };
      tree.tick(bb, dt);
      EventBus.emit('render:markdirty', { id: entity.id });
    }
  }
  _initBB(id) { const e = this.world.getEntity(id); if (!e) return; const ai = e.get('aiState'); const tx = e.get('transform'); if (ai && tx) ai.bb.spawnPos = { x: tx.x, z: tx.z }; }
  dispose() { for (const fn of this._unsubs) fn(); }
}
