import { SpatialHash } from '../utils/SpatialHash.js';

export class SpatialIndexSystem {
  constructor(world) {
    this.world = world;
    this.hash = new SpatialHash(20);
  }

  update(dt) {
    this.hash.clear();
    for (const e of this.world.query('transform', 'team', 'health')) {
      const tx = e.get('transform');
      const hp = e.get('health');
      if (!tx || !hp.alive) continue;
      this.hash.insert(e.id, tx.x, tx.z);
    }
    this.world.spatial = this.hash;
  }
}
