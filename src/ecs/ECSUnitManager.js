/**
 * ECSUnitManager — Drop-in replacement for UnitManager that runs on ECS.
 *
 * Strategy: ECS entities are the SOURCE OF TRUTH for game logic (AI, combat,
 * health). Legacy unit objects are kept as thin rendering/UI proxies that
 * get synced from ECS state every frame via syncFromECS().
 *
 * This lets us swap the game LOGIC to ECS while keeping the existing
 * rendering (InstancedMesh), UI queries, Formation, and Minimap unchanged.
 */
import * as THREE from 'three';
import { UNIT_TYPES } from '../entities/UnitTypes.js';
import { World } from './World.js';
import { UnitFactory } from './UnitFactory.js';
import { EventBus } from '../core/EventBus.js';

const MAX_UNITS = 500;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

export class ECSUnitManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    // ECS — source of truth for game logic
    this.world = new World();
    this.factory = new UnitFactory(this.world);

    // Legacy units — rendering/UI proxies (synced from ECS each frame)
    this.units = [];
    this.meshes = {};

    this.geometryPool = {
      body: new THREE.CylinderGeometry(0.3, 0.4, 1.2, 6),
      head: new THREE.SphereGeometry(0.25, 6, 4),
      weapon: new THREE.BoxGeometry(0.1, 0.8, 0.1),
      base: new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8),
    };

    this._createInstancedMeshes();
  }

  _createInstancedMeshes() {
    for (const [typeId, typeData] of Object.entries(UNIT_TYPES)) {
      const group = new THREE.Group();

      const bodyMat = new THREE.MeshStandardMaterial({ color: typeData.color, roughness: 0.7, metalness: 0.1 });
      const bodyMesh = new THREE.InstancedMesh(this.geometryPool.body, bodyMat, MAX_UNITS);
      bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
      bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(bodyMesh);

      const headMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, roughness: 0.6, metalness: 0.0 });
      const headMesh = new THREE.InstancedMesh(this.geometryPool.head, headMat, MAX_UNITS);
      headMesh.castShadow = true;
      headMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(headMesh);

      const baseMat = new THREE.MeshStandardMaterial({ color: typeData.color, roughness: 0.5, metalness: 0.3 });
      const baseMesh = new THREE.InstancedMesh(this.geometryPool.base, baseMat, MAX_UNITS);
      baseMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(baseMesh);

      this.scene.add(group);
      this.meshes[typeId] = { group, body: bodyMesh, head: headMesh, base: baseMesh, count: 0 };
    }
  }

  /**
   * Create an ECS entity AND a legacy unit proxy.
   * ECS entity holds the real game state; unit proxy is for rendering/UI.
   */
  addUnit(typeId, position, side) {
    const typeData = UNIT_TYPES[typeId];
    if (!typeData) return null;

    // Create ECS entity (source of truth)
    const entity = this.factory.spawn(typeId, position.x, position.y, position.z, side === 'red');

    // Create legacy unit proxy (for rendering + UI compatibility)
    const unit = {
      id: entity.id,
      entityId: entity.id,
      type: typeId,
      typeData,
      side,
      position: new THREE.Vector3(position.x, position.y, position.z),
      velocity: new THREE.Vector3(),
      hp: typeData.hp,
      maxHp: typeData.hp,
      alive: true,
      state: 'idle',
      target: null,
      attackCooldown: 0,
      stateTimer: 0,
      meshIndex: this.meshes[typeId].count,
      rotation: side === 'red' ? 0 : Math.PI,
    };

    this.meshes[typeId].count++;
    this.units.push(unit);
    return unit;
  }

  /**
   * Push legacy unit positions/rotations INTO ECS entities.
   * Called after Formation assignment, before battle starts.
   */
  syncToECS() {
    for (const unit of this.units) {
      if (!unit.alive) continue;
      const entity = this.world.getEntity(unit.entityId);
      if (!entity) continue;
      const tx = entity.get('transform');
      if (tx) {
        tx.x = unit.position.x;
        tx.y = unit.position.y;
        tx.z = unit.position.z;
        tx.rotation = unit.rotation;
      }
    }
  }

  /**
   * Pull ECS entity state INTO legacy units for rendering.
   * Called every frame after ECS systems update.
   */
  syncFromECS() {
    for (const unit of this.units) {
      if (!unit.alive) continue;
      const entity = this.world.getEntity(unit.entityId);
      if (!entity || !entity.alive) { unit.alive = false; unit.hp = 0; continue; }

      const tx = entity.get('transform');
      const hp = entity.get('health');
      const ai = entity.get('aiState');

      if (tx) {
        unit.position.set(tx.x, tx.y, tx.z);
        unit.rotation = tx.rotation;
      }
      if (hp) {
        unit.hp = hp.hp;
        unit.alive = hp.alive;
      }
      if (ai && ai.blackboard) {
        unit.target = ai.blackboard.target || null;
      }
    }
  }

  removeUnit(unit) {
    if (!unit.alive) return;
    unit.alive = false;
    unit.hp = 0;
    this.world.destroyEntity(unit.entityId);
    this.world.flushDestroyed();
  }

  clearAll() {
    this.factory.clearAll();
    this.units = [];
    for (const key of Object.keys(this.meshes)) {
      this.meshes[key].count = 0;
    }
  }

  getUnitsBySide(side) {
    return this.units.filter(u => u.alive && u.side === side);
  }

  getAliveCount(side) {
    return this.units.filter(u => u.alive && u.side === side).length;
  }

  getArmyHP(side) {
    const alive = this.units.filter(u => u.alive && u.side === side);
    if (alive.length === 0) return 0;
    return alive.reduce((sum, u) => sum + (u.hp / u.maxHp), 0) / alive.length;
  }

  findNearestEnemy(unit) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const other of this.units) {
      if (!other.alive || other.side === unit.side) continue;
      const dist = unit.position.distanceTo(other.position);
      if (dist < nearestDist) { nearestDist = dist; nearest = other; }
    }
    return nearest;
  }

  findNearestEnemyInRange(unit) {
    const enemy = this.findNearestEnemy(unit);
    if (!enemy) return null;
    const dist = unit.position.distanceTo(enemy.position);
    return dist <= unit.typeData.range + 2 ? enemy : null;
  }

  update(delta, battleTime) {
    // Cooldowns are now managed by ECS Combat component (tickCooldown in Attack task).
    // Keep this for UI state timer compatibility.
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.stateTimer += delta;
    }
  }

  updateMeshes() {
    for (const [typeId, meshData] of Object.entries(this.meshes)) {
      const typeData = UNIT_TYPES[typeId];
      let idx = 0;

      for (const unit of this.units) {
        if (!unit.alive || unit.type !== typeId) continue;

        const scale = typeData.size;
        const h = this.terrain ? this.terrain.getHeightAt(unit.position.x, unit.position.z) : 0;
        const displayY = unit.position.y + h;

        dummy.position.set(unit.position.x, displayY + 0.6 * scale, unit.position.z);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set(0, unit.rotation, 0);
        dummy.updateMatrix();
        meshData.body.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(unit.position.x, displayY + 1.3 * scale, unit.position.z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        meshData.head.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(unit.position.x, displayY + 0.05, unit.position.z);
        dummy.scale.set(scale, 1, scale);
        dummy.updateMatrix();
        meshData.base.setMatrixAt(idx, dummy.matrix);

        color.setHex(unit.side === 'red' ? 0xff3333 : 0x3366ff);
        meshData.body.setColorAt(idx, color);
        idx++;
      }

      meshData.body.count = idx;
      meshData.head.count = idx;
      meshData.base.count = idx;
      meshData.body.instanceMatrix.needsUpdate = true;
      meshData.head.instanceMatrix.needsUpdate = true;
      meshData.base.instanceMatrix.needsUpdate = true;
      if (meshData.body.instanceColor) meshData.body.instanceColor.needsUpdate = true;
    }
  }

  getAliveUnits() {
    return this.units.filter(u => u.alive);
  }

  getStats() {
    return {
      redAlive: this.getAliveCount('red'),
      blueAlive: this.getAliveCount('blue'),
      redTotal: this.units.filter(u => u.side === 'red').length,
      blueTotal: this.units.filter(u => u.side === 'blue').length,
      redHp: this.getArmyHP('red'),
      blueHp: this.getArmyHP('blue'),
    };
  }

  getArmyComposition(side) {
    const comp = {};
    for (const u of this.units.filter(u => u.alive && u.side === side)) {
      const name = u.typeData.name;
      comp[name] = (comp[name] || 0) + 1;
    }
    return comp;
  }
}
