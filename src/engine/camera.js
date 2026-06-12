import * as THREE from 'three';

export class GameCamera {
  constructor(renderer) {
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 1000);
    this.camera.position.set(0, 40, 60);
    this.camera.lookAt(0, 0, 0);

    this.target = new THREE.Vector3(0, 0, 0);
    this.orbitAngle = 0;
    this.orbitDistance = 70;
    this.orbitHeight = 40;
    this.minDistance = 20;
    this.maxDistance = 200;
    this.minHeight = 10;
    this.maxHeight = 100;
    this.followTarget = null;
    this.mode = 'orbit';

    this.isDragging = false;
    this.lastTouch = { x: 0, y: 0 };
    this.pinchStart = 0;
    this.zoomSpeed = 0;

    this.setupInput();
    this.updateCamera();
  }

  setupInput() {
    const el = document.getElementById('game-canvas');

    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' && e.isPrimary) {
        this.isDragging = true;
        this.lastTouch.x = e.clientX;
        this.lastTouch.y = e.clientY;
      }
    });

    el.addEventListener('pointermove', e => {
      if (!this.isDragging || !e.isPrimary) return;
      const dx = e.clientX - this.lastTouch.x;
      const dy = e.clientY - this.lastTouch.y;
      this.lastTouch.x = e.clientX;
      this.lastTouch.y = e.clientY;
      this.orbitAngle -= dx * 0.005;
      this.orbitHeight = THREE.MathUtils.clamp(
        this.orbitHeight + dy * 0.1,
        this.minHeight, this.maxHeight
      );
      this.updateCamera();
    });

    el.addEventListener('pointerup', () => { this.isDragging = false; });
    el.addEventListener('pointercancel', () => { this.isDragging = false; });

    el.addEventListener('wheel', e => {
      e.preventDefault();
      this.orbitDistance = THREE.MathUtils.clamp(
        this.orbitDistance + e.deltaY * 0.05,
        this.minDistance, this.maxDistance
      );
      this.updateCamera();
    }, { passive: false });

    let touches = [];
    el.addEventListener('touchstart', e => {
      touches = Array.from(e.touches);
      if (touches.length === 2) {
        const dx = touches[1].clientX - touches[0].clientX;
        const dy = touches[1].clientY - touches[0].clientY;
        this.pinchStart = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    el.addEventListener('touchmove', e => {
      const t = Array.from(e.touches);
      if (t.length === 2) {
        const dx = t[1].clientX - t[0].clientX;
        const dy = t[1].clientY - t[0].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = this.pinchStart - dist;
        this.orbitDistance = THREE.MathUtils.clamp(
          this.orbitDistance + delta * 0.15,
          this.minDistance, this.maxDistance
        );
        this.pinchStart = dist;
        this.updateCamera();
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  follow(unit) {
    this.followTarget = unit;
    this.mode = 'follow';
  }

  unfollow() {
    this.followTarget = null;
    this.mode = 'orbit';
  }

  setTopDown() {
    this.mode = 'topdown';
    this.updateCamera();
  }

  updateCamera() {
    if (this.mode === 'follow' && this.followTarget) {
      const pos = this.followTarget.position;
      const dir = this.followTarget.velocity || new THREE.Vector3();
      const angle = Math.atan2(dir.x, dir.z);
      this.camera.position.set(
        pos.x + Math.sin(angle + Math.PI) * 15,
        pos.y + 20,
        pos.z + Math.cos(angle + Math.PI) * 15
      );
      this.camera.lookAt(pos.x, pos.y + 3, pos.z);
      return;
    }

    if (this.mode === 'topdown') {
      this.camera.position.set(this.target.x, 120, this.target.z + 1);
      this.camera.lookAt(this.target.x, 0, this.target.z);
      return;
    }

    const x = this.target.x + Math.sin(this.orbitAngle) * this.orbitDistance;
    const z = this.target.z + Math.cos(this.orbitAngle) * this.orbitDistance;
    this.camera.position.set(x, this.orbitHeight, z);
    this.camera.lookAt(this.target.x, this.target.y, this.target.z);
  }

  update(delta) {
    if (this.followTarget) {
      this.updateCamera();
    }
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  getCamera() { return this.camera; }
}
