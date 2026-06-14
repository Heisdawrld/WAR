import { BattleEncoder } from '../src/replay/BattleEncoder.js';
import { ReplayController } from '../src/replay/ReplayController.js';
import { EventBus } from '../src/core/EventBus.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) pass++; else { fail++; console.error(`  FAIL: ${msg}`); }
}

// ─── Test 1: Setup building from unit list matches encoder format ────
console.log('\n━━━ TEST 1: Setup building matches encoder round-trip ━━━');

const mockUnits = [
  { type: 'swordsman', x: -20, z: 0, side: 'red' },
  { type: 'spearman', x: 20, z: 0, side: 'blue' },
  { type: 'archer', x: -15, z: 5.3, side: 'red' },
  { type: 'knight', x: 15, z: -5.3, side: 'blue' },
];

const builtSetup = {
  seed: 42,
  formation: 'line',
  units: mockUnits,
};

const code = BattleEncoder.encode(builtSetup);
assert(typeof code === 'string' && code.length > 0, 'encode returns non-empty string');

const decoded = BattleEncoder.decode(code);
assert(decoded !== null, 'decode returns non-null');
assert(decoded.seed === builtSetup.seed, 'seed preserved through round-trip');
assert(decoded.formation === builtSetup.formation, 'formation preserved through round-trip');
assert(decoded.units.length === builtSetup.units.length, 'unit count preserved');

let allMatch = true;
for (let i = 0; i < builtSetup.units.length; i++) {
  const orig = builtSetup.units[i], dec = decoded.units[i];
  if (orig.type !== dec.type || orig.side !== dec.side ||
      Math.abs(orig.x - dec.x) > 0.01 || Math.abs(orig.z - dec.z) > 0.01) {
    allMatch = false;
    console.error(`    Unit ${i} mismatch: orig=${JSON.stringify(orig)} dec=${JSON.stringify(dec)}`);
    break;
  }
}
assert(allMatch, 'all units match after round-trip');

// ─── Test 2: Seed propagation via ReplayController ──────────────────
console.log('\n━━━ TEST 2: Seed propagation through ReplayController ━━━');

const setup2 = {
  seed: 42,
  formation: 'line',
  units: [
    { type: 'swordsman', x: -10, z: 0, side: 'red' },
    { type: 'spearman', x: 10, z: 0, side: 'blue' },
    { type: 'swordsman', x: -12, z: 2, side: 'red' },
    { type: 'spearman', x: 12, z: -2, side: 'blue' },
  ],
};

const bundle = ReplayController.create(setup2);
assert(bundle !== null, 'ReplayController.create returns a bundle');
assert(bundle.rng !== null, 'bundle has rng (seed-based)');
assert(bundle.world !== null, 'bundle has world');

let redAlive = 0, blueAlive = 0;
for (const e of bundle.world.query('team', 'health')) {
  const t = e.get('team'), h = e.get('health');
  if (h.alive) {
    if (t.side === 'red') redAlive++;
    else blueAlive++;
  }
}
assert(redAlive === 2, `2 red units spawned (got ${redAlive})`);
assert(blueAlive === 2, `2 blue units spawned (got ${blueAlive})`);

const damageEvents = [];
const unsub = EventBus.on('combat:damage:dealt', e => damageEvents.push(e.damage));

let result;
for (let frame = 0; frame < 1800; frame++) {
  result = ReplayController.step(bundle, 1 / 60);
  if (result.winner) break;
}
unsub();
assert(result.winner !== null, `battle resolves with a winner: ${result.winner}`);
assert(damageEvents.length > 0, `damage events occurred: ${damageEvents.length}`);

const setup2b = {
  seed: 42,
  formation: 'line',
  units: setup2.units.map(u => ({ ...u })),
};
const bundle2b = ReplayController.create(setup2b);
const damageEvents2 = [];
const unsub2 = EventBus.on('combat:damage:dealt', e => damageEvents2.push(e.damage));

let result2;
for (let frame = 0; frame < 1800; frame++) {
  result2 = ReplayController.step(bundle2b, 1 / 60);
  if (result2.winner) break;
}
unsub2();
assert(result.winner === result2.winner, `same seed same winner: ${result.winner} vs ${result2.winner}`);
assert(damageEvents.length === damageEvents2.length, `same damage count: ${damageEvents.length} vs ${damageEvents2.length}`);

let dmgMatch = true;
for (let i = 0; i < Math.min(damageEvents.length, damageEvents2.length); i++) {
  if (damageEvents[i] !== damageEvents2[i]) { dmgMatch = false; break; }
}
assert(dmgMatch, 'identical damage events for same seed');

// ─── Test 3: Share URL format validity ──────────────────────────────
console.log('\n━━━ TEST 3: Share URL format validity ━━━');

const setup3 = {
  seed: 123,
  formation: 'wedge',
  units: [
    { type: 'knight', x: -8, z: 3, side: 'red' },
    { type: 'archer', x: 8, z: -3, side: 'blue' },
    { type: 'horseman', x: -15, z: -5, side: 'red' },
    { type: 'musketeer', x: 15, z: 5, side: 'blue' },
  ],
};

const shareCode = BattleEncoder.encode(setup3);
assert(typeof shareCode === 'string' && shareCode.length > 0, 'share code is non-empty string');

const urlHash = '#battle=' + shareCode;
assert(urlHash.startsWith('#battle='), 'URL hash starts with #battle=');

const codeFromHash = urlHash.substring(8);
assert(codeFromHash === shareCode, 'code extracted from hash matches original');

const fromUrl = BattleEncoder.decode(codeFromHash);
assert(fromUrl !== null, 'decode from URL hash succeeds');
assert(fromUrl.seed === setup3.seed, 'seed matches from URL');
assert(fromUrl.formation === setup3.formation, 'formation matches from URL');
assert(fromUrl.units.length === setup3.units.length, 'unit count matches from URL');

let urlUnitsMatch = true;
for (let i = 0; i < setup3.units.length; i++) {
  const orig = setup3.units[i], dec = fromUrl.units[i];
  if (orig.type !== dec.type || orig.side !== dec.side ||
      Math.abs(orig.x - dec.x) > 0.01 || Math.abs(orig.z - dec.z) > 0.01) {
    urlUnitsMatch = false;
    console.error(`    URL unit ${i} mismatch: orig=${JSON.stringify(orig)} dec=${JSON.stringify(dec)}`);
    break;
  }
}
assert(urlUnitsMatch, 'all units match when decoded from URL hash format');

// ═══════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('PASS — Replay URL integration verified');
  process.exit(0);
} else {
  console.log('FAIL');
  process.exit(1);
}
