import { Component } from '../Component.js';
export class Combat extends Component {
  static get type() { return 'combat'; }
  constructor(d = {}) { super(d);
    this.damage = d.damage ?? 10; this.range = d.range ?? 2.5; this.attackSpeed = d.attackSpeed ?? 1;
    this.attackCooldown = d.attackCooldown ?? 0; this.isRanged = d.isRanged ?? false;
    this.projectileSpeed = d.projectileSpeed ?? 30; this.projectileArc = d.projectileArc ?? 0;
    this.special = d.special ?? null; this.shieldChance = d.shieldChance ?? 0;
    this.bonusVsCavalry = d.bonusVsCavalry ?? 1; this.chargeMultiplier = d.chargeMultiplier ?? 1.5;
    this.charging = d.charging ?? false; this.flankBonus = d.flankBonus ?? 2;
    this.volleyCount = d.volleyCount ?? 1; this.aoeRadius = d.aoeRadius ?? 0;
  }
  tickCooldown(dt) { if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt); return this.attackCooldown <= 0; }
  resetCooldown() { this.attackCooldown = 1 / this.attackSpeed; }
}
