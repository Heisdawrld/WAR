export class Component {
  constructor(data = {}) { Object.assign(this, data); }
  static get type() { throw new Error('Component subclass must define static get type()'); }
  get type() { return this.constructor.type; }
  toJSON() { const j = {}; for (const k of Object.keys(this)) j[k] = this[k]; return j; }
  fromJSON(d) { Object.assign(this, d); }
  clone() { return new this.constructor(JSON.parse(JSON.stringify(this))); }
}
