/**
 * PHASE 2, STEP 3 — Deterministic Simulation (Replay Foundation)
 *
 * Same seed + same setup = identical battle.
 */

import { World } from '../src/ecs/World.js';
import { UnitFactory } from '../src/ecs/UnitFactory.js';
import { AISystem } from '../src/systems/AISystem.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';
import { ProjectileSystem } from '../src/systems/ProjectileSystem.js';
import { CleanupSystem } from '../src/systems/CleanupSystem.js';
import { SpatialIndexSystem } from '../src/systems/SpatialIndexSystem.js';
import { SeedRandom } from '../src/utils/SeedRandom.js';
import { EventBus } from '../src/core/EventBus.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) pass++; else { fail++; console.error(`  FAIL: ${msg}`); }
}

function countAlive(world, side) {
  let n = 0;
  for (const e of world.query('team', 'health')) {
    const t = e.get('team'), h = e.get('health');
    if (t.side === side && h.alive) n++;
  }
  return n;
}

function getPositions(world) {
  const positions = [];
  for (const e of world.query('transform', 'health', 'team')) {
    const tx = e.get('transform');
    const hp = e.get('health');
    const tm = e.get('team');
    if (!hp.alive) continue;
    positions.push({
      x: Math.round(tx.x * 1000) / 1000,
      z: Math.round(tx.z * 1000) / 1000,
      side: tm.side,
    });
  }
  positions.sort((a, b) => (a.side + a.x + a.z).localeCompare(b.side + b.x + b.z));
  return positions;
}

function runBattleDetailed(seed, useSpatialHash = false) {
  const world = new World();
  const factory = new UnitFactory(world);
  const ai = new AISystem(world);
  const rng = new SeedRandom(seed);
  ai.setRng(rng);
  const projectiles = new ProjectileSystem(world);
  const combat = new CombatSystem(world);
  const cleanup = new CleanupSystem(world);
  const spatial = useSpatialHash ? new SpatialIndexSystem(world) : null;

  factory.spawnSquad('swordsman', 5, { x: -20, z: 0 }, true, 2);
  factory.spawnSquad('spearman', 5, { x: 20, z: 0 }, false, 2);

  const dt = 1 / 60;
  const damageEvents = [];
  const killEvents = [];
  const positionSnapshots = [];
  let winner = null;

  const unsubDamage = EventBus.on('combat:damage:dealt', (e) => {
    damageEvents.push({ damage: e.damage });
  });
  const unsubKill = EventBus.on('combat:kill', () => {
    killEvents.push(1);
  });

  for (let frame = 0; frame < 1800; frame++) {
    if (spatial) spatial.update(dt);
    ai.update(dt);
    projectiles.update(dt);
    combat.update(dt);
    cleanup.lateUpdate(dt);

    positionSnapshots.push(JSON.stringify(getPositions(world)));

    const redAlive = countAlive(world, 'red');
    const blueAlive = countAlive(world, 'blue');

    if (redAlive === 0 || blueAlive === 0) {
      winner = redAlive > 0 ? 'red' : (blueAlive > 0 ? 'blue' : 'draw');
      break;
    }
  }

  unsubDamage();
  unsubKill();

  return { winner, damageEvents, killEvents, positionSnapshots };
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Same seed = same battle
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 1: Same seed = identical battle ━━━');

const battle1 = runBattleDetailed(42);
const battle2 = runBattleDetailed(42);

assert(battle1.winner === battle2.winner, `same winner: ${battle1.winner} vs ${battle2.winner}`);
assert(battle1.damageEvents.length === battle2.damageEvents.length,
  `same damage event count: ${battle1.damageEvents.length} vs ${battle2.damageEvents.length}`);
assert(battle1.killEvents.length === battle2.killEvents.length,
  `same kill count: ${battle1.killEvents.length} vs ${battle2.killEvents.length}`);
assert(battle1.positionSnapshots.length === battle2.positionSnapshots.length,
  `same frame count: ${battle1.positionSnapshots.length} vs ${battle2.positionSnapshots.length}`);

let damageMatch = true;
const len = Math.min(battle1.damageEvents.length, battle2.damageEvents.length);
for (let i = 0; i < len; i++) {
  if (battle1.damageEvents[i].damage !== battle2.damageEvents[i].damage) {
    damageMatch = false;
    console.error(`    Damage mismatch at event ${i}: ${battle1.damageEvents[i].damage} vs ${battle2.damageEvents[i].damage}`);
    break;
  }
}
assert(damageMatch, 'all damage events match frame-by-frame');

let positionsMatch = true;
for (let i = 0; i < battle1.positionSnapshots.length; i++) {
  if (battle1.positionSnapshots[i] !== battle2.positionSnapshots[i]) {
    positionsMatch = false;
    console.error(`    Position mismatch at frame ${i}`);
    break;
  }
}
assert(positionsMatch, 'all position snapshots match frame-by-frame');

console.log(`  Winner: ${battle1.winner}, Damage events: ${battle1.damageEvents.length}, Kills: ${battle1.killEvents.length}, Frames: ${battle1.positionSnapshots.length}`);

// ═══════════════════════════════════════════════════════════════════
// TEST 2: Different seed = different battle
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 2: Different seed = different battle ━━━');

const battle3 = runBattleDetailed(999);

const differs = battle1.winner !== battle3.winner
  || battle1.damageEvents.length !== battle3.damageEvents.length
  || battle1.damageEvents.some((e, i) => e.damage !== (battle3.damageEvents[i]?.damage))
  || battle1.positionSnapshots.some((s, i) => s !== (battle3.positionSnapshots[i]));

assert(differs, 'different seed produces different battle outcome or events');
console.log(`  Seed 999 winner: ${battle3.winner}, Damage events: ${battle3.damageEvents.length}`);

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Determinism with SpatialIndexSystem
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 3: Determinism with SpatialIndexSystem ━━━');

const battle4 = runBattleDetailed(42, true);
const battle5 = runBattleDetailed(42, true);

assert(battle4.winner === battle5.winner,
  `spatial hash: same winner: ${battle4.winner} vs ${battle5.winner}`);
assert(battle4.damageEvents.length === battle5.damageEvents.length,
  `spatial hash: same damage count: ${battle4.damageEvents.length} vs ${battle5.damageEvents.length}`);

let spatialDamageMatch = true;
for (let i = 0; i < Math.min(battle4.damageEvents.length, battle5.damageEvents.length); i++) {
  if (battle4.damageEvents[i].damage !== battle5.damageEvents[i].damage) {
    spatialDamageMatch = false;
    break;
  }
}
assert(spatialDamageMatch, 'spatial hash: all damage events match');

let spatialPositionsMatch = true;
for (let i = 0; i < battle4.positionSnapshots.length; i++) {
  if (battle4.positionSnapshots[i] !== battle5.positionSnapshots[i]) {
    spatialPositionsMatch = false;
    break;
  }
}
assert(spatialPositionsMatch, 'spatial hash: all positions match');

console.log(`  Spatial: Winner: ${battle4.winner}, Damage events: ${battle4.damageEvents.length}`);

// ═══════════════════════════════════════════════════════════════════
// TEST 4: Seed reproducibility across fresh runs
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 4: Seed reproducibility ━━━');

const battle6 = runBattleDetailed(42);

assert(battle6.winner === battle1.winner,
  `reproducibility: same winner: ${battle6.winner} vs ${battle1.winner}`);
assert(battle6.damageEvents.length === battle1.damageEvents.length,
  `reproducibility: same damage count: ${battle6.damageEvents.length} vs ${battle1.damageEvents.length}`);

let reproMatch = true;
for (let i = 0; i < Math.min(battle6.damageEvents.length, battle1.damageEvents.length); i++) {
  if (battle6.damageEvents[i].damage !== battle1.damageEvents[i].damage) {
    reproMatch = false;
    break;
  }
}
assert(reproMatch, 'reproducibility: all damage events match');

let reproPositionsMatch = true;
for (let i = 0; i < battle6.positionSnapshots.length; i++) {
  if (battle6.positionSnapshots[i] !== battle1.positionSnapshots[i]) {
    reproPositionsMatch = false;
    break;
  }
}
assert(reproPositionsMatch, 'reproducibility: all positions match');

// ═══════════════════════════════════════════════════════════════════
// TEST 5: Backward compatibility — tasks work without rng
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 5: Backward compatibility (no rng) ━━━');

const worldCompat = new World();
const factoryCompat = new UnitFactory(worldCompat);
const aiCompat = new AISystem(worldCompat);
const combatCompat = new CombatSystem(worldCompat);
const cleanupCompat = new CleanupSystem(worldCompat);

factoryCompat.spawnSquad('swordsman', 3, { x: -10, z: 0 }, true, 2);
factoryCompat.spawnSquad('spearman', 3, { x: 10, z: 0 }, false, 2);

let compatWinner = null;
for (let frame = 0; frame < 1800; frame++) {
  aiCompat.update(1 / 60);
  combatCompat.update(1 / 60);
  cleanupCompat.lateUpdate(1 / 60);
  const r = countAlive(worldCompat, 'red'), b = countAlive(worldCompat, 'blue');
  if (r === 0 || b === 0) { compatWinner = r > 0 ? 'red' : 'blue'; break; }
}

assert(compatWinner !== null, `backward compat: battle produced a winner (${compatWinner})`);

// ═══════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('PASS — Deterministic simulation verified');
  process.exit(0);
} else {
  console.log('FAIL');
  process.exit(1);
}
