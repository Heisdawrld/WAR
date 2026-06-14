# PHASE 2, STEP 3 — SPEC: Deterministic Simulation (Replay Foundation)
> Lead: Arena.ai Agent | Implementer: MiMo Code Agent
> Goal: Make battles fully deterministic. Same seed + same setup = identical battle.

## Why
Deterministic battles = shareable replays. A battle becomes just `seed + army setup` → 
encodable in a URL. This is THE viral lever for WARZONE. The serialization layer (World→Entity→
Component toJSON/fromJSON) already exists. The missing piece is seeding every random decision.

## The Core Problem
`SeedRandom` is instantiated in Bootstrapper but NEVER injected anywhere. All gameplay
randomness uses raw `Math.random()`. 12+ calls across Patrol.js, Attack.js, and others.

## Deliverable A: Inject RNG into blackboard

### Modify `src/systems/AISystem.js`
The AISystem creates the rng and passes it into every blackboard:
```js
constructor(world) {
  this.world = world;
  this.registry = new BehaviorRegistry();
  this.rng = null;  // set via setRng() or constructor param
  this._unsubs = [EventBus.on('ecs:entity:created', e => this._initBB(e.id))];
}

setRng(rng) { this.rng = rng; return this; }

update(dt) {
  // ...existing code...
  bb.rng = this.rng;  // ADD THIS — every task gets access to seeded RNG
  // ...rest of existing code...
}
```
If `this.rng` is null, tasks should fall back to Math.random() (backward compatible).

## Deliverable B: Replace Math.random() in gameplay code

### Modify `src/ai/tasks/Patrol.js`
Replace:
```js
const angle = Math.random() * Math.PI * 2;
const dist = 5 + Math.random() * this.wanderRadius;
```
With:
```js
const rng = bb.rng;
const angle = (rng ? rng.range(0, Math.PI * 2) : Math.random() * Math.PI * 2);
const dist = 5 + (rng ? rng.range(0, this.wanderRadius) : Math.random() * this.wanderRadius);
```

### Modify `src/ai/tasks/Attack.js`
Replace the shield proc roll:
```js
if (c.shieldChance > 0 && Math.random() < c.shieldChance) return 0;
```
With:
```js
const rng = bb.rng;
if (c.shieldChance > 0 && (rng ? rng.next() : Math.random()) < c.shieldChance) return 0;
```

DO NOT modify the legacy BehaviorTree.js (it's deprecated, not used by ECS).

## Deliverable C: Deterministic entity IDs

### Modify `src/ecs/Entity.js`
The ID generator uses Date.now() which is nondeterministic. Add an optional ID parameter:
```js
constructor(world, id) {
  this._world = world;
  this.id = id || `e_${++_counter}`;  // Drop Date.now() — counter alone is deterministic
  // ...
}
```
The counter resets each process start, so the same spawn order → same IDs.

## Deliverable D: Wire RNG in ECSGameController + Bootstrapper

### Modify `src/ecs/ECSGameController.js`
Add RNG creation and injection:
```js
import { SeedRandom } from '../utils/SeedRandom.js';

constructor(unitManager, particles = null) {
  // ...existing...
  this.rng = new SeedRandom();
  this.ai.setRng(this.rng);
}

setSeed(seed) {
  this.rng = new SeedRandom(seed);
  this.ai.setRng(this.rng);
  return this;
}

getSeed() { return this.rng.seed; }
```

## Deliverable E: `test/determinism.test.js`

The defining test — SAME SEED = SAME BATTLE:

### Test 1: Determinism
```
function runBattle(seed) {
  // Create World, UnitFactory, AISystem (with rng set to seed), 
  // ProjectileSystem, CombatSystem, CleanupSystem
  // Spawn identical armies: 5 swordsmen left, 5 spearmen right
  // Run 1800 frames, recording: damage dealt each frame, kills each frame, 
  //   positions of all entities each frame
  // Return { damageLog, killLog, positionLog, winner }
}

const battle1 = runBattle(42);
const battle2 = runBattle(42);

// Assert EVERYTHING matches:
assert(battle1.damageLog.length === battle2.damageLog.length, 'same number of damage events')
for each frame: assert(battle1.damageLog[i] === battle2.damageLog[i])
assert(battle1.winner === battle2.winner)
assert(positions match frame-by-frame)
```

### Test 2: Different seed = different battle
```
const battle3 = runBattle(999);
// Assert battle3 differs from battle1 in at least some aspect
// (damage events differ OR positions differ — proves seed actually matters)
```

### Test 3: Determinism with spatial hash
Run the same battle WITH SpatialIndexSystem active. Assert still deterministic.
(The spatial hash shouldn't affect determinism since it's just an optimization.)

### Test 4: Seed reproducibility
```
const battle4 = runBattle(42);
// Assert battle4 === battle1 (reproducible across fresh runs)
```

## Acceptance Criteria
- [ ] `node test/determinism.test.js` prints PASS
- [ ] Same seed produces byte-identical battle (damage log, kill log, positions, winner)
- [ ] Different seed produces different battle
- [ ] Spatial hash doesn't break determinism
- [ ] Backward compatibility: tasks work without rng (fall back to Math.random)
- [ ] All 6 existing test suites still pass
- [ ] `vite build` succeeds

## What NOT to do
- Do NOT modify legacy BehaviorTree.js
- Do NOT modify ParticleSystem (visual-only, doesn't affect gameplay)
- Do NOT add full replay serialization yet (that's Step 4 — this is just determinism)
- Do NOT add npm dependencies
