import { BTNode, BTStatus } from '../nodes/BTNode.js';
export class Chase extends BTNode {
  tick(bb, dt) {
    const tx = bb.transform; const ut = bb.unitType; const target = bb.target;
    if (!tx || !ut || !target) return BTStatus.FAILURE;
    const ttx = target.get('transform'); const thp = target.get('health');
    if (!ttx || (thp && !thp.alive)) { bb.target = null; return BTStatus.FAILURE; }
    const dx = ttx.x - tx.x, dz = ttx.z - tx.z, dist = Math.sqrt(dx*dx + dz*dz);
    if (dist > (bb.engageRange ?? 40)) { bb.target = null; return BTStatus.FAILURE; }
    const atkRange = (bb.combat?.range ?? 2.5) + 1;
    if (dist <= atkRange) return BTStatus.SUCCESS;
    const move = Math.min(ut.speed * dt, dist);
    tx.x += (dx / dist) * move; tx.z += (dz / dist) * move;
    tx.rotation = Math.atan2(dx, dz);
    return BTStatus.RUNNING;
  }
}
