# PHASE 1, STEP 2 — SPEC: Prove the ECS Runs a Full Battle
> Architect: Arena.ai Agent | Implementer: MiMo Code Agent
> Goal: Headless battle simulation proving the ECS gameplay loop works end-to-end.

## Why this step
The ECS has a COMPLETE battle loop (AISystem → behavior trees → CombatSystem → CleanupSystem)
that has NEVER been run. Before wiring it into the browser game, we prove it works headless.
If two armies fight to a winner through the ECS, the engine is proven real.

## Context (what already works)
- `UnitFactory.spawn(typeId, x, y, z, isRed)` creates entities with all 6 components
- `AISystem.update(dt)` runs behavior trees per entity (melee fully works; ranged emits
  `projectile:spawn` which is currently unhandled)
- `CombatSystem` listens for `combat:damage` events, applies HP, emits `combat:kill`
- `CleanupSystem.lateUpdate(dt)` removes dead entities after a delay
- `Engine` uses `requestAnimationFrame` (must be stubbed for Node)

## Deliverable: `test/ecs-battle.test.js`

A Node ESM script that runs a FULL MELEE BATTLE through the ECS and verifies the outcome.

### Setup
```js
// Stub requestAnimationFrame + performance for Node (Engine needs them)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.performance = globalThis.performance || { now: () => Date.now() };
```
Actually, DON'T use the Engine's RAF loop. Instead, manually drive the systems in a
fixed loop — this is deterministic and faster:
```js
const world = new World();
const factory = new UnitFactory(world);
const ai = new AISystem(world);
const combat = new CombatSystem(world);
const cleanup = new CleanupSystem(world);
const movement = new MovementSystem(world);
```

### Battle setup
- Spawn 10 red swordsmen in a cluster around (-20, 0, 0)
- Spawn 10 blue spearmen in a cluster around (20, 0, 0)
- Use `factory.spawnSquad('swordsman', 10, {x:-20,z:0}, true, 2)`
- Use `factory.spawnSquad('spearman', 10, {x:20,z:0}, false, 2)`

### Simulation loop
```js
const dt = 1/60;
let winner = null;
let damageDealt = 0;
EventBus.on('combat:damage:dealt', (e) => { damageDealt += e.damage; });
EventBus.on('combat:kill', (e) => { /* track kills */ });

for (let frame = 0; frame < 3600; frame++) {  // 60 seconds max
  ai.update(dt);
  movement.update(dt);
  combat.update(dt);
  cleanup.lateUpdate(dt);
  
  const redAlive = world.query('team').filter(e => e.get('team').isRed && e.get('health').alive).length;
  const blueAlive = world.query('team').filter(e => e.get('team').isBlue && e.get('health').alive).length;
  if (redAlive === 0 || blueAlive === 0) { winner = redAlive > 0 ? 'red' : 'blue'; break; }
}
```

### Assertions (the proof)
```
- damageDealt > 0          // combat actually happened
- at least 5 kills occurred // units died
- winner is 'red' or 'blue' // a side won
- world.entityCount eventually shrinks as corpses get cleaned up
- battle resolved within 3600 frames (60s) — not an infinite stalemate
```

### Also test: ranged gap is documented
- Spawn 2 archers vs 2 swordsmen, run 300 frames
- Assert that archers' `projectile:spawn` events fired but NO `combat:damage` resulted
  (proving the ranged gap exists — this becomes the spec for the ProjectileSystem)

## Acceptance Criteria
- [ ] `node test/ecs-battle.test.js` prints PASS
- [ ] Melee battle resolves with a clear winner and verifiable damage
- [ ] Ranged gap is documented (archers fire but deal no damage — known limitation)
- [ ] No hangs / infinite loops
- [ ] `vite build` still succeeds

## What NOT to do
- Do NOT modify main.js or any existing source files
- Do NOT add the ProjectileSystem yet (that's Step 3)
- Do NOT add npm dependencies
