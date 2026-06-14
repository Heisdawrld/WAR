import { BattleEncoder } from '../src/replay/BattleEncoder.js';
import { ReplayController } from '../src/replay/ReplayController.js';
import { EventBus } from '../src/core/EventBus.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) pass++; else { fail++; console.error(`  FAIL: ${msg}`); }
}

// ─── Test 1: Round-trip lossless ──────────────────────────────────
console.log('\n━━━ TEST 1: Encode/decode round-trip ━━━');

const setup1 = {
  seed: 42,
  formation: 'line',
  units: [
    { type: 'swordsman', x: -20, z: 0, side: 'red' },
    { type: 'spearman', x: 20, z: 0, side: 'blue' },
    { type: 'archer', x: -15, z: 5.3, side: 'red' },
    { type: 'knight', x: 15, z: -5.3, side: 'blue' },
    { type: 'horseman', x: -10, z: 10, side: 'red' },
    { type: 'musketeer', x: 10, z: -10, side: 'blue' },
    { type: 'giant', x: -5, z: 2.1, side: 'red' },
    { type: 'catapult', x: 5, z: -2.1, side: 'blue' },
    { type: 'swordsman', x: -25, z: 8, side: 'red' },
    { type: 'spearman', x: 25, z: -8, side: 'blue' },
  ],
};

const encoded1 = BattleEncoder.encode(setup1);
const decoded1 = BattleEncoder.decode(encoded1);

assert(decoded1 !== null, 'decoded is not null');
assert(decoded1.seed === setup1.seed, `seed matches: ${decoded1.seed} vs ${setup1.seed}`);
assert(decoded1.formation === setup1.formation, `formation matches: ${decoded1.formation} vs ${setup1.formation}`);
assert(decoded1.units.length === setup1.units.length, `unit count matches: ${decoded1.units.length} vs ${setup1.units.length}`);

let allMatch = true;
for (let i = 0; i < setup1.units.length; i++) {
  const orig = setup1.units[i], dec = decoded1.units[i];
  if (orig.type !== dec.type || orig.side !== dec.side ||
      Math.abs(orig.x - dec.x) > 0.01 || Math.abs(orig.z - dec.z) > 0.01) {
    allMatch = false;
    console.error(`    Unit ${i} mismatch: orig=${JSON.stringify(orig)} dec=${JSON.stringify(dec)}`);
    break;
  }
}
assert(allMatch, 'all units match after round-trip');

// ─── Test 2: URL-safe chars only ──────────────────────────────────
console.log('\n━━━ TEST 2: URL-safe encoding ━━━');

const encoded2 = BattleEncoder.encode(setup1);
const urlSafe = /^[A-Za-z0-9\-_~]*$/;
assert(urlSafe.test(encoded2), `encoded string is URL-safe: ${encoded2.substring(0, 40)}...`);
assert(!encoded2.includes('+'), 'no + in encoded string');
assert(!encoded2.includes('/'), 'no / in encoded string');
assert(!encoded2.includes('='), 'no = in encoded string');

// ─── Test 3: Replayed battle matches original ─────────────────────
console.log('\n━━━ TEST 3: Replayed battle = deterministic battle ━━━');

const setup3 = {
  seed: 42,
  formation: 'line',
  units: [],
};
for (let i = 0; i < 5; i++) {
  setup3.units.push({ type: 'swordsman', x: -20 + i * 2, z: 0, side: 'red' });
  setup3.units.push({ type: 'spearman', x: 20 - i * 2, z: 0, side: 'blue' });
}

function runBattle(setup) {
  const bundle = ReplayController.create(setup);
  const damageEvents = [];
  const killEvents = [];
  const unsubDamage = EventBus.on('combat:damage:dealt', e => damageEvents.push(e.damage));
  const unsubKill = EventBus.on('combat:kill', e => killEvents.push(e.targetId));

  let result;
  for (let frame = 0; frame < 1800; frame++) {
    result = ReplayController.step(bundle, 1 / 60);
    if (result.winner) break;
  }
  unsubDamage();
  unsubKill();
  return { damageEvents, killEvents, winner: result.winner };
}

const battleOrig = runBattle(setup3);

const decoded3 = BattleEncoder.decode(BattleEncoder.encode(setup3));
const battleReplay = runBattle(decoded3);

assert(battleOrig.winner === battleReplay.winner,
  `same winner: ${battleOrig.winner} vs ${battleReplay.winner}`);
assert(battleOrig.damageEvents.length === battleReplay.damageEvents.length,
  `same damage count: ${battleOrig.damageEvents.length} vs ${battleReplay.damageEvents.length}`);

let damageMatch3 = true;
for (let i = 0; i < Math.min(battleOrig.damageEvents.length, battleReplay.damageEvents.length); i++) {
  if (battleOrig.damageEvents[i] !== battleReplay.damageEvents[i]) {
    damageMatch3 = false;
    console.error(`    Damage mismatch at ${i}: ${battleOrig.damageEvents[i]} vs ${battleReplay.damageEvents[i]}`);
    break;
  }
}
assert(damageMatch3, 'all damage events match between original and replay');

// ─── Test 4: Different seed differs ───────────────────────────────
console.log('\n━━━ TEST 4: Different seed differs ━━━');

const setup4 = {
  seed: 999,
  formation: 'line',
  units: setup3.units.map(u => ({ ...u })),
};
const battle4 = runBattle(setup4);

const differs = battleOrig.winner !== battle4.winner
  || battleOrig.damageEvents.length !== battle4.damageEvents.length
  || battleOrig.damageEvents.some((d, i) => d !== battle4.damageEvents[i]);

assert(differs, `different seed (999) produces different outcome: orig=${battleOrig.winner}(${battleOrig.damageEvents.length}dmg) vs 999=${battle4.winner}(${battle4.damageEvents.length}dmg)`);

// ─── Test 5: Invalid input returns null ───────────────────────────
console.log('\n━━━ TEST 5: Invalid input returns null ━━━');

assert(BattleEncoder.decode('!!!invalid!!!') === null, 'invalid string returns null');
assert(BattleEncoder.decode('') === null, 'empty string returns null');
assert(BattleEncoder.decode(null) === null, 'null input returns null');
assert(BattleEncoder.decode(undefined) === null, 'undefined input returns null');

// ─── Test 6: Compact size ─────────────────────────────────────────
console.log('\n━━━ TEST 6: 20-unit encode < 500 chars ━━━');

const setup6 = {
  seed: 42,
  formation: 'line',
  units: [],
};
const types6 = ['swordsman', 'spearman', 'archer', 'knight', 'horseman', 'musketeer', 'giant', 'catapult'];
for (let i = 0; i < 20; i++) {
  setup6.units.push({
    type: types6[i % types6.length],
    x: -20 + (i % 10) * 4,
    z: Math.floor(i / 10) * 4 - 2,
    side: i % 2 === 0 ? 'red' : 'blue',
  });
}
const encoded6 = BattleEncoder.encode(setup6);
console.log(`  Encoded length: ${encoded6.length} chars`);
assert(encoded6.length < 500, `encoded string < 500 chars (got ${encoded6.length})`);

// ═══════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(60)}`);
if (fail === 0) {
  console.log('PASS — Replay encode/decode/replay all verified');
  process.exit(0);
} else {
  console.log('FAIL');
  process.exit(1);
}
