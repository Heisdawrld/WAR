import * as THREE from 'three';
import { UNIT_TYPES } from './UnitTypes.js';

const MAX_UNITS = 500;
const dummy = new THREE.Object3D();
const color = new THREE.Color();

export class UnitManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.units = [];
    this.meshes = {};
    this.geometryPool = {};

    this.geometryPool.body = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 6);
    this.geometryPool.head = new THREE.SphereGeometry(0.25, 6, 4);
    this.geometryPool.weapon = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    this.geometryPool.base = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8);

    this.createInstancedMeshes();
  }

  createInstancedMeshes() {
    for (const [typeId, typeData] of Object.entries(UNIT_TYPES)) {
      const group = new THREE.Group();

      const bodyGeo = this.geometryPool.body;
      const bodyMat = new THREE.MeshStandardMaterial({
        color: typeData.color,
        roughness: 0.7,
        metalness: 0.1
      });
      const bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, MAX_UNITS / 2);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(bodyMesh);

      const headGeo = this.geometryPool.head;
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xddccaa,
        roughness: 0.6,
        metalness: 0.0
      });
      const headMesh = new THREE.InstancedMesh(headGeo, headMat, MAX_UNITS / 2);
      headMesh.castShadow = true;
      headMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(headMesh);

      const baseGeo = this.geometryPool.base;
      const baseMat = new THREE.MeshStandardMaterial({
        color: typeData.color,
        roughness: 0.5,
        metalness: 0.3
      });
      const baseMesh = new THREE.InstancedMesh(baseGeo, baseMat, MAX_UNITS / 2);
      baseMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(baseMesh);

      this.scene.add(group);
      this.meshes[typeId] = { group, body: bodyMesh, head: headMesh, base: baseMesh, count: 0 };
    }
  }

  addUnit(typeId, position, side) {
    const typeData = UNIT_TYPES[typeId];
    if (!typeData) return null;

    const unit = {
      id: Math.random().toString(36).substr(2, 9),
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
      meshIndex: -1,
      rotation: side === 'red' ? 0 : Math.PI
    };

    unit.meshIndex = this.meshes[typeId].count;
    this.meshes[typeId].count++;
    this.units.push(unit);
    return unit;
  }

  removeUnit(unit) {
    if (!unit.alive) return;
    unit.alive = false;
    unit.hp = 0;
  }

  clearAll() {
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
    const total = alive.reduce((sum, u) => sum + (u.hp / u.maxHp), 0);
    return total / alive.length;
  }

  findNearestEnemy(unit) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const other of this.units) {
      if (!other.alive || other.side === unit.side) continue;
      const dist = unit.position.distanceTo(other.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  findNearestEnemyInRange(unit) {
    const enemy = this.findNearestEnemy(unit);
    if (!enemy) return null;
    const dist = unit.position.distanceTo(enemy.position);
    if (dist <= unit.typeData.range + 2) return enemy;
    return null;
  }

  update(delta, battleTime) {
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.attackCooldown = Math.max(0, unit.attackCooldown - delta);
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

        if (unit.side === 'red') {
          color.setHex(0xff3333);
        } else {
          color.setHex(0x3366ff);
        }
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
    const redAlive = this.getAliveCount('red');
    const blueAlive = this.getAliveCount('blue');
    const redTotal = this.units.filter(u => u.side === 'red').length;
    const blueTotal = this.units.filter(u => u.side === 'blue').length;
    return { redAlive, blueAlive, redTotal, blueTotal };
  }
}
