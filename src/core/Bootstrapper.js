import { World } from '../ecs/World.js';
import { Engine } from './Engine.js';
import { EventBus } from './EventBus.js';
import { SeedRandom } from '../utils/SeedRandom.js';
import { AISystem } from '../systems/AISystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CleanupSystem } from '../systems/CleanupSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { SpatialIndexSystem } from '../systems/SpatialIndexSystem.js';


export class Bootstrapper {
  constructor() { this.world = null; this.engine = null; this.rng = null; this.systems = []; }

  init(scene) {
    this.rng = new SeedRandom();
    this.world = new World();
    this.engine = new Engine();

    this._add(new SpatialIndexSystem(this.world), 'update', 50);
    this._add(new AISystem(this.world), 'update', 10);
    this._add(new ProjectileSystem(this.world), 'update', 18);
    this._add(new CombatSystem(this.world), 'update', 20);
    this._add(new RenderSystem(this.world, scene), 'render', 100);
    this._add(new CleanupSystem(this.world), 'lateUpdate', 0);

    EventBus.on('game:start', () => this.engine.start());
    EventBus.on('game:pause', () => this.engine.pause());
    EventBus.on('game:resume', () => this.engine.resume());
    EventBus.on('game:stop', () => this.engine.stop());
    EventBus.emit('boot:ready', { world: this.world, engine: this.engine });
  }

  _add(system, phase, priority) { this.systems.push(system); this.engine.addSystem(system, phase, priority); }

  dispose() {
    this.engine?.stop();
    for (const s of this.systems) { if (typeof s.dispose === 'function') s.dispose(); }
    this.world?.clear();
    EventBus.clear();
  }
}
