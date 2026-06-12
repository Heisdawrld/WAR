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
    this.lastProjectileSpawn = 0;

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

    await this.delay(1200);
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
      card.innerHTML = `
        <span class="unit-icon">${type.icon}</span>
        <span class="unit-name">${type.name}</span>
        <span class="unit-stats">${type.damage}dmg · ${type.hp}hp</span>
      `;
      card.addEventListener('click', () => {
        container.querySelectorAll('.unit-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedUnitType = id;
        this.audio.playSfx('click');
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
        this.audio.playSfx('click');
      });
      container.appendChild(btn);
    }
  }

  setupEvents() {
    // Action buttons — use closest() for reliable event delegation
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (el) this.handleAction(el.dataset.action);
      });
    });

    // Speed buttons
    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.target.closest('[data-speed]');
        if (!el) return;
        this.battleSpeed = parseFloat(el.dataset.speed);
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        this.audio.playSfx('click');
      });
    });

    // Side toggle
    const sideToggle = document.getElementById('side-toggle');
    if (sideToggle) {
      sideToggle.addEventListener('click', () => {
        this.activeSide = this.activeSide === 'red' ? 'blue' : 'red';
        this.ui.setActiveSide(this.activeSide);
        this.ui.updateUnitCount(this.unitManager.getAliveCount(this.activeSide), 250);
        this.audio.playSfx('click');
      });
    }

    // Quick fill button
    const quickFillBtn = document.getElementById('quick-fill-btn');
    if (quickFillBtn) {
      quickFillBtn.addEventListener('click', () => this.quickFill());
    }

    // Canvas — place units on terrain
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

    // Also listen on army-builder screen for tap-through to canvas
    const armyBuilderScreen = document.getElementById('army-builder');
    if (armyBuilderScreen) {
      armyBuilderScreen.addEventListener('pointerdown', (e) => {
        if (this.state !== 'army-builder') return;
        const inTop = e.target.closest('.builder-top');
        const inBottom = e.target.closest('.builder-bottom');
        if (!inTop && !inBottom) {
          this.placeUnitOnTerrain({ clientX: e.clientX, clientY: e.clientY, target: canvas });
          this._isPainting = true;
        }
      });
      armyBuilderScreen.addEventListener('pointermove', (e) => {
        if (this.state !== 'army-builder' || !this._isPainting) return;
        const inTop = e.target.closest('.builder-top');
        const inBottom = e.target.closest('.builder-bottom');
        if (!inTop && !inBottom) {
          this.placeUnitOnTerrain({ clientX: e.clientX, clientY: e.clientY, target: canvas });
        }
      });
      armyBuilderScreen.addEventListener('pointerup', () => { this._isPainting = false; });
      armyBuilderScreen.addEventListener('pointercancel', () => { this._isPainting = false; });
    }

    // Resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.resize(window.innerWidth, window.innerHeight);
      if (this.postProcessing) this.postProcessing.resize(window.innerWidth, window.innerHeight);
    });

    // Service worker
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
    this.ui.updateArmyPreview(this.unitManager.getArmyComposition(this.activeSide));
  }

  quickFill() {
    // Fill both armies quickly for testing
    this.unitManager.clearAll();

    const types = Object.keys(UNIT_TYPES);
    const redCenter = new THREE.Vector3(-30, 0, 0);
    const blueCenter = new THREE.Vector3(30, 0, 0);

    // Red army: 50 swordsmen, 30 archers, 20 knights
    this.fillArmy('red', [
      { type: 'swordsman', count: 50 },
      { type: 'archer', count: 30 },
      { type: 'knight', count: 20 }
    ], redCenter);

    // Blue army: 40 spearmen, 30 musketeers, 30 horsemen
    this.fillArmy('blue', [
      { type: 'spearman', count: 40 },
      { type: 'musketeer', count: 30 },
      { type: 'horseman', count: 30 }
    ], blueCenter);

    this.ui.updateUnitCount(this.unitManager.getAliveCount(this.activeSide), 250);
    this.ui.updateArmyPreview(this.unitManager.getArmyComposition(this.activeSide));
    this.audio.playSfx('place');
  }

  fillArmy(side, groups, center) {
    let offset = 0;
    for (const group of groups) {
      for (let i = 0; i < group.count; i++) {
        const angle = (offset / 100) * Math.PI * 2;
        const radius = 5 + (offset % 5) * 4;
        const pos = new THREE.Vector3(
          center.x + Math.cos(angle) * radius,
          0,
          center.z + Math.sin(angle) * radius
        );
        this.unitManager.addUnit(group.type, pos, side);
        offset++;
      }
    }
  }

  handleAction(action) {
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
        this.ui.updateUnitCount(0, 250);
        this.ui.updateArmyPreview({});
        this.ui.hideHint();
        this.audio.playSfx('click');
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
        this.audio.playSfx('click');
        break;
    }
  }

  startArmyBuilder() {
    this.unitManager.clearAll();
    this.activeSide = 'red';
    this.ui.setActiveSide('red');
    this.ui.updateUnitCount(0, 250);
    this.ui.updateArmyPreview({});
    this.ui.showScreen('army-builder');
    this.ui.showHint('Tap the battlefield to place units. Use the bottom panel to select unit types and formations.');
    this.state = 'army-builder';
  }

  startBattle() {
    const redCount = this.unitManager.getAliveCount('red');
    const blueCount = this.unitManager.getAliveCount('blue');

    if (redCount === 0 && blueCount === 0) {
      this.ui.showHint('⚠️ Place units on both sides before starting the battle! Tap the battlefield to deploy.');
      this.ui.shakeFightButton();
      this.audio.playSfx('hit');
      return;
    }

    if (redCount === 0 || blueCount === 0) {
      this.ui.showHint(`⚠️ ${redCount === 0 ? 'Red' : 'Blue'} army is empty! Switch sides and deploy units, or use Quick Fill.`);
      this.ui.shakeFightButton();
      this.audio.playSfx('hit');
      return;
    }

    this.assignFormations('red', this.unitManager.getUnitsBySide('red'));
    this.assignFormations('blue', this.unitManager.getUnitsBySide('blue'));

    this.battleTime = 0;
    this.ui.hideHint();
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
    this.audio.playSfx('click');
  }

  endBattle() {
    const stats = this.unitManager.getStats();
    const winner = stats.redAlive > stats.blueAlive ? 'red' : 'blue';
    this.audio.playSfx(winner === 'red' ? 'victory' : 'defeat');
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
