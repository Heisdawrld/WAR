import { BTNode, BTStatus } from '../nodes/BTNode.js';
export class Patrol extends BTNode {
  constructor(wander = 20, pause = 2) { super(); this.wanderRadius = wander; this.pauseDuration = pause; }
  onEnter(bb) { bb.patrolTarget = null; bb.patrolTimer = 0; }
  tick(bb, dt) {
    const tx = bb.transform; const ut = bb.unitType;
    if (!tx || !ut) return BTStatus.FAILURE;
    const sx = bb.spawnPos?.x ?? tx.x, sz = bb.spawnPos?.z ?? tx.z;
    if (!bb.patrolTarget || (Math.abs(tx.x - bb.patrolTarget.x) < 1 && Math.abs(tx.z - bb.patrolTarget.z) < 1)) {
      bb.patrolTimer = (bb.patrolTimer ?? 0) + dt;
      if (bb.patrolTimer < this.pauseDuration) return BTStatus.RUNNING;
      const angle = Math.random() * Math.PI * 2; const dist = 5 + Math.random() * this.wanderRadius;
      bb.patrolTarget = { x: sx + Math.cos(angle) * dist, z: sz + Math.sin(angle) * dist };
      bb.patrolTimer = 0;
    }
    const dx = bb.patrolTarget.x - tx.x, dz = bb.patrolTarget.z - tx.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < 0.5) return BTStatus.RUNNING;
    const move = Math.min(ut.speed * 0.4 * dt, dist);
    tx.x += (dx / dist) * move; tx.z += (dz / dist) * move;
    tx.rotation = Math.atan2(dx, dz);
    return BTStatus.RUNNING;
  }
}
