import { EventBus } from '../core/EventBus.js';

export class ProjectileSystem {
  constructor(world) {
    this.world = world;
    this.projectiles = [];
    this._unsubs = [
      EventBus.on('projectile:spawn', e => this._spawn(e)),
    ];
  }

  _spawn(e) {
    const attacker = this.world.getEntity(e.attackerId);
    const target = this.world.getEntity(e.targetId);
    if (!attacker || !target) return;
    const at = attacker.get('transform');
    const tt = target.get('transform');
    if (!at || !tt) return;

    this.projectiles.push({
      x: at.x, y: 0.6, z: at.z,
      targetId: e.targetId,
      attackerId: e.attackerId,
      damage: e.damage,
      speed: e.projectileSpeed,
      arc: e.projectileArc,
      isAoe: e.isAoe,
      aoeRadius: e.aoeRadius,
      side: e.side,
      age: 0,
      maxAge: 5,
    });
  }

  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      p.age += dt;
      if (p.age > p.maxAge) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const target = this.world.getEntity(p.targetId);
      let tx, tz;
      if (target && target.alive) {
        const tt = target.get('transform');
        if (!tt) {
          this.projectiles.splice(i, 1);
          continue;
        }
        tx = tt.x;
        tz = tt.z;
      } else {
        this.projectiles.splice(i, 1);
        continue;
      }

      const dx = tx - p.x;
      const dz = tz - p.z;
      const flatDist = Math.sqrt(dx * dx + dz * dz);

      if (flatDist < 1.5) {
        this._impact(p, tx, tz);
        this.projectiles.splice(i, 1);
        continue;
      }

      const step = p.speed * dt;
      p.x += (dx / flatDist) * step;
      p.z += (dz / flatDist) * step;
    }
  }

  _impact(p, ix, iz) {
    EventBus.emit('projectile:impact', { x: ix, y: p.arc > 0 ? p.arc : 0.6, z: iz, side: p.side });

    if (p.isAoe) {
      const entities = this.world.query('health', 'transform', 'team');
      for (const e of entities) {
        const t = e.get('team');
        if (t.side === p.side) continue;
        const tp = e.get('transform');
        const ex = tp.x - ix, ez = tp.z - iz;
        if (Math.sqrt(ex * ex + ez * ez) <= p.aoeRadius) {
          EventBus.emit('combat:damage', { attackerId: p.attackerId, targetId: e.id, damage: p.damage, isMelee: false });
        }
      }
    } else {
      const target = this.world.getEntity(p.targetId);
      if (target && target.alive) {
        EventBus.emit('combat:damage', { attackerId: p.attackerId, targetId: p.targetId, damage: p.damage, isMelee: false });
      }
    }
  }

  dispose() {
    for (const fn of this._unsubs) fn();
    this.projectiles.length = 0;
  }

  get activeCount() { return this.projectiles.length; }
}
