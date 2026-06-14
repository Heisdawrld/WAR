/**
 * VisualProjectiles — Renders flying projectiles (arrows, bullets, rocks).
 *
 * Hooks ECS `projectile:spawn` events to create visual meshes that fly toward
 * their target. ECS ProjectileSystem handles the LOGIC (damage); this class
 * only handles the VISUALS. On impact, meshes are removed.
 *
 * This replaces the monolith's entities/Projectile.js visual layer.
 */
import * as THREE from 'three';
import { EventBus } from '../core/EventBus.js';

export class VisualProjectiles {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.active = [];  // { mesh, targetId, age, maxAge, arc, startY }

    // Shared geometries
    this._arrowGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4);
    this._bulletGeo = new THREE.SphereGeometry(0.1, 4, 3);
    this._rockGeo = new THREE.DodecahedronGeometry(0.3, 0);

    // Shared materials
    this._arrowMat = new THREE.MeshBasicMaterial({ color: 0xddaa66 });
    this._bulletMat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    this._rockMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.9 });

    this._unsubSpawn = EventBus.on('projectile:spawn', e => this._onSpawn(e));
    this._unsubImpact = EventBus.on('projectile:impact', e => this._onImpact(e));
  }

  _onSpawn(e) {
    const attacker = this.world.getEntity(e.attackerId);
    if (!attacker) return;
    const at = attacker.get('transform');
    if (!at) return;

    // Choose mesh type based on projectile speed
    let geo, mat, scale;
    if (e.projectileArc > 0) {
      // Catapult rock
      geo = this._rockGeo; mat = this._rockMat; scale = 1.2;
    } else if (e.projectileSpeed >= 50) {
      // Musketeer bullet
      geo = this._bulletGeo; mat = this._bulletMat; scale = 0.8;
    } else {
      // Archer arrow
      geo = this._arrowGeo; mat = this._arrowMat; scale = 1.0;
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(at.x, 0.8, at.z);
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);

    this.active.push({
      mesh,
      targetId: e.targetId,
      attackerId: e.attackerId,
      age: 0,
      maxAge: 5,
      arc: e.projectileArc || 0,
      startX: at.x,
      startZ: at.z,
      baseY: 0.8,
    });
  }

  _onImpact(e) {
    // Remove projectiles near impact point (oldest matching target)
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      const dx = p.mesh.position.x - e.x;
      const dz = p.mesh.position.z - e.z;
      if (Math.sqrt(dx * dx + dz * dz) < 3) {
        this.scene.remove(p.mesh);
        this.active.splice(i, 1);
        return;  // remove one per impact
      }
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.age += dt;

      // Despawn after max age
      if (p.age > p.maxAge) {
        this.scene.remove(p.mesh);
        this.active.splice(i, 1);
        continue;
      }

      // Get target current position
      const target = this.world.getEntity(p.targetId);
      if (!target || !target.alive) {
        // Target gone — let it fly a bit more then remove
        if (p.age > 1) {
          this.scene.remove(p.mesh);
          this.active.splice(i, 1);
        }
        continue;
      }

      const tt = target.get('transform');
      if (!tt) continue;

      // Lerp position toward target
      p.mesh.position.x += (tt.x - p.mesh.position.x) * Math.min(1, dt * 15);
      p.mesh.position.z += (tt.z - p.mesh.position.z) * Math.min(1, dt * 15);

      // Arc trajectory for catapults
      if (p.arc > 0) {
        const progress = p.age / Math.max(0.5, p.age + 0.5);
        p.mesh.position.y = p.baseY + Math.sin(progress * Math.PI) * p.arc;
      } else {
        p.mesh.position.y += (0.8 - p.mesh.position.y) * Math.min(1, dt * 10);
      }

      // Rotate arrow to face direction of travel
      p.mesh.lookAt(tt.x, p.mesh.position.y, tt.z);
    }
  }

  clear() {
    for (const p of this.active) this.scene.remove(p.mesh);
    this.active = [];
  }

  dispose() {
    this.clear();
    this._unsubSpawn();
    this._unsubImpact();
  }
}
