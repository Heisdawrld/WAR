import { World } from '../src/ecs/World.js';
import { UnitFactory } from '../src/ecs/UnitFactory.js';

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error(`FAIL: ${msg}`); }
}

const world = new World();
const factory = new UnitFactory(world);

const swordsman = factory.spawn('swordsman', 0, 0, 0, true);
assert(swordsman.has('transform'), 'swordsman has transform');
assert(swordsman.has('health'), 'swordsman has health');
assert(swordsman.has('combat'), 'swordsman has combat');
assert(swordsman.has('team'), 'swordsman has team');
assert(swordsman.has('unitType'), 'swordsman has unitType');
assert(swordsman.has('aiState'), 'swordsman has aiState');

const squad = factory.spawnSquad('archer', 10, { x: 5, z: 0 }, false);
assert(squad.length === 10, `spawnSquad returned 10 entities, got ${squad.length}`);

assert(world.entityCount === 11, `entityCount === 11, got ${world.entityCount}`);

const withTransform = world.query('transform', 'team');
assert(withTransform.length === 11, `query(transform,team).length === 11, got ${withTransform.length}`);

const combat = swordsman.get('combat');
assert(combat.damage === 15, `swordsman damage === 15, got ${combat.damage}`);

const health = swordsman.get('health');
assert(health.hp === 100, `swordsman hp === 100, got ${health.hp}`);

const team = swordsman.get('team');
assert(team.isRed === true, 'swordsman is red');

const archerCombat = squad[0].get('combat');
assert(archerCombat.damage === 10, `archer damage === 10, got ${archerCombat.damage}`);
assert(archerCombat.isRanged === true, 'archer is ranged');
assert(archerCombat.range === 30, `archer range === 30, got ${archerCombat.range}`);

const archerHealth = squad[0].get('health');
assert(archerHealth.hp === 60, `archer hp === 60, got ${archerHealth.hp}`);

const archerTeam = squad[0].get('team');
assert(archerTeam.isBlue === true, 'archer is blue');

const unitType = swordsman.get('unitType');
assert(unitType.id === 'swordsman', `unitType.id === swordsman, got ${unitType.id}`);
assert(unitType.speed === 5, `unitType.speed === 5, got ${unitType.speed}`);

factory.clearAll();
assert(world.entityCount === 0, `clearAll made entityCount 0, got ${world.entityCount}`);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log('PASS');
  process.exit(0);
} else {
  console.log('FAIL');
  process.exit(1);
}
