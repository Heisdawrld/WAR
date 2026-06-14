/**
 * PHASE 2, STEP 1 — Spatial Hash correctness + performance benchmark
 *
 * (1) Correctness: hash queryRadius matches brute-force nearest enemy
 * (2) Performance: benchmark table for N=100,500,1000,2000
 * (3) Regression: battle resolves with spatial system active
 */

import { World } from '../src/ecs/World.js';
import { UnitFactory } from '../src/ecs/UnitFactory.js';
import { AISystem } from '../src/systems/AISystem.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';
import { CleanupSystem } from '../src/systems/CleanupSystem.js';
import { SpatialIndexSystem } from '../src/systems/SpatialIndexSystem.js';
import { FindTarget } from '../src/ai/tasks/FindTarget.js';
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

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Correctness — hash matches brute-force nearest enemy
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 1: Correctness — Spatial Hash vs Brute Force ━━━');

{
  const world = new World();
  const factory = new UnitFactory(world);
  const spatial = new SpatialIndexSystem(world);

  factory.spawnSquad('swordsman', 25, { x: -15, z: 0 }, true, 3);
  factory.spawnSquad('spearman', 25, { x: 15, z: 0 }, false, 3);

  spatial.update(1 / 60);

  const ft = new FindTarget();
  const redEntities = world.query('transform', 'health', 'team').filter(e => e.get('team').side === 'red');

  let allMatch = true;
  for (const entity of redEntities) {
    const ai = entity.get('aiState');
    const bb = {
      world, transform: entity.get('transform'), team: entity.get('team'),
      engageRange: 40, target: null,
    };

    // Spatial hash path
    const resultHash = ft.tick(bb, 1 / 60);
    const targetHash = bb.target;

    // Brute force path
    world.spatial = null;
    bb.target = null;
    const resultBrute = ft.tick(bb, 1 / 60);
    const targetBrute = bb.target;

    // Restore spatial for next iteration
    world.spatial = spatial.hash;

    const hashId = targetHash ? targetHash.id : null;
    const bruteId = targetBrute ? targetBrute.id : null;

    if (hashId !== bruteId) {
      allMatch = false;
      console.error(`  MISMATCH: entity ${entity.id} got hash=${hashId} brute=${bruteId}`);
    }
  }

  assert(allMatch, 'spatial hash and brute force return identical nearest enemies for all sample entities');
}

// ═══════════════════════════════════════════════════════════════════
// TEST 2: Performance benchmark
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 2: Performance Benchmark ━━━');

{
  const sizes = [100, 500, 1000, 2000];
  const queryCounts = { 100: 200, 500: 100, 1000: 50, 2000: 30 };
  const results = [];

  for (const N of sizes) {
    const world = new World();
    const factory = new UnitFactory(world);
    const spatial = new SpatialIndexSystem(world);
    const ft = new FindTarget();

    const half = Math.floor(N / 2);
    factory.spawnSquad('swordsman', half, { x: -50, z: 0 }, true, 4);
    factory.spawnSquad('spearman', N - half, { x: 50, z: 0 }, false, 4);

    spatial.update(1 / 60);

    const redEntities = world.query('transform', 'health', 'team').filter(e => e.get('team').side === 'red');
    const queries = queryCounts[N] || 50;

    // Benchmark: spatial hash
    const hashStart = performance.now();
    for (let q = 0; q < queries; q++) {
      for (const entity of redEntities) {
        const bb = {
          world, transform: entity.get('transform'), team: entity.get('team'),
          engageRange: 40, target: null,
        };
        ft.tick(bb, 1 / 60);
      }
    }
    const hashMs = performance.now() - hashStart;

    // Benchmark: brute force
    world.spatial = null;
    const bruteStart = performance.now();
    for (let q = 0; q < queries; q++) {
      for (const entity of redEntities) {
        const bb = {
          world, transform: entity.get('transform'), team: entity.get('team'),
          engageRange: 40, target: null,
        };
        ft.tick(bb, 1 / 60);
      }
    }
    const bruteMs = performance.now() - bruteStart;

    const speedup = bruteMs / hashMs;
    results.push({ N, hashMs: hashMs.toFixed(2), bruteMs: bruteMs.toFixed(2), speedup: speedup.toFixed(2) });
  }

  // Print table
  console.log('\n  N      | hash (ms) | brute (ms) | speedup');
  console.log('  -------|-----------|------------|--------');
  for (const r of results) {
    console.log(`  ${String(r.N).padStart(5)} | ${r.hashMs.padStart(9)} | ${r.bruteMs.padStart(10)} | ${r.speedup}x`);
  }

  const r1000 = results.find(r => r.N === 1000);
  assert(parseFloat(r1000.speedup) > 1.5, `at N=1000, hash speedup > 1.5x (got ${r1000.speedup}x)`);
}

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Regression — battle resolves with spatial system active
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 3: Regression — Battle with Spatial System ━━━');

{
  const world = new World();
  const factory = new UnitFactory(world);
  const spatial = new SpatialIndexSystem(world);
  const ai = new AISystem(world);
  const combat = new CombatSystem(world);
  const cleanup = new CleanupSystem(world);

  factory.spawnSquad('swordsman', 10, { x: -20, z: 0 }, true, 2);
  factory.spawnSquad('spearman', 10, { x: 20, z: 0 }, false, 2);

  const dt = 1 / 60;
  let winner = null;
  let resolutionFrame = 0;

  for (let frame = 0; frame < 3600; frame++) {
    spatial.update(dt);
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

  assert(winner !== null, `battle produced a winner with spatial system active`);
  assert(winner === 'red' || winner === 'blue', `winner is red or blue, got ${winner}`);
  assert(resolutionFrame < 3600, `resolved within time limit (${resolutionFrame} frames)`);
}

// ═══════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('✅ PASS — Spatial hash correctness, performance, and regression verified');
  process.exit(0);
} else {
  console.log('❌ FAIL');
  process.exit(1);
}
