import * as THREE from 'three';
import { createRenderer, getTier } from './engine/renderer.js';
import { GameCamera } from './engine/camera.js';
import { Terrain } from './engine/terrain.js';
import { createLighting } from './engine/lighting.js';
import { PostProcessing } from './engine/postprocessing.js';
import { UnitManager } from './entities/UnitManager.js';
import { ProjectileSystem } from './entities/Projectile.js';
import { ParticleSystem } from './entities/ParticleSystem.js';
import { BehaviorTree } from './ai/BehaviorTree.js';
import { Formation } from './ai/Formation.js';
import { UNIT_TYPES, FORMATION_TYPES } from './entities/UnitTypes.js';
import { GameUI } from './ui/GameUI.js';
import { Minimap } from './ui/Minimap.js';
import { AudioEngine } from './audio/AudioEngine.js';

class Game {
  constructor() {
    this.ui = new GameUI();
    this.audio = new AudioEngine();
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.state = 'splash';
    this.selectedUnitType = 'swordsman';
    this.activeSide = 'red';
    this.selectedFormation = 'line';
    this.battleTime = 0;
    this.battleSpeed = 1;
    this.redFormations = {};
    this.blueFormations = {};
    this.lastProjectileSpawn = 0;

    this.redUnits = [];
    this.blueUnits = [];

    this.init();
  }

  async init() {
    this.ui.setLoaderProgress(10);

    const canvas = document.getElementById('game-canvas');
    this.renderer = createRenderer(canvas);
    this.ui.setLoaderProgress(20);

    this.camera = new GameCamera(this.renderer);
    this.ui.setLoaderProgress(30);

    this.lighting = createLighting(this.scene);
    this.ui.setLoaderProgress(40);

    this.terrain = new Terrain(this.scene);
    this.ui.setLoaderProgress(60);

    this.unitManager = new UnitManager(this.scene, this.terrain);
    this.projectiles = new ProjectileSystem(this.scene, this.terrain);
    this.projectiles.setUnitManager(this.unitManager);
    this.particles = new ParticleSystem(this.scene);
    this.behavior = new BehaviorTree(this.unitManager, this.terrain);
    this.behavior.setParticles(this.particles);
    this.formation = new Formation();
    this.ui.setLoaderProgress(75);

    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera.getCamera());
    this.ui.setLoaderProgress(85);

    this.minimap = new Minimap(
      document.getElementById('minimap-canvas'),
      this.terrain,
      this.unitManager
    );

    this.buildUnitCarousel();
    this.buildFormationTools();
    this.setupEvents();
    this.ui.setLoaderProgress(100);

    await this.delay(800);
    this.ui.showScreen('main-menu');
    this.state = 'menu';

    this.animate();
  }

  buildUnitCarousel() {
    const container = this.ui.elements.unitCarousel;
    if (!container) return;
    container.innerHTML = '';

    for (const [id, type] of Object.entries(UNIT_TYPES)) {
      const card = document.createElement('div');
      card.className = `unit-card${id === this.selectedUnitType ? ' selected' : ''}`;
      card.dataset.type = id;
      card.innerHTML = `<span class="unit-icon">${type.icon}</span><span class="unit-name">${type.name}</span>`;
      card.addEventListener('click', () => {
        container.querySelectorAll('.unit-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedUnitType = id;
      });
      container.appendChild(card);
    }
  }

  buildFormationTools() {
    const container = this.ui.elements.formationTools;
    if (!container) return;
    container.innerHTML = '';

    for (const [id, type] of Object.entries(FORMATION_TYPES)) {
      const btn = document.createElement('div');
      btn.className = `formation-btn${id === this.selectedFormation ? ' selected' : ''}`;
      btn.dataset.formation = id;
      btn.innerHTML = `<span class="f-icon">${type.icon}</span>`;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedFormation = id;
        this.formation.setType(id);
      });
      container.appendChild(btn);
    }
  }

  setupEvents() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (el) this.handleAction(el.dataset.action);
      });
    });

    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.target.closest('[data-speed]');
        if (!el) return;
        this.battleSpeed = parseFloat(el.dataset.speed);
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
      });
    });

    const sideToggle = document.getElementById('side-toggle');
    if (sideToggle) {
      sideToggle.addEventListener('click', () => {
        this.activeSide = this.activeSide === 'red' ? 'blue' : 'red';
        this.ui.setActiveSide(this.activeSide);
      });
    }

    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('pointerdown', (e) => {
      if (this.state === 'army-builder') {
        this.placeUnitOnTerrain(e);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.state === 'army-builder' && e.buttons === 1) {
        this.placeUnitOnTerrain(e);
      }
    });

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.resize(window.innerWidth, window.innerHeight);
      if (this.postProcessing) this.postProcessing.resize(window.innerWidth, window.innerHeight);
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  placeUnitOnTerrain(e) {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera.getCamera());

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);

    if (!intersect) return;
    if (Math.abs(intersect.x) > 85 || Math.abs(intersect.z) > 85) return;

    const sideCount = this.unitManager.getAliveCount(this.activeSide);
    if (sideCount >= 250) return;

    this.unitManager.addUnit(this.selectedUnitType, intersect, this.activeSide);
    this.audio.playSfx('place');
    this.ui.updateUnitCount(this.unitManager.getAliveCount(this.activeSide), 250);
  }

  handleAction(action) {
    this.audio.playSfx('click');
    switch (action) {
      case 'quick-battle':
      case 'sandbox':
        try { this.audio.init(); this.audio.resume(); } catch(e) {}
        this.startArmyBuilder();
        break;
      case 'start-battle':
        this.startBattle();
        break;
      case 'clear-units':
        this.unitManager.clearAll();
        this.redUnits = [];
        this.blueUnits = [];
        this.ui.updateUnitCount(0, 250);
        break;
      case 'reset-battle':
        this.resetBattle();
        break;
      case 'end-battle':
        this.endBattle();
        break;
      case 'rematch':
        this.startArmyBuilder();
        break;
      case 'menu':
        this.ui.showScreen('main-menu');
        this.state = 'menu';
        break;
    }
  }

  startArmyBuilder() {
    this.unitManager.clearAll();
    this.redUnits = [];
    this.blueUnits = [];
    this.activeSide = 'red';
    this.ui.setActiveSide('red');
    this.ui.updateUnitCount(0, 250);
    this.ui.showScreen('army-builder');
    this.state = 'army-builder';
  }

  startBattle() {
    const redCount = this.unitManager.getAliveCount('red');
    const blueCount = this.unitManager.getAliveCount('blue');

    if (redCount === 0 && blueCount === 0) return;

    this.redUnits = this.unitManager.getUnitsBySide('red');
    this.blueUnits = this.unitManager.getUnitsBySide('blue');

    this.assignFormations('red', this.redUnits);
    this.assignFormations('blue', this.blueUnits);

    this.battleTime = 0;
    this.audio.playSfx('fight');
    this.ui.showScreen('battle');
    this.state = 'battle';
    this.ui.updateBattleHUD(this.unitManager.getStats());
  }

  assignFormations(side, units) {
    const center = new THREE.Vector3(side === 'red' ? -30 : 30, 0, 0);
    this.formation.setType(this.selectedFormation);
    const positions = this.formation.getPositions(units.length, center, side);

    for (let i = 0; i < units.length; i++) {
      if (positions[i]) {
        const h = this.terrain.getHeightAt(positions[i].x, positions[i].z);
        units[i].position.set(positions[i].x, h, positions[i].z);
        units[i].rotation = side === 'red' ? 0 : Math.PI;
      }
    }
  }

  resetBattle() {
    this.startArmyBuilder();
  }

  endBattle() {
    const stats = this.unitManager.getStats();
    const winner = stats.redAlive > stats.blueAlive ? 'red' : 'blue';
    this.ui.showResults(winner, stats);
    this.state = 'results';
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.05);

    if (this.state === 'battle') {
      const battleDelta = delta * this.battleSpeed;
      this.battleTime += battleDelta;

      this.behavior.update(battleDelta);
      this.unitManager.update(battleDelta, this.battleTime);
      this.projectiles.update(battleDelta);
      this.particles.update(battleDelta);
      this.handleCombat(battleDelta);

      const stats = this.unitManager.getStats();
      this.ui.updateBattleHUD(stats);
      this.ui.updateTimer(this.battleTime);

      if (stats.redAlive === 0 || stats.blueAlive === 0) {
        const winner = stats.redAlive > 0 ? 'red' : 'blue';
        this.audio.playSfx(winner === 'red' ? 'victory' : 'defeat');
        this.ui.showResults(winner, stats);
        this.state = 'results';
      }
    }

    this.unitManager.updateMeshes();
    this.camera.update(delta);
    this.minimap.render();

    if (this.postProcessing && this.postProcessing.enabled) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera.getCamera());
    }
  }

  handleCombat(delta) {
    const units = this.unitManager.getAliveUnits();
    for (const unit of units) {
      if (unit.attackCooldown > 0 || !unit.alive) continue;
      if (!unit.typeData.isRanged) continue;

      const enemy = this.unitManager.findNearestEnemyInRange(unit);
      if (!enemy) continue;

      const dist = unit.position.distanceTo(enemy.position);
      if (dist <= unit.typeData.range) {
        this.projectiles.spawn(unit, enemy, unit.typeData.damage);
        unit.attackCooldown = 1 / unit.typeData.attackSpeed;
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const game = new Game();
