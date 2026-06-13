import { EventBus } from '../core/EventBus.js';
import { InstancedPool } from './InstancedPool.js';
export class RenderSystem {
  constructor(world, scene) {
    this.world = world; this.scene = scene;
    this.pools = new Map(); this._dirty = new Set();
    this._unsubs = [
      EventBus.on('render:markdirty', e => this._dirty.add(e.id)),
      EventBus.on('ecs:entity:destroyed', e => { for (const p of this.pools.values()) p.removeInstance(e.id); this._dirty.delete(e.id); }),
    ];
  }
  render(dt) {
    if (this._dirty.size === 0) return;
    for (const id of this._dirty) {
      const e = this.world.getEntity(id); if (!e || !e.alive) continue;
      const tx = e.get('transform'); const ut = e.get('unitType'); const team = e.get('team'); const hp = e.get('health');
      if (!tx || !ut) continue;
      if (!this.pools.has(ut.id)) this.pools.set(ut.id, new InstancedPool(this.scene, ut.id, ut.color));
      const pool = this.pools.get(ut.id);
      const isRed = team ? team.isRed : true;
      pool.updateInstance(id, { position: { x: tx.x, y: tx.y, z: tx.z }, rotation: tx.rotation, scale: ut.size, color: isRed ? 0xff3333 : 0x3366ff, alive: hp ? hp.alive : true });
    }
    this._dirty.clear();
    for (const p of this.pools.values()) p.syncBuffers();
  }
  markDirty(id) { this._dirty.add(id); }
  markAllDirty(type) { const ents = type ? this.world.query('transform', type) : this.world.query('transform'); for (const e of ents) this._dirty.add(e.id); }
  dispose() { for (const p of this.pools.values()) p.dispose(); this.pools.clear(); this._dirty.clear(); for (const fn of this._unsubs) fn(); }
}
