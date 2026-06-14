/**
 * PHASE 1, STEP 2 — Full ECS Battle Simulation (headless, Node)
 * 
 * Proves the ECS gameplay loop works end-to-end:
 *   AISystem (behavior trees) → CombatSystem (damage) → CleanupSystem (deaths)
 * 
 * NOTE: MovementSystem is EXCLUDED — the behavior tree's Chase/Attack tasks
 * handle all movement. MovementSystem as written reads bb.target as a position
 * {x,z}, but bb.target is an Entity reference (set by FindTarget). This is a
 * known redundancy to address in a future refactor.
 */

import { World } from '../src/ecs/World.js';
import { UnitFactory } from '../src/ecs/UnitFactory.js';
import { AISystem } from '../src/systems/AISystem.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';
import { CleanupSystem } from '../src/systems/CleanupSystem.js';
import { EventBus } from '../src/core/EventBus.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) pass++; else { fail++; console.error(`  FAIL: ${msg}`); }
}

// ─── Track combat events ──────────────────────────────────────────
let totalDamage = 0;
let killCount = 0;
let damageEvents = 0;
let projectileSpawns = 0;
let rangedDamage = 0;
let meleeDamage = 0;

EventBus.on('combat:damage:dealt', (e) => {
  totalDamage += e.damage;
  damageEvents++;
  if (e.isMelee) meleeDamage += e.damage;
  else rangedDamage += e.damage;
});
EventBus.on('combat:kill', () => { killCount++; });
EventBus.on('projectile:spawn', () => { projectileSpawns++; });

// ─── Helper: count alive per team ─────────────────────────────────
function countAlive(world, side) {
  let n = 0;
  for (const e of world.query('team', 'health')) {
    const t = e.get('team'), h = e.get('health');
    if (t.side === side && h.alive) n++;
  }
  return n;
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Full melee battle — swordsmen vs spearmen
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 1: Full Melee Battle (10 swordsmen vs 10 spearmen) ━━━');

const world = new World();
const factory = new UnitFactory(world);
const ai = new AISystem(world);
const combat = new CombatSystem(world);
const cleanup = new CleanupSystem(world);

factory.spawnSquad('swordsman', 10, { x: -20, z: 0 }, true, 2);
factory.spawnSquad('spearman', 10, { x: 20, z: 0 }, false, 2);

assert(world.entityCount === 20, `20 entities spawned, got ${world.entityCount}`);
assert(countAlive(world, 'red') === 10, `10 red alive at start`);
assert(countAlive(world, 'blue') === 10, `10 blue alive at start`);

const dt = 1 / 60;
let winner = null;
let resolutionFrame = 0;

for (let frame = 0; frame < 3600; frame++) {  // max 60 seconds
  ai.update(dt);
  combat.update(dt);
  cleanup.lateUpdate(dt);

  const redAlive = countAlive(world, 'red');
  const blueAlive = countAlive(world, 'blue');

  if (redAlive === 0 || blueAlive === 0) {
    winner = redAlive > 0 ? 'red' : (blueAlive > 0 ? 'blue' : 'draw');
    resolutionFrame = frame;
    break;
  }
}

console.log(`  Winner: ${winner}`);
console.log(`  Resolved at frame ${resolutionFrame} (${(resolutionFrame * dt).toFixed(1)}s)`);
console.log(`  Total damage dealt: ${totalDamage}`);
console.log(`  Total kills: ${killCount}`);
console.log(`  Damage events: ${damageEvents}`);
console.log(`  Entities remaining: ${world.entityCount}`);

assert(winner !== null, `battle produced a winner (not a stalemate)`);
assert(winner === 'red' || winner === 'blue', `winner is red or blue, got ${winner}`);
assert(totalDamage > 0, `damage was actually dealt (${totalDamage})`);
assert(killCount >= 10, `at least 10 kills (one side eliminated), got ${killCount}`);
assert(resolutionFrame < 3600, `resolved within time limit (${resolutionFrame} frames)`);

// ═══════════════════════════════════════════════════════════════════
// TEST 2: Ranged gap documentation (archers fire but deal no damage)
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 2: Ranged Gap (2 archers vs 2 swordsmen) ━━━');

// Reset trackers
totalDamage = 0; killCount = 0; damageEvents = 0; projectileSpawns = 0;
rangedDamage = 0; meleeDamage = 0;

const world2 = new World();
const factory2 = new UnitFactory(world2);
const ai2 = new AISystem(world2);
const combat2 = new CombatSystem(world2);
const cleanup2 = new CleanupSystem(world2);

factory2.spawnSquad('archer', 2, { x: -15, z: 0 }, true, 3);
factory2.spawnSquad('swordsman', 2, { x: 15, z: 0 }, false, 3);

const projectilesBefore = projectileSpawns;
for (let frame = 0; frame < 600; frame++) {  // 10 seconds
  ai2.update(dt);
  combat2.update(dt);
  cleanup2.lateUpdate(dt);
}
const projectilesFired = projectileSpawns - projectilesBefore;

console.log(`  Projectiles spawned (archer attacks): ${projectilesFired}`);
console.log(`  Damage from ranged attacks: ${rangedDamage}`);
console.log(`  Damage from melee: ${meleeDamage}`);

assert(projectilesFired > 0, `archers fired projectiles (${projectilesFired})`);
assert(rangedDamage === 0, `KNOWN LIMITATION: ranged damage is 0 (projectile:spawn unhandled — needs ProjectileSystem)`);

// Archers will eventually be caught by melee swordsmen and take melee damage,
// OR swordsmen may not reach them. Either way, the ranged gap is documented.

// ═══════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('✅ PASS — ECS runs full melee battles end-to-end');
  process.exit(0);
} else {
  console.log('❌ FAIL');
  process.exit(1);
}
