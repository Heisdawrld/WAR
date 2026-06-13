let _counter = 0;
export class Entity {
  constructor(world, id) {
    this._world = world;
    this.id = id || `e_${++_counter}_${Date.now().toString(36)}`;
    this._components = new Map();
    this._alive = true;
  }
  add(comp) { this._components.set(comp.type, comp); this._world._onComponentChanged(this, comp.type); return this; }
  remove(type) { const e = this._components.delete(type); if (e) this._world._onComponentChanged(this, type); return e; }
  has(type) { return this._components.has(type); }
  get(type) { return this._components.get(type); }
  get componentTypes() { return [...this._components.keys()]; }
  get components() { return [...this._components.values()]; }
  toJSON() { const c = {}; for (const [t, comp] of this._components) c[t] = comp.toJSON(); return { id: this.id, components: c }; }
  fromJSON(json, reg) { this.id = json.id; this._components.clear(); for (const [t, d] of Object.entries(json.components)) { const Cls = reg(t); if (Cls) this._components.set(t, new Cls(d)); } }
  destroy() { this._alive = false; this._components.clear(); }
  get alive() { return this._alive; }
}
