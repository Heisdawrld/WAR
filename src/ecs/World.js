import { Entity } from './Entity.js';
import { EventBus } from '../core/EventBus.js';
export class World {
  constructor() { this._entities = new Map(); this._index = new Map(); this._pendingDestroy = new Set(); }
  createEntity(id) { const e = new Entity(this, id); this._entities.set(e.id, e); EventBus.emit('ecs:entity:created', { entity: e, id: e.id }); return e; }
  getEntity(id) { return this._entities.get(id); }
  hasEntity(id) { return this._entities.has(id) && this._entities.get(id).alive; }
  destroyEntity(id) { const e = this._entities.get(id); if (e && e.alive) this._pendingDestroy.add(id); }
  destroyEntityImmediate(id) {
    const e = this._entities.get(id); if (!e) return;
    for (const [, ids] of this._index) ids.delete(id);
    e.destroy(); this._entities.delete(id);
    EventBus.emit('ecs:entity:destroyed', { id });
  }
  flushDestroyed() { for (const id of this._pendingDestroy) this.destroyEntityImmediate(id); this._pendingDestroy.clear(); }
  query(...types) {
    if (types.length === 0) return [];
    let smallest = types[0], smallestSize = Infinity;
    for (const t of types) { const s = this._index.get(t); const sz = s ? s.size : 0; if (sz < smallestSize) { smallestSize = sz; smallest = t; } }
    const base = this._index.get(smallest); if (!base || base.size === 0) return [];
    const others = types.filter(t => t !== smallest);
    const result = [];
    for (const id of base) {
      const e = this._entities.get(id); if (!e || !e.alive) continue;
      let ok = true; for (const t of others) { if (!e.has(t)) { ok = false; break; } }
      if (ok) result.push(e);
    }
    return result;
  }
  queryAll(type) { const ids = this._index.get(type); if (!ids) return []; const r = []; for (const id of ids) { const e = this._entities.get(id); if (e && e.alive) r.push(e); } return r; }
  queryFirst(...types) { const r = this.query(...types); return r.length > 0 ? r[0] : null; }
  get entityCount() { return this._entities.size; }
  count(type) { return this._index.get(type)?.size ?? 0; }
  *[Symbol.iterator]() { for (const e of this._entities.values()) { if (e.alive) yield e; } }
  _onComponentChanged(e, type) { if (!this._index.has(type)) this._index.set(type, new Set()); const s = this._index.get(type); if (e.has(type)) s.add(e.id); else s.delete(e.id); }
  toJSON() { const entities = {}; for (const [id, e] of this._entities) { if (e.alive) entities[id] = e.toJSON(); } return { entities }; }
  fromJSON(json, reg) { this.clear(); for (const [id, d] of Object.entries(json.entities)) { const e = this.createEntity(id); e.fromJSON(d, reg); } }
  clear() { for (const e of this._entities.values()) e.destroy(); this._entities.clear(); this._index.clear(); this._pendingDestroy.clear(); }
}
