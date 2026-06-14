import { BTNode, BTStatus } from '../nodes/BTNode.js';
export class FindTarget extends BTNode {
  tick(bb, dt) {
    const world = bb.world; const tx = bb.transform; const team = bb.team;
    if (!world || !tx || !team) return BTStatus.FAILURE;
    const engageRange = bb.engageRange ?? 40;
    let nearest = null; let nearestDist2 = engageRange ** 2;

    if (world.spatial) {
      const candidates = world.spatial.queryRadius(tx.x, tx.z, engageRange);
      for (let i = 0; i < candidates.length; i++) {
        const e = world.getEntity(candidates[i]); if (!e) continue;
        const et = e.get('team'), eh = e.get('health'), etx = e.get('transform');
        if (!et || !eh || !etx || !eh.alive || !team.isEnemyOf(et)) continue;
        const dx = etx.x - tx.x, dz = etx.z - tx.z, d2 = dx*dx + dz*dz;
        if (d2 < nearestDist2) { nearestDist2 = d2; nearest = e; }
      }
      bb.target = nearest || null;
      return nearest ? BTStatus.SUCCESS : BTStatus.FAILURE;
    }

    const enemies = world.query('transform', 'health', 'team');
    for (const e of enemies) {
      const et = e.get('team'); const eh = e.get('health'); const etx = e.get('transform');
      if (!et || !eh || !etx || !eh.alive || !team.isEnemyOf(et)) continue;
      const dx = etx.x - tx.x, dz = etx.z - tx.z, d2 = dx*dx + dz*dz;
      if (d2 < nearestDist2) { nearestDist2 = d2; nearest = e; }
    }
    bb.target = nearest || null;
    return nearest ? BTStatus.SUCCESS : BTStatus.FAILURE;
  }
}
