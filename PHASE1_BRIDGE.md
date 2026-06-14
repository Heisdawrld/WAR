# PHASE 1, STEP 1 — SPEC: The Bridge
> Architect: Arena.ai Agent | Implementer: MiMo Code Agent
> Goal: PROVE the ECS renders entities end-to-end, isolated from the monolith.

## Context
The ECS (World, Entity, RenderSystem, InstancedPool) is complete but has no spawn layer.
Nothing creates entities. This spec adds the missing piece and proves the whole pipeline.

## Deliverables

### 1. `src/ecs/UnitFactory.js` (NEW)
A factory that spawns a unit entity with ALL 6 components. Contract:
```js
import { Transform } from './components/Transform.js';
import { Health } from './components/Health.js';
import { Combat } from './components/Combat.js';
import { Team } from './components/Team.js';
import { UnitType } from './components/UnitType.js';
import { AIState } from './components/AIState.js';
import { UNIT_TYPES } from '../entities/UnitTypes.js';
import { EventBus } from '../core/EventBus.js';

export class UnitFactory {
  constructor(world) { this.world = world; }

  spawn(typeId, x, y, z, isRed, data = {}) {
    // Pull base stats from UNIT_TYPES[typeId] (damage, hp, range, speed, attackSpeed)
    // Create entity, add 6 components, mark dirty for RenderSystem
    // Return the entity
  }

  spawnSquad(typeId, count, center, isRed, spacing = 2) {
    // Spawn 'count' units in a grid around center, return array of entities
  }

  clearAll() {
    // Destroy every entity with a UnitType component
  }
}
```
- Read `UNIT_TYPES` from `src/entities/UnitTypes.js` for stats (damage, hp, range, etc.)
- Map each field to the right component (HP → Health, damage/range/attackSpeed → Combat, etc.)
- After adding components, emit `EventBus.emit('render:markdirty', { id: e.id })`

### 2. `src/systems/MovementSystem.js` (NEW)
Proves the UPDATE phase works. Moves entities toward their target, marks dirty.
```js
export class MovementSystem {
  constructor(world) { this.world = world; }
  update(dt) {
    // For each entity with transform + aistate:
    //   if aistate.target (THREE.Vector3 or {x,z}) is set, move toward it at unitType.speed
    //   clamp to terrain bounds |x|,|z| <= 85
    //   emit 'render:markdirty' for moved entities
  }
}
```
- Add to Bootstrapper: `this._add(new MovementSystem(this.world), 'update', 15);` (between AI@10 and Combat@20)

### 3. Proof harness: `test/ecs-bridge.test.js` (NEW)
A Node-runnable script (no browser needed) that PROVES the spawn+query pipeline:
```js
// Import World, UnitFactory (use a stub UNIT_TYPES or the real one if importable in node)
// Create World, UnitFactory
// factory.spawn('swordsman', 0,0,0, true)
// factory.spawnSquad('archer', 10, {x:5,z:0}, false)
// Assert: world.entityCount === 11
// Assert: world.query('transform','team').length === 11
// Assert: world.queryFirst('combat') has damage matching swordsman
// Print PASS/FAIL
```
- Must run with plain `node test/ecs-bridge.test.js` (ESM). Use `--input-type=module` if needed.

## Acceptance Criteria
- [ ] `UnitFactory.spawn` creates an entity with all 6 components
- [ ] `UnitFactory.spawnSquad` creates N entities in a grid
- [ ] `MovementSystem.update` moves entities toward targets
- [ ] `node test/ecs-bridge.test.js` prints PASS
- [ ] `vite build` still succeeds (no import errors)

## What NOT to do
- Do NOT modify main.js yet (the bridge into the live game is Step 2).
- Do NOT modify existing ECS files except Bootstrapper (to register MovementSystem).
- Do NOT add npm dependencies.
