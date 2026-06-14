import { EventBus } from '../core/EventBus.js';

export class MovementSystem {
  constructor(world) { this.world = world; }

  update(dt) {
    const entities = this.world.query('transform', 'aiState', 'unitType');
    for (const e of entities) {
      const ai = e.get('aiState');
      const target = ai.blackboard.target;
      if (!target) continue;

      const tx = e.get('transform');
      const speed = e.get('unitType').speed;
      const dx = target.x - tx.x;
      const dz = target.z - tx.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.1) continue;

      const move = speed * dt;
      if (move >= dist) {
        tx.x = target.x;
        tx.z = target.z;
      } else {
        tx.x += (dx / dist) * move;
        tx.z += (dz / dist) * move;
      }

      if (tx.x > 85) tx.x = 85;
      if (tx.x < -85) tx.x = -85;
      if (tx.z > 85) tx.z = 85;
      if (tx.z < -85) tx.z = -85;

      EventBus.emit('render:markdirty', { id: e.id });
    }
  }
}
