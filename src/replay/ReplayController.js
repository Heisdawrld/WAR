import { World } from '../ecs/World.js';
import { UnitFactory } from '../ecs/UnitFactory.js';
import { AISystem } from '../systems/AISystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { CleanupSystem } from '../systems/CleanupSystem.js';
import { SeedRandom } from '../utils/SeedRandom.js';

export class ReplayController {
  static create(setup) {
    const world = new World();
    const factory = new UnitFactory(world);
    const rng = new SeedRandom(setup.seed);
    const ai = new AISystem(world);
    ai.setRng(rng);
    const projectiles = new ProjectileSystem(world);
    const combat = new CombatSystem(world);
    const cleanup = new CleanupSystem(world);

    for (const unit of setup.units) {
      factory.spawn(unit.type, unit.x, 0, unit.z, unit.side === 'red');
    }

    return { world, factory, ai, projectiles, combat, cleanup, rng };
  }

  static step(bundle, dt) {
    const { world, ai, projectiles, combat, cleanup } = bundle;
    ai.update(dt);
    projectiles.update(dt);
    combat.update(dt);
    cleanup.lateUpdate(dt);

    let redAlive = 0, blueAlive = 0;
    for (const e of world.query('team', 'health')) {
      const t = e.get('team'), h = e.get('health');
      if (h.alive) {
        if (t.side === 'red') redAlive++;
        else blueAlive++;
      }
    }

    let winner = null;
    if (redAlive === 0 || blueAlive === 0) {
      winner = redAlive > 0 ? 'red' : (blueAlive > 0 ? 'blue' : 'draw');
    }

    return { redAlive, blueAlive, winner };
  }
}
