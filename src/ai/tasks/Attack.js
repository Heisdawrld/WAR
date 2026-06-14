import { BTNode, BTStatus } from '../nodes/BTNode.js';
import { EventBus } from '../../core/EventBus.js';
export class Attack extends BTNode {
  tick(bb, dt) {
    const combat = bb.combat; const target = bb.target; const tx = bb.transform;
    if (!combat || !target || !tx) return BTStatus.FAILURE;
    const ttx = target.get('transform'); const thp = target.get('health');
    if (!ttx || (thp && !thp.alive)) { bb.target = null; return BTStatus.FAILURE; }
    const dx = ttx.x - tx.x, dz = ttx.z - tx.z, dist = Math.sqrt(dx*dx + dz*dz);
    const atkRange = combat.range + (combat.isRanged ? 0 : 1);
    if (dist > atkRange) return BTStatus.FAILURE;
    tx.rotation = Math.atan2(dx, dz);
    if (!combat.isRanged && dist > 1.5) {
      const step = Math.min((bb.unitType?.speed ?? 3) * dt, dist - 1);
      tx.x += (dx / dist) * step; tx.z += (dz / dist) * step;
    }
    if (!combat.tickCooldown(dt)) return BTStatus.RUNNING;
    const damage = this._calcDamage(bb, target);
    combat.resetCooldown();
    if (combat.isRanged) {
      EventBus.emit('projectile:spawn', { attackerId: bb.entity?.id, targetId: target.id, damage, projectileSpeed: combat.projectileSpeed, projectileArc: combat.projectileArc, isAoe: combat.special === 'aoe' || combat.special === 'siege', aoeRadius: combat.aoeRadius, side: bb.team?.side });
    } else {
      EventBus.emit('combat:damage', { attackerId: bb.entity?.id, targetId: target.id, damage, isMelee: true });
    }
    if (thp && thp.hp <= damage) return BTStatus.SUCCESS;
    return BTStatus.RUNNING;
  }
  _calcDamage(bb, target) {
    const c = bb.combat; const tc = target.get('combat');
    let d = c.damage;
    const rng = bb.rng;
    if (c.shieldChance > 0 && (rng ? rng.next() : Math.random()) < c.shieldChance) return 0;
    if (c.special === 'antiCavalry' && tc?.special === 'charge') d *= c.bonusVsCavalry;
    if (c.special === 'charge' && c.charging) { d *= c.chargeMultiplier; c.charging = false; }
    if (c.special === 'flank') {
      const tx = bb.transform; const ttx = target.get('transform');
      const dx = ttx.x - tx.x, dz = ttx.z - tx.z;
      const dot = (dx * Math.sin(ttx?.rotation ?? 0) + dz * Math.cos(ttx?.rotation ?? 0)) / (Math.sqrt(dx*dx + dz*dz) || 1);
      if (dot > 0.3) d *= c.flankBonus;
    }
    return Math.round(d);
  }
}
