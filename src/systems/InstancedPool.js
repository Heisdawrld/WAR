import * as THREE from 'three';
export class InstancedPool {
  constructor(scene, typeId, baseColor, capacity = 500) {
    this.scene = scene; this.typeId = typeId; this.baseColor = baseColor; this.capacity = capacity;
    this.slotMap = new Map(); this.slots = [];
    this.group = new THREE.Group(); this.group.name = `pool-${typeId}`;
    this._dummy = new THREE.Object3D(); this._color = new THREE.Color();
    this._buildMeshes(capacity); this.scene.add(this.group);
  }
  _buildMeshes(count) {
    const geo = { body: new THREE.CylinderGeometry(0.3, 0.4, 1.2, 6), head: new THREE.SphereGeometry(0.25, 6, 4), base: new THREE.CylinderGeometry(0.5, 0.5, 0.15, 8) };
    const mat = new THREE.MeshStandardMaterial({ color: this.baseColor, roughness: 0.7, metalness: 0.1 });
    this.meshes = {};
    for (const part of ['body', 'head', 'base']) {
      const mesh = new THREE.InstancedMesh(geo[part], mat, count);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(mesh); this.meshes[part] = mesh;
    }
  }
  updateInstance(entityId, data) {
    let idx = this.slotMap.get(entityId);
    if (idx === undefined) {
      for (let i = 0; i < this.slots.length; i++) { if (this.slots[i].entityId === null) { idx = i; this.slots[i].entityId = entityId; break; } }
      if (idx === undefined) { idx = this.slots.length; this.slots.push({ entityId, alive: true }); }
      this.slotMap.set(entityId, idx);
      if (idx >= this.capacity) this._grow();
    }
    const slot = this.slots[idx]; slot.alive = data.alive !== false;
    if (!slot.alive) {
      this._dummy.position.set(data.position.x, -100, data.position.z);
      this._dummy.scale.set(0, 0, 0); this._dummy.rotation.set(0, 0, 0);
    } else {
      this._dummy.position.set(data.position.x, data.position.y + 0.6 * data.scale, data.position.z);
      this._dummy.scale.set(data.scale, data.scale, data.scale);
      this._dummy.rotation.set(0, data.rotation, 0);
    }
    this._dummy.updateMatrix();
    for (const part of ['body', 'head', 'base']) this.meshes[part].setMatrixAt(idx, this._dummy.matrix);
    this._color.setHex(data.color ?? this.baseColor);
    this.meshes.body.setColorAt(idx, this._color);
  }
  removeInstance(entityId) {
    const idx = this.slotMap.get(entityId);
    if (idx === undefined) return;
    this.slots[idx].entityId = null; this.slots[idx].alive = false; this.slotMap.delete(entityId);
  }
  syncBuffers() {
    for (const part of ['body', 'head', 'base']) { this.meshes[part].instanceMatrix.needsUpdate = true; }
  }
  _grow() {
    const nc = this.capacity * 2;
    for (const part of ['body', 'head', 'base']) {
      const old = this.meshes[part];
      const m = new THREE.InstancedMesh(old.geometry, old.material, nc);
      m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < this.capacity; i++) { const mat = new THREE.Matrix4(); old.getMatrixAt(i, mat); m.setMatrixAt(i, mat); }
      m.instanceMatrix.needsUpdate = true;
      this.group.remove(old); this.group.add(m); this.meshes[part] = m;
    }
    this.capacity = nc;
  }
  get activeCount() { return this.slotMap.size; }
  dispose() {
    this.scene.remove(this.group);
    for (const part of ['body', 'head', 'base']) { this.meshes[part].geometry.dispose(); this.meshes[part].material.dispose(); }
    this.slotMap.clear(); this.slots.length = 0;
  }
}
