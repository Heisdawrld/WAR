/**
 * PHASE 2, STEP 2 — Data-Driven Units (headless, Node)
 *
 * Test 1: JSON matches hardcoded UNIT_TYPES exactly
 * Test 2: DataLoader.validateUnits rejects bad definitions
 * Test 3: Battle works with loaded data (spawn + 5v5)
 * Test 4: Adding a custom unit works
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const { UNIT_TYPES, FORMATION_TYPES } = await import('../src/entities/UnitTypes.js');
const { DataLoader } = await import('../src/data/DataLoader.js');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: JSON matches hardcoded UNIT_TYPES exactly
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 1: JSON matches hardcoded UNIT_TYPES ━━━');

const unitsJson = JSON.parse(readFileSync(join(ROOT, 'src/data/units.json'), 'utf-8'));
const formationsJson = JSON.parse(readFileSync(join(ROOT, 'src/data/formations.json'), 'utf-8'));

const jsonUnits = unitsJson.units;
const jsonFormations = formationsJson.formations;

// Check all 8 unit types exist
const expectedIds = Object.keys(UNIT_TYPES);
const jsonIds = Object.keys(jsonUnits);
assert(expectedIds.length === jsonIds.length, `expected ${expectedIds.length} units, got ${jsonIds.length}`);

for (const id of expectedIds) {
  assert(id in jsonUnits, `unit "${id}" exists in JSON`);
  const src = UNIT_TYPES[id];
  const j = jsonUnits[id];
  assert(j.name === src.name, `${id}.name: "${j.name}" === "${src.name}"`);
  assert(j.icon === src.icon, `${id}.icon: "${j.icon}" === "${src.icon}"`);
  assert(j.hp === src.hp, `${id}.hp: ${j.hp} === ${src.hp}`);
  assert(j.damage === src.damage, `${id}.damage: ${j.damage} === ${src.damage}`);
  assert(j.range === src.range, `${id}.range: ${j.range} === ${src.range}`);
  assert(j.speed === src.speed, `${id}.speed: ${j.speed} === ${src.speed}`);
  assert(j.attackSpeed === src.attackSpeed, `${id}.attackSpeed: ${j.attackSpeed} === ${src.attackSpeed}`);
  assert(j.color === src.color, `${id}.color: ${j.color} === ${src.color} (0x${src.color.toString(16)})`);
  assert(j.size === src.size, `${id}.size: ${j.size} === ${src.size}`);
}

// Check formations
const expectedFIds = Object.keys(FORMATION_TYPES);
for (const id of expectedFIds) {
  assert(id in jsonFormations, `formation "${id}" exists in JSON`);
  assert(jsonFormations[id].name === FORMATION_TYPES[id].name, `${id}.name matches`);
  assert(jsonFormations[id].icon === FORMATION_TYPES[id].icon, `${id}.icon matches`);
  assert(jsonFormations[id].spacing === FORMATION_TYPES[id].spacing, `${id}.spacing matches`);
}

console.log('  All 8 units + 4 formations match hardcoded values');

// ═══════════════════════════════════════════════════════════════════
// TEST 2: Validation catches errors
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 2: DataLoader.validateUnits rejects bad definitions ━━━');

// Missing hp
let threw = false;
try {
  DataLoader.validateUnits({ units: { bad: { name: 'X', icon: 'X', damage: 10, range: 1, speed: 1, attackSpeed: 1, color: 0, size: 1 } } });
} catch (e) { threw = true; assert(e.message.includes('hp'), `missing hp error: ${e.message}`); }
assert(threw, 'rejects unit missing hp');

// Negative damage
threw = false;
try {
  DataLoader.validateUnits({ units: { bad: { name: 'X', icon: 'X', hp: 10, damage: -5, range: 1, speed: 1, attackSpeed: 1, color: 0, size: 1 } } });
} catch (e) { threw = true; assert(e.message.includes('damage'), `negative damage error: ${e.message}`); }
assert(threw, 'rejects negative damage');

// Zero size
threw = false;
try {
  DataLoader.validateUnits({ units: { bad: { name: 'X', icon: 'X', hp: 10, damage: 5, range: 1, speed: 1, attackSpeed: 1, color: 0, size: 0 } } });
} catch (e) { threw = true; assert(e.message.includes('size'), `zero size error: ${e.message}`); }
assert(threw, 'rejects zero size');

// Missing name
threw = false;
try {
  DataLoader.validateUnits({ units: { bad: { icon: 'X', hp: 10, damage: 5, range: 1, speed: 1, attackSpeed: 1, color: 0, size: 1 } } });
} catch (e) { threw = true; assert(e.message.includes('name'), `missing name error: ${e.message}`); }
assert(threw, 'rejects missing name');

// Valid unit passes
let result;
try {
  result = DataLoader.validateUnits({ units: { good: { name: 'Good', icon: '✓', hp: 10, damage: 5, range: 1, speed: 1, attackSpeed: 1, color: 0, size: 1 } } });
} catch { result = null; }
assert(result !== null, 'valid unit passes validation');
assert(result.get('good') !== undefined, 'valid unit returned in Map');

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Battle works with loaded data
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 3: Battle with loaded data (5v5 swordsmen vs spearmen) ━━━');

const { World } = await import('../src/ecs/World.js');
const { UnitFactory } = await import('../src/ecs/UnitFactory.js');
const { AISystem } = await import('../src/systems/AISystem.js');
const { CombatSystem } = await import('../src/systems/CombatSystem.js');
const { CleanupSystem } = await import('../src/systems/CleanupSystem.js');
const { EventBus } = await import('../src/core/EventBus.js');

// Load units via validateUnits (pure data, no fetch needed)
const loadedUnits = DataLoader.validateUnits(unitsJson);

// Verify loaded data matches what UnitFactory will use (UNIT_TYPES)
for (const [id, loaded] of loadedUnits) {
  const hardcoded = UNIT_TYPES[id];
  assert(loaded.hp === hardcoded.hp, `${id} loaded hp matches hardcoded`);
  assert(loaded.damage === hardcoded.damage, `${id} loaded damage matches hardcoded`);
}

const world = new World();
const factory = new UnitFactory(world);
const ai = new AISystem(world);
const combat = new CombatSystem(world);
const cleanup = new CleanupSystem(world);

// Spawn using loaded stats (same as UNIT_TYPES since they match)
factory.spawnSquad('swordsman', 5, { x: -10, z: 0 }, true, 2);
factory.spawnSquad('spearman', 5, { x: 10, z: 0 }, false, 2);

assert(world.entityCount === 10, `10 entities spawned, got ${world.entityCount}`);

let killCount = 0;
EventBus.on('combat:kill', () => { killCount++; });

const dt = 1 / 60;
let winner = null;
for (let frame = 0; frame < 3600; frame++) {
  ai.update(dt);
  combat.update(dt);
  cleanup.lateUpdate(dt);

  let redAlive = 0, blueAlive = 0;
  for (const e of world.query('team', 'health')) {
    const t = e.get('team'), h = e.get('health');
    if (t.side === 'red' && h.alive) redAlive++;
    if (t.side === 'blue' && h.alive) blueAlive++;
  }
  if (redAlive === 0 || blueAlive === 0) {
    winner = redAlive > 0 ? 'red' : 'blue';
    break;
  }
}

assert(winner !== null, `battle resolved with winner: ${winner}`);
assert(killCount >= 5, `at least 5 kills, got ${killCount}`);
console.log(`  Winner: ${winner}, kills: ${killCount}`);

// ═══════════════════════════════════════════════════════════════════
// TEST 4: Custom unit works
// ═══════════════════════════════════════════════════════════════════
console.log('\n━━━ TEST 4: Custom unit (Berserker) ━━━');

const customData = {
  units: {
    berserker: {
      name: 'Berserker',
      icon: '🪓',
      hp: 120,
      damage: 30,
      range: 2,
      speed: 6,
      attackSpeed: 1.2,
      color: 0xff2200,
      size: 1.1
    }
  }
};

const customResult = DataLoader.validateUnits(customData);
assert(customResult.has('berserker'), 'custom unit validated');
const berserker = customResult.get('berserker');
assert(berserker.hp === 120, `berserker hp: ${berserker.hp}`);
assert(berserker.damage === 30, `berserker damage: ${berserker.damage}`);
assert(berserker.range === 2, `berserker range: ${berserker.range}`);
assert(berserker.speed === 6, `berserker speed: ${berserker.speed}`);
assert(berserker.attackSpeed === 1.2, `berserker attackSpeed: ${berserker.attackSpeed}`);

// Spawn a custom unit directly using factory with merged types
const world2 = new World();
const factory2 = new UnitFactory(world2);

// Temporarily inject custom type for spawn test
const orig = UNIT_TYPES.berserker;
UNIT_TYPES.berserker = berserker;
try {
  const entity = factory2.spawn('berserker', 0, 0, 0, true);
  const health = entity.get('health');
  const combatComp = entity.get('combat');
  assert(health.hp === 120, `spawned berserker hp: ${health.hp}`);
  assert(health.maxHp === 120, `spawned berserker maxHp: ${health.maxHp}`);
  assert(combatComp.damage === 30, `spawned berserker damage: ${combatComp.damage}`);
  assert(combatComp.range === 2, `spawned berserker range: ${combatComp.range}`);
  console.log('  Custom Berserker unit spawned with correct stats');
} finally {
  if (orig === undefined) delete UNIT_TYPES.berserker;
  else UNIT_TYPES.berserker = orig;
}

// ═══════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('✅ PASS — Data-driven units work correctly');
  process.exit(0);
} else {
  console.log('❌ FAIL');
  process.exit(1);
}
