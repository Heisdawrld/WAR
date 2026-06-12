import * as THREE from 'three';

export class BehaviorTree {
  constructor(unitManager, terrain) {
    this.unitManager = unitManager;
    this.terrain = terrain;
    this.engageRange = 40;
    this.particles = null;
  }

  setParticles(particles) {
    this.particles = particles;
  }

  update(delta) {
    const units = this.unitManager.getAliveUnits();
    for (const unit of units) {
      this.updateUnit(unit, delta);
    }
  }

  updateUnit(unit, delta) {
    const nearestEnemy = this.unitManager.findNearestEnemy(unit);
    if (!nearestEnemy) {
      this.idle(unit, delta);
      return;
    }

    const distToEnemy = unit.position.distanceTo(nearestEnemy.position);
    const isRanged = unit.typeData.isRanged;
    const attackRange = unit.typeData.range;

    if (distToEnemy <= attackRange) {
      this.attack(unit, nearestEnemy, delta);
    } else if (distToEnemy <= this.engageRange) {
      this.chase(unit, nearestEnemy, delta);
    } else {
      this.patrol(unit, delta);
    }
  }

  idle(unit, delta) {
    unit.state = 'idle';
    unit.velocity.set(0, 0, 0);
  }

  patrol(unit, delta) {
    unit.state = 'patrol';
    if (!unit.patrolTarget || unit.stateTimer > 3) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      unit.patrolTarget = new THREE.Vector3(
        unit.position.x + Math.cos(angle) * dist,
        0,
        unit.position.z + Math.sin(angle) * dist
      );
      unit.stateTimer = 0;
    }
    this.moveToward(unit, unit.patrolTarget, unit.typeData.speed * 0.4, delta);
  }

  chase(unit, target, delta) {
    unit.state = 'chase';
    unit.target = target;
    this.moveToward(unit, target.position, unit.typeData.speed, delta);
    this.faceTarget(unit, target.position);
  }

  attack(unit, target, delta) {
    unit.state = 'attack';
    unit.target = target;
    this.faceTarget(unit, target.position);

    if (unit.attackCooldown <= 0) {
      this.dealDamage(unit, target);
      unit.attackCooldown = 1 / unit.typeData.attackSpeed;
    }

    if (!unit.typeData.isRanged) {
      this.moveToward(unit, target.position, unit.typeData.speed * 0.3, delta);
    }
  }

  dealDamage(attacker, target) {
    let damage = attacker.typeData.damage;

    if (attacker.typeData.special === 'shield' && Math.random() < attacker.typeData.shieldChance) {
      damage = 0;
    }

    if (attacker.typeData.special === 'antiCavalry' && target.type === 'knight') {
      damage *= attacker.typeData.bonusVsCavalry;
    }

    if (attacker.typeData.special === 'charge' && attacker.state === 'chase') {
      damage *= 1.5;
    }

    if (attacker.typeData.special === 'flank') {
      const toTarget = new THREE.Vector3().subVectors(target.position, attacker.position);
      const targetFacing = new THREE.Vector3(Math.sin(target.rotation), 0, Math.cos(target.rotation));
      if (toTarget.dot(targetFacing) > 0.5) {
        damage *= attacker.typeData.flankBonus;
      }
    }

    if (attacker.typeData.isRanged) {
      return { attacker, target, damage, type: 'projectile' };
    }

    target.hp -= damage;
    if (this.particles && damage > 0) this.particles.blood(target.position);
    if (target.hp <= 0) {
      target.alive = false;
      target.hp = 0;
      if (this.particles) this.particles.dust(target.position);
    }

    return { attacker, target, damage, type: 'melee' };
  }

  moveToward(unit, targetPos, speed, delta) {
    const dir = new THREE.Vector3().subVectors(targetPos, unit.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.5) return;
    dir.normalize();

    const moveSpeed = Math.min(speed * delta, dist);
    unit.position.x += dir.x * moveSpeed;
    unit.position.z += dir.z * moveSpeed;
    unit.velocity.copy(dir).multiplyScalar(speed);
  }

  faceTarget(unit, targetPos) {
    const dir = new THREE.Vector3().subVectors(targetPos, unit.position);
    unit.rotation = Math.atan2(dir.x, dir.z);
  }
}
