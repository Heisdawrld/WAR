/**
 * PHASE 1, STEP 4 — Ranged Combat Simulation (headless, Node)
 *
 * Proves ProjectileSystem handles projectile:spawn → flight → combat:damage:
 *   Test 1: 5 archers vs 5 swordsmen → ranged damage > 0, battle resolves
 *   Test 2: 1 catapult vs 5 clustered swordsmen → AOE hits multiple
 *   Test 3: Mixed battle → both melee and ranged damage, battle resolves
 */

import { World } from '../src/ecs/World.js';
import { UnitFactory } from '../src/ecs/UnitFactory.js';
import { AISystem } from '../src/systems/AISystem.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';
import { ProjectileSystem } from '../src/systems/ProjectileSystem.js';
import { CleanupSystem } from '../src/systems/CleanupSystem.js';
import { EventBus } from '../src/core/EventBus.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) pass++; else { fail++; console.error(`  FAIL: ${msg}`); }
}

function resetTrackers(tr) {
  tr.totalDamage = 0; tr.killCount = 0; tr.damageEvents = 0;
  tr.projectileSpawns = 0; tr.rangedDamage = 0; tr.meleeDamage = 0;
}

function countAlive(world, side) {
  let n = 0;
  for (const e of world.query('team', 'health')) {
    const t = e.get('team'), h = e.get('health');
    if (t.side === side && h.alive) n++;
  }
  return n;
}

const dt = 1 / 60;

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Archers deal ranged damage (5 archers vs 5 swordsmen)
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 1: Archers vs Swordsmen (5v5) ━━━');

const t1 = { totalDamage: 0, killCount: 0, damageEvents: 0, projectileSpawns: 0, rangedDamage: 0, meleeDamage: 0 };
const unsub1a = EventBus.on('combat:damage:dealt', e => {
  t1.totalDamage += e.damage; t1.damageEvents++;
  if (e.isMelee) t1.meleeDamage += e.damage; else t1.rangedDamage += e.damage;
});
const unsub1b = EventBus.on('combat:kill', () => { t1.killCount++; });
const unsub1c = EventBus.on('projectile:spawn', () => { t1.projectileSpawns++; });

const w1 = new World();
const f1 = new UnitFactory(w1);
const ai1 = new AISystem(w1);
const ps1 = new ProjectileSystem(w1);
const cs1 = new CombatSystem(w1);
const cl1 = new CleanupSystem(w1);

f1.spawnSquad('archer', 5, { x: -15, z: 0 }, true, 2);
f1.spawnSquad('swordsman', 5, { x: 15, z: 0 }, false, 2);

let winner1 = null;
for (let frame = 0; frame < 3600; frame++) {
  ai1.update(dt);
  ps1.update(dt);
  cs1.update(dt);
  cl1.lateUpdate(dt);
  const r = countAlive(w1, 'red'), b = countAlive(w1, 'blue');
  if (r === 0 || b === 0) { winner1 = r > 0 ? 'red' : 'blue'; break; }
}

console.log(`  Winner: ${winner1}`);
console.log(`  Projectiles fired: ${t1.projectileSpawns}`);
console.log(`  Ranged damage: ${t1.rangedDamage}, Melee damage: ${t1.meleeDamage}`);
console.log(`  Total damage: ${t1.totalDamage}, Kills: ${t1.killCount}`);

assert(t1.projectileSpawns > 0, `archers fired projectiles (${t1.projectileSpawns})`);
assert(t1.rangedDamage > 0, `ranged damage > 0 (${t1.rangedDamage})`);
assert(t1.totalDamage > 0, `total damage > 0 (${t1.totalDamage})`);
assert(winner1 !== null, `battle resolved with a winner`);
assert(t1.killCount >= 5, `at least 5 kills (${t1.killCount})`);

unsub1a(); unsub1b(); unsub1c();

// ═══════════════════════════════════════════════════════════════════
// TEST 2: Catapult AOE hits multiple targets
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 2: Catapult AOE (1 catapult vs 5 swordsmen) ━━━');

const t2 = { totalDamage: 0, killCount: 0, damageEvents: 0, projectileSpawns: 0, rangedDamage: 0, meleeDamage: 0 };
const t2TargetsHit = new Map();
const unsub2a = EventBus.on('combat:damage:dealt', e => {
  t2.totalDamage += e.damage; t2.damageEvents++;
  if (e.isMelee) t2.meleeDamage += e.damage; else t2.rangedDamage += e.damage;
  if (!e.isMelee) {
    if (!t2TargetsHit.has(e.targetId)) t2TargetsHit.set(e.targetId, 0);
    t2TargetsHit.set(e.targetId, t2TargetsHit.get(e.targetId) + e.damage);
  }
});
const unsub2b = EventBus.on('combat:kill', () => { t2.killCount++; });
const unsub2c = EventBus.on('projectile:spawn', () => { t2.projectileSpawns++; });

const w2 = new World();
const f2 = new UnitFactory(w2);
const ai2 = new AISystem(w2);
const ps2 = new ProjectileSystem(w2);
const cs2 = new CombatSystem(w2);
const cl2 = new CleanupSystem(w2);

f2.spawnSquad('catapult', 1, { x: -20, z: 0 }, true, 1);
f2.spawnSquad('swordsman', 5, { x: 20, z: 0 }, false, 1.5);

for (let frame = 0; frame < 600; frame++) {
  ai2.update(dt);
  ps2.update(dt);
  cs2.update(dt);
  cl2.lateUpdate(dt);
}

console.log(`  Projectiles fired: ${t2.projectileSpawns}`);
console.log(`  Ranged damage: ${t2.rangedDamage}`);
console.log(`  Distinct targets damaged by ranged: ${t2TargetsHit.size}`);
console.log(`  Total damage: ${t2.totalDamage}, Kills: ${t2.killCount}`);

assert(t2.projectileSpawns > 0, `catapult fired projectiles (${t2.projectileSpawns})`);
assert(t2.rangedDamage > 0, `ranged damage > 0 (${t2.rangedDamage})`);
assert(t2TargetsHit.size >= 2, `AOE hit at least 2 distinct targets (${t2TargetsHit.size})`);
assert(t2.rangedDamage >= 60, `significant AOE damage (${t2.rangedDamage})`);

unsub2a(); unsub2b(); unsub2c();

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Mixed battle (ranged + melee + AOE)
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 3: Mixed Battle ━━━');

const t3 = { totalDamage: 0, killCount: 0, damageEvents: 0, projectileSpawns: 0, rangedDamage: 0, meleeDamage: 0 };
const unsub3a = EventBus.on('combat:damage:dealt', e => {
  t3.totalDamage += e.damage; t3.damageEvents++;
  if (e.isMelee) t3.meleeDamage += e.damage; else t3.rangedDamage += e.damage;
});
const unsub3b = EventBus.on('combat:kill', () => { t3.killCount++; });
const unsub3c = EventBus.on('projectile:spawn', () => { t3.projectileSpawns++; });

const w3 = new World();
const f3 = new UnitFactory(w3);
const ai3 = new AISystem(w3);
const ps3 = new ProjectileSystem(w3);
const cs3 = new CombatSystem(w3);
const cl3 = new CleanupSystem(w3);

f3.spawnSquad('archer', 3, { x: -25, z: 0 }, true, 2);
f3.spawnSquad('swordsman', 3, { x: -18, z: 0 }, true, 2);
f3.spawnSquad('catapult', 1, { x: -30, z: 0 }, true, 1);
f3.spawnSquad('spearman', 4, { x: 20, z: 0 }, false, 2);
f3.spawnSquad('musketeer', 2, { x: 25, z: 0 }, false, 2);
f3.spawnSquad('giant', 1, { x: 28, z: 0 }, false, 1);

let winner3 = null;
for (let frame = 0; frame < 3600; frame++) {
  ai3.update(dt);
  ps3.update(dt);
  cs3.update(dt);
  cl3.lateUpdate(dt);
  const r = countAlive(w3, 'red'), b = countAlive(w3, 'blue');
  if (r === 0 || b === 0) { winner3 = r > 0 ? 'red' : 'blue'; break; }
}

console.log(`  Winner: ${winner3}`);
console.log(`  Projectiles fired: ${t3.projectileSpawns}`);
console.log(`  Ranged damage: ${t3.rangedDamage}, Melee damage: ${t3.meleeDamage}`);
console.log(`  Total damage: ${t3.totalDamage}, Kills: ${t3.killCount}`);

assert(t3.projectileSpawns > 0, `ranged units fired (${t3.projectileSpawns})`);
assert(t3.rangedDamage > 0, `ranged damage > 0 (${t3.rangedDamage})`);
assert(t3.meleeDamage > 0, `melee damage > 0 (${t3.meleeDamage})`);
assert(winner3 !== null, `battle resolved with a winner`);
assert(t3.killCount >= 7, `at least 7 kills (${t3.killCount})`);

unsub3a(); unsub3b(); unsub3c();

// ═══════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('✅ PASS — Ranged combat system works end-to-end');
  process.exit(0);
} else {
  console.log('❌ FAIL');
  process.exit(1);
}
