import { BTNode, BTStatus } from '../nodes/BTNode.js';
export class IsTargetInRange extends BTNode {
  tick(bb, dt) {
    const tx = bb.transform; const combat = bb.combat; const target = bb.target;
    if (!tx || !combat || !target) { bb.targetInRange = false; return BTStatus.FAILURE; }
    const ttx = target.get('transform'); if (!ttx) { bb.targetInRange = false; return BTStatus.FAILURE; }
    const dx = ttx.x - tx.x, dz = ttx.z - tx.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const range = combat.range + (combat.isRanged ? 0 : 1);
    bb.targetInRange = dist <= range;
    return bb.targetInRange ? BTStatus.SUCCESS : BTStatus.FAILURE;
  }
}
