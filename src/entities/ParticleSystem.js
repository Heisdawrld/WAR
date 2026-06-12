import * as THREE from 'three';

const MAX_PARTICLES = 3000;
const GRAVITY = -15;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.pool = [];

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.alphas = new Float32Array(MAX_PARTICLES);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  emit(position, config) {
    const count = config.count || 5;
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * (config.spread || 3),
        Math.random() * (config.upForce || 3) + 1,
        (Math.random() - 0.5) * (config.spread || 3)
      );

      const r = (config.colorR || 1) + (Math.random() - 0.5) * 0.2;
      const g = (config.colorG || 0.2) + (Math.random() - 0.5) * 0.1;
      const b = (config.colorB || 0.1) + (Math.random() - 0.5) * 0.1;

      this.particles.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        )),
        velocity: vel,
        life: config.life || 1.0,
        maxLife: config.life || 1.0,
        r, g, b,
        size: config.size || 0.3,
        gravity: config.gravity !== undefined ? config.gravity : GRAVITY
      });
    }
  }

  blood(position) {
    this.emit(position, {
      count: 8,
      colorR: 0.8, colorG: 0.1, colorB: 0.05,
      spread: 2, upForce: 2,
      life: 0.6, size: 0.25
    });
  }

  dust(position) {
    this.emit(position, {
      count: 4,
      colorR: 0.5, colorG: 0.45, colorB: 0.3,
      spread: 1.5, upForce: 1,
      life: 1.0, size: 0.4, gravity: -2
    });
  }

  impact(position) {
    this.emit(position, {
      count: 3,
      colorR: 0.9, colorG: 0.7, colorB: 0.3,
      spread: 1, upForce: 3,
      life: 0.4, size: 0.2
    });
  }

  explosion(position) {
    this.emit(position, {
      count: 20,
      colorR: 1.0, colorG: 0.5, colorB: 0.1,
      spread: 6, upForce: 5,
      life: 1.2, size: 0.5
    });
    this.emit(position, {
      count: 10,
      colorR: 0.3, colorG: 0.3, colorB: 0.3,
      spread: 4, upForce: 2,
      life: 2.0, size: 0.6, gravity: -1
    });
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y += p.gravity * delta;
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;
    }

    this.updateBuffers();
  }

  updateBuffers() {
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.colors[i * 3] = p.r;
      this.colors[i * 3 + 1] = p.g;
      this.colors[i * 3 + 2] = p.b;
      this.sizes[i] = p.size * (p.life / p.maxLife);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }

  clear() {
    this.particles = [];
    this.updateBuffers();
  }
}
