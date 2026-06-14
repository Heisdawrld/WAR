import { Transform } from './components/Transform.js';
import { Health } from './components/Health.js';
import { Combat } from './components/Combat.js';
import { Team } from './components/Team.js';
import { UnitType } from './components/UnitType.js';
import { AIState } from './components/AIState.js';
import { UNIT_TYPES } from '../entities/UnitTypes.js';
import { EventBus } from '../core/EventBus.js';

export class UnitFactory {
  constructor(world) { this.world = world; }

  spawn(typeId, x, y, z, isRed, data = {}) {
    const stats = UNIT_TYPES[typeId];
    if (!stats) throw new Error(`Unknown unit type: ${typeId}`);

    const e = this.world.createEntity();
    e.add(new Transform({ x, y, z }));
    e.add(new Health({ hp: stats.hp, maxHp: stats.hp }));
    e.add(new Combat({
      damage: stats.damage,
      range: stats.range,
      attackSpeed: stats.attackSpeed,
      isRanged: stats.isRanged ?? false,
      projectileSpeed: stats.projectileSpeed ?? 30,
      projectileArc: stats.projectileArc ?? 0,
      special: stats.special ?? null,
      shieldChance: stats.shieldChance ?? 0,
      bonusVsCavalry: stats.bonusVsCavalry ?? 1,
      chargeMultiplier: stats.chargeMultiplier ?? 1.5,
      flankBonus: stats.flankBonus ?? 2,
      volleyCount: stats.volleyCount ?? 1,
      aoeRadius: stats.aoeRadius ?? 0,
    }));
    e.add(new Team({ side: isRed ? 'red' : 'blue' }));
    e.add(new UnitType({ id: typeId, name: stats.name, icon: stats.icon, size: stats.size, color: stats.color, speed: stats.speed }));
    e.add(new AIState(data.aiState ?? {}));

    EventBus.emit('render:markdirty', { id: e.id });
    return e;
  }

  spawnSquad(typeId, count, center, isRed, spacing = 2) {
    const side = Math.ceil(Math.sqrt(count));
    const entities = [];
    let i = 0;
    for (let row = 0; row < side && i < count; row++) {
      for (let col = 0; col < side && i < count; col++) {
        const ox = (col - (side - 1) / 2) * spacing;
        const oz = (row - (side - 1) / 2) * spacing;
        entities.push(this.spawn(typeId, center.x + ox, 0, center.z + oz, isRed));
        i++;
      }
    }
    return entities;
  }

  clearAll() {
    const entities = this.world.query('unitType');
    for (const e of entities) {
      this.world.destroyEntity(e.id);
    }
    this.world.flushDestroyed();
  }
}
