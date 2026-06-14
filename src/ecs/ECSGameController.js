/**
 * ECSGameController — Drives ECS systems during battle.
 *
 * Replaces the monolith BehaviorTree + handleCombat with the ECS pipeline:
 *   AISystem → ProjectileSystem → CombatSystem → CleanupSystem
 *
 * The ECS is the source of truth; ECSUnitManager.syncFromECS() copies
 * results back to rendering proxies after each update.
 */
import { AISystem } from '../systems/AISystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CleanupSystem } from '../systems/CleanupSystem.js';
import { EventBus } from '../core/EventBus.js';

export class ECSGameController {
  constructor(unitManager, particles = null) {
    this.unitManager = unitManager;
    this.world = unitManager.world;
    this.particles = particles;

    // Create ECS systems (do NOT use Engine RAF — main.js drives the loop)
    this.ai = new AISystem(this.world);
    this.projectiles = new ProjectileSystem(this.world);
    this.combat = new CombatSystem(this.world);
    this.cleanup = new CleanupSystem(this.world);

    // Hook ECS events to visual particle system (if provided)
    this._unsubs = [];
    if (particles) {
      this._unsubs.push(
        EventBus.on('combat:kill', (e) => {
          const entity = this.world.getEntity(e.targetId);
          if (!entity) return;
          const tx = entity.get('transform');
          if (tx && particles.dust) {
            particles.dust({ x: tx.x, y: tx.y + 0.5, z: tx.z });
          }
        }),
        EventBus.on('combat:damage:dealt', (e) => {
          const entity = this.world.getEntity(e.targetId);
          if (!entity) return;
          const tx = entity.get('transform');
          if (tx && particles.blood && e.damage > 0) {
            particles.blood({ x: tx.x, y: tx.y + 0.8, z: tx.z });
          }
        }),
        EventBus.on('projectile:impact', (e) => {
          if (particles.explosion) {
            particles.explosion({ x: e.x, y: e.y, z: e.z });
          }
        }),
      );
    }
  }

  /** Clear in-flight projectiles and death timers between battles. */
  reset() {
    this.projectiles.projectiles.length = 0;
    this.cleanup.clear();
  }

  setParticles(particles) {
    this.particles = particles;
  }

  /**
   * Run one ECS update tick. Call from main.js animate() loop.
   * After this, call unitManager.syncFromECS() to update rendering.
   */
  update(dt) {
    this.ai.update(dt);
    this.projectiles.update(dt);
    this.combat.update(dt);
    this.cleanup.lateUpdate(dt);
    this.unitManager.syncFromECS();
  }

  dispose() {
    for (const fn of this._unsubs) fn();
    this.ai?.dispose?.();
    this.projectiles?.dispose?.();
    this.combat?.dispose?.();
    this.cleanup?.dispose?.();
  }
}
