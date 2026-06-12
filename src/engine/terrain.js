import * as THREE from 'three';
import { getTier } from './renderer.js';

export class Terrain {
  constructor(scene, size = 200) {
    this.scene = scene;
    this.size = size;
    this.segments = getTier() === 'low' ? 64 : 128;
    this.mesh = null;
    this.heightData = null;
    this.grassMesh = null;
    this.build();
  }

  build() {
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    this.heightData = new Float32Array((this.segments + 1) * (this.segments + 1));
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.getHeight(x, z);
      pos.setY(i, h);
      this.heightData[i] = h;
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    this.addTrees();
    this.addRocks();
    this.addGrass();
  }

  getHeight(x, z) {
    let h = 0;
    h += Math.sin(x * 0.02) * 3;
    h += Math.cos(z * 0.03) * 2;
    h += Math.sin(x * 0.05 + z * 0.04) * 1.5;
    h += Math.sin(x * 0.1) * Math.cos(z * 0.08) * 0.8;
    const distFromCenter = Math.sqrt(x * x + z * z) / (this.size * 0.5);
    if (distFromCenter > 0.8) {
      h += (distFromCenter - 0.8) * 15;
    }
    return h;
  }

  getHeightAt(x, z) {
    const gridX = ((x + this.size / 2) / this.size) * this.segments;
    const gridZ = ((z + this.size / 2) / this.size) * this.segments;
    const ix = Math.floor(gridX);
    const iz = Math.floor(gridZ);
    if (ix < 0 || ix >= this.segments || iz < 0 || iz >= this.segments) return 0;
    const fx = gridX - ix;
    const fz = gridZ - iz;
    const i00 = iz * (this.segments + 1) + ix;
    const i10 = i00 + 1;
    const i01 = i00 + (this.segments + 1);
    const i11 = i01 + 1;
    const h00 = this.heightData[i00] || 0;
    const h10 = this.heightData[i10] || 0;
    const h01 = this.heightData[i01] || 0;
    const h11 = this.heightData[i11] || 0;
    return (h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz);
  }

  addTrees() {
    const treeGeo = new THREE.ConeGeometry(2, 6, 6);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.8 });
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });

    const treeCount = getTier() === 'low' ? 40 : 100;
    for (let i = 0; i < treeCount; i++) {
      const x = (Math.random() - 0.5) * this.size * 0.85;
      const z = (Math.random() - 0.5) * this.size * 0.85;
      const h = this.getHeightAt(x, z);
      if (h > 4 || Math.abs(x) < 15 && Math.abs(z) < 15) continue;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, h + 1, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      const leaves = new THREE.Mesh(treeGeo, treeMat);
      leaves.position.set(x, h + 5, z);
      leaves.scale.setScalar(0.8 + Math.random() * 0.6);
      leaves.castShadow = true;
      this.scene.add(leaves);
    }
  }

  addRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.95, flatShading: true });

    const rockCount = getTier() === 'low' ? 30 : 60;
    for (let i = 0; i < rockCount; i++) {
      const x = (Math.random() - 0.5) * this.size * 0.9;
      const z = (Math.random() - 0.5) * this.size * 0.9;
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
      const h = this.getHeightAt(x, z);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, h + 0.3, z);
      rock.scale.setScalar(0.5 + Math.random() * 1.5);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      this.scene.add(rock);
    }
  }

  addGrass() {
    if (getTier() === 'low') return;
    const count = 2000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * this.size * 0.8;
      const z = (Math.random() - 0.5) * this.size * 0.8;
      const h = this.getHeightAt(x, z);
      if (h > 5) continue;
      positions[i * 3] = x;
      positions[i * 3 + 1] = h + 0.2;
      positions[i * 3 + 2] = z;
      const g = 0.25 + Math.random() * 0.15;
      colors[i * 3] = g * 0.6;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = g * 0.3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });

    this.grassMesh = new THREE.Points(geo, mat);
    this.scene.add(this.grassMesh);
  }

  getMesh() { return this.mesh; }
}
