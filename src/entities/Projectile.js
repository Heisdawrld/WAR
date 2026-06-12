import * as THREE from 'three';

export class ProjectileSystem {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.unitManager = null;
    this.projectiles = [];
    this.projectileGeo = new THREE.SphereGeometry(0.1, 4, 4);
    this.trailGeo = new THREE.BufferGeometry();
  }

  setUnitManager(um) {
    this.unitManager = um;
  }

  spawn(attacker, target, damage) {
    const startPos = attacker.position.clone();
    startPos.y += 1.5;
    const targetPos = target.position.clone();
    targetPos.y += 1;

    const isArc = attacker.typeData.projectileArc > 0;
    const speed = attacker.typeData.projectileSpeed || 30;
    const arcHeight = attacker.typeData.projectileArc || 0;

    const mat = new THREE.MeshBasicMaterial({
      color: attacker.side === 'red' ? 0xff6633 : 0x3388ff,
      emissive: attacker.side === 'red' ? 0xff3300 : 0x0044ff
    });

    const mesh = new THREE.Mesh(this.projectileGeo, mat);
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    const velocity = new THREE.Vector3().subVectors(targetPos, startPos);
    const dist = velocity.length();
    velocity.normalize().multiplyScalar(speed);

    this.projectiles.push({
      mesh,
      velocity,
      startPos: startPos.clone(),
      targetPos: targetPos.clone(),
      target,
      damage,
      attacker,
      time: 0,
      totalTime: dist / speed,
      arcHeight,
      isArc,
      alive: true
    });
  }

  update(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      p.time += delta;
      const t = Math.min(p.time / p.totalTime, 1);

      p.mesh.position.lerpVectors(p.startPos, p.targetPos, t);

      if (p.isArc) {
        p.mesh.position.y += Math.sin(t * Math.PI) * p.arcHeight;
      }

      if (t >= 1) {
        this.hitTarget(p);
        p.alive = false;
      }
    }
  }

  hitTarget(projectile) {
    const target = projectile.target;
    if (target && target.alive) {
      let damage = projectile.damage;

      if (projectile.attacker.typeData.special === 'aoe') {
        const aoeRadius = projectile.attacker.typeData.aoeRadius;
        const nearby = this.getNearbyUnits(target.position, aoeRadius, target.side);
        for (const unit of nearby) {
          unit.hp -= damage * 0.5;
          if (unit.hp <= 0) {
            unit.alive = false;
            unit.hp = 0;
          }
        }
      }

      target.hp -= damage;
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
      }
    }
  }

  getNearbyUnits(position, radius, excludeSide) {
    if (!this.unitManager) return [];
    const units = [];
    for (const unit of this.unitManager.getAliveUnits()) {
      if (unit.side === excludeSide) continue;
      if (unit.position.distanceTo(position) <= radius) {
        units.push(unit);
      }
    }
    return units;
  }

  clear() {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.projectiles = [];
  }
}
