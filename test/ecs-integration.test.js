/**
 * INTEGRATION TEST — Simulates the full game flow through ECSUnitManager
 * Verifies: place units → syncToECS → ECS battle → syncFromECS → rendering data correct
 */
import { World } from '../src/ecs/World.js';
import { ECSUnitManager } from '../src/ecs/ECSUnitManager.js';
import { ECSGameController } from '../src/ecs/ECSGameController.js';
import { EventBus } from '../src/core/EventBus.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) pass++; else { fail++; console.error(`  FAIL: ${msg}`); }
}

// ECSUnitManager needs scene/terrain — stub them (no Three.js needed for logic)
const fakeScene = { add: () => {} };
const fakeTerrain = { getHeightAt: () => 0 };

const um = new ECSUnitManager(fakeScene, fakeTerrain);
const ecs = new ECSGameController(um, null);  // no particles in test

// ─── Step 1: Place units (like user clicking on battlefield) ──────
console.log('\n━━━ Step 1: Place units ━━━');
um.addUnit('swordsman', { x: -20, y: 0, z: 0 }, 'red');
um.addUnit('swordsman', { x: -18, y: 0, z: 2 }, 'red');
um.addUnit('swordsman', { x: -22, y: 0, z: -2 }, 'red');
um.addUnit('archer', { x: 20, y: 0, z: 0 }, 'blue');
um.addUnit('archer', { x: 22, y: 0, z: 2 }, 'blue');

assert(um.getAliveCount('red') === 3, `3 red units, got ${um.getAliveCount('red')}`);
assert(um.getAliveCount('blue') === 2, `2 blue units, got ${um.getAliveCount('blue')}`);
assert(um.world.entityCount === 5, `5 ECS entities, got ${um.world.entityCount}`);

const comp = um.getArmyComposition('red');
assert(comp['Swordsman'] === 3, `red army has 3 swordsmen, got ${JSON.stringify(comp)}`);

// ─── Step 2: Apply formations + syncToECS ─────────────────────────
console.log('\n━━━ Step 2: Sync to ECS ━━━');
// Simulate formation assignment (directly set positions like Formation.js does)
const redUnits = um.getUnitsBySide('red');
redUnits[0].position.set(-25, 0, 0);
redUnits[1].position.set(-23, 0, 3);
redUnits[2].position.set(-27, 0, -3);
redUnits.forEach(u => u.rotation = 0);

um.syncToECS();

// Verify ECS entities have the formation positions
const e0 = um.world.getEntity(redUnits[0].entityId);
const tx0 = e0.get('transform');
assert(tx0.x === -25, `ECS entity 0 x === -25 after sync, got ${tx0.x}`);
assert(tx0.rotation === 0, `ECS entity 0 rotation === 0`);

// ─── Step 3: Run ECS battle + verify syncFromECS ──────────────────
console.log('\n━━━ Step 3: Run battle + verify render sync ━━━');
let damageDealt = 0;
EventBus.on('combat:damage:dealt', e => damageDealt += e.damage);

const dt = 1 / 60;
let winner = null;
for (let frame = 0; frame < 3600; frame++) {
  ecs.update(dt);  // This runs AI → projectiles → combat → cleanup → syncFromECS

  const redAlive = um.getAliveCount('red');
  const blueAlive = um.getAliveCount('blue');
  if (redAlive === 0 || blueAlive === 0) {
    winner = redAlive > 0 ? 'red' : 'blue';
    break;
  }
}

console.log(`  Winner: ${winner}`);
console.log(`  Damage dealt: ${damageDealt}`);
console.log(`  Red alive: ${um.getAliveCount('red')}, Blue alive: ${um.getAliveCount('blue')}`);

assert(winner !== null, 'battle resolved');
assert(damageDealt > 0, `damage was dealt (${damageDealt})`);

// Verify legacy units are synced with ECS state (positions changed from formation)
let positionChanged = false;
for (const u of um.units) {
  if (u.alive) {
    const e = um.world.getEntity(u.entityId);
    const tx = e.get('transform');
    if (Math.abs(u.position.x - tx.x) > 0.01 || Math.abs(u.position.z - tx.z) > 0.01) {
      fail++; console.error('  FAIL: legacy unit position not synced with ECS');
      break;
    }
    positionChanged = true;
  }
}
if (positionChanged) pass++;

// ─── Step 4: Reset for new battle ─────────────────────────────────
console.log('\n━━━ Step 4: Reset ━━━');
ecs.reset();
um.clearAll();

assert(um.getAliveCount('red') === 0, 'red cleared');
assert(um.getAliveCount('blue') === 0, 'blue cleared');
assert(um.world.entityCount === 0, `ECS world cleared, got ${um.world.entityCount}`);
assert(um.units.length === 0, 'legacy units cleared');

// ─── Result ───────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('✅ PASS — Full game flow works through ECSUnitManager');
  process.exit(0);
} else {
  console.log('❌ FAIL');
  process.exit(1);
}
