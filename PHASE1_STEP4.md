# PHASE 1, STEP 4 — SPEC: ProjectileSystem (Ranged Combat)
> Architect: Arena.ai Agent | Implementer: MiMo Code Agent
> Goal: Close the ranged combat gap. Arrows, bullets, and catapult rocks deal damage.

## Context
The `Attack` behavior tree task (src/ai/tasks/Attack.js) already emits this event when ranged
units attack:
```js
EventBus.emit('projectile:spawn', {
  attackerId,      // entity id of shooter
  targetId,        // entity id of target
  damage,          // computed damage (after modifiers)
  projectileSpeed, // units/sec (archer: 40, musketeer: 60, catapult: 25)
  projectileArc,   // 0 for straight (bullets), >0 for arcing (catapult: 15)
  isAoe,           // true for catapult/giant
  aoeRadius,       // splash radius if AOE
  side             // 'red' or 'blue'
});
```
Currently NOTHING handles this event → ranged damage is 0 (proven in battle test).

## Deliverable: `src/systems/ProjectileSystem.js`

A system that manages in-flight projectiles and resolves their impacts.

### Contract
```js
export class ProjectileSystem {
  constructor(world) {
    this.world = world;
    this.projectiles = [];  // array of active projectiles
    this._unsubs = [
      EventBus.on('projectile:spawn', e => this._spawn(e)),
    ];
  }

  _spawn(e) {
    // Get attacker position from world (attackerId → transform)
    // Get target position from world (targetId → transform)
    // If attacker or target doesn't exist, skip
    // Create projectile object:
    //   { x, y, z (start at attacker pos + height offset ~0.6),
    //     targetId, attackerId, damage, speed, arc, isAoe, aoeRadius, side,
    //     age: 0, maxAge: 5 (despawn after 5s safety) }
    // Push to this.projectiles
  }

  update(dt) {
    // For each active projectile:
    //   1. Move toward target's CURRENT position (homing — target may have moved)
    //      - For arc > 0: add a parabolic y offset (visual; for logic just track flat distance)
    //      - For arc === 0: straight line
    //   2. age += dt; if age > maxAge → remove (missed)
    //   3. Check impact: flat distance to target < 1.5 units → HIT
    //      - If target is dead/gone → remove projectile (whiffed)
    //   4. On hit:
    //      - If isAoe: find all enemy entities within aoeRadius of impact point,
    //        emit combat:damage for each with full damage
    //      - Else: emit combat:damage for targetId only
    //      - Remove projectile
    //   5. Emit EventBus.emit('projectile:impact', {x, y, z, side}) for particle FX hook
  }

  dispose() {
    // Unsubscribe listeners, clear projectiles
  }

  get activeCount() { return this.projectiles.length; }
}
```

### Key behaviors
- **Homing**: projectile tracks target's current position (units move while arrow is in flight)
- **AOE** (catapult, giant): on impact, damage ALL enemies within `aoeRadius` of impact point,
  not just the original target
- **Whiff**: if target dies before projectile lands, projectile flies to last known position and despawns
- **Safety**: maxAge 5s prevents stuck projectiles
- **Team awareness**: AOE only damages enemies (use Team.isEnemyOf)

### Register in Bootstrapper
```js
this._add(new ProjectileSystem(this.world), 'update', 18);  // between AI(10) and Combat(20)
```
This order matters: AI fires projectiles, ProjectileSystem moves them and emits combat:damage,
CombatSystem processes the damage — all in the same frame.

## Deliverable: `test/ecs-ranged.test.js`

Node ESM script proving ranged combat works. Extend the existing battle test pattern:

### Test 1: Archers deal damage
- Spawn 5 blue archers at (15, 0, 0), 5 red swordsmen at (-15, 0, 0)
- Run simulation (AI + ProjectileSystem + CombatSystem + CleanupSystem, dt=1/60)
- Assert: ranged damage > 0 (archers hit something)
- Assert: projectile:spawn events fired
- Assert: combat:damage events occurred from ranged (isMelee: false)
- Assert: battle resolves (one side wins)

### Test 2: Catapult AOE
- Spawn 1 red catapult at (-20, 0, 0)
- Spawn 5 blue swordsmen clustered tightly at (20, 0, 0) with spacing 1.5
- Run 600 frames
- Assert: damage dealt to multiple targets (AOE splash works)
- Assert: at least 2 distinct targets took damage from a single... actually just assert
  total kills or damage is significant given catapult does 60 damage

### Test 3: Mixed battle
- Red: 3 archers + 3 swordsmen + 1 catapult
- Blue: 4 spearmen + 2 musketeers + 1 giant
- Run to resolution
- Assert: battle resolves with a winner
- Assert: both melee and ranged damage occurred

## Acceptance Criteria
- [ ] `node test/ecs-ranged.test.js` prints PASS
- [ ] Archers deal ranged damage (rangedDamage > 0)
- [ ] Catapult AOE hits multiple targets
- [ ] Mixed battles resolve
- [ ] `vite build` succeeds
- [ ] No infinite loops / no stuck projectiles

## What NOT to do
- Do NOT add Three.js meshes yet (visual projectiles come in the main.js wiring step)
- Do NOT modify main.js
- Do NOT modify existing systems or components
- Do NOT modify the Attack task (it already emits the right events)
