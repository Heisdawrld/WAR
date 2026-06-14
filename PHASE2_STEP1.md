# PHASE 2, STEP 1 — SPEC: Spatial Hash (Scale to 10K units)
> Lead Architect: Arena.ai Agent | Implementers: MiMo (both tracks)
> Goal: Replace O(n²) enemy search with O(n) spatial hashing.

## Why
`FindTarget` (src/ai/tasks/FindTarget.js) brute-forces every enemy entity each tick → O(n²).
At 500 units that's ~250k checks/frame. At 5,000 it's 25M. This is the scaling wall.
A uniform-grid spatial hash makes nearest-enemy lookup O(k) where k = entities in nearby cells.

## Deliverable A1: `src/utils/SpatialHash.js`
Uniform-grid spatial hash. Pure data structure, no Three.js.

```js
export class SpatialHash {
  constructor(cellSize = 20) { this.cellSize = cellSize; this.cells = new Map(); }
  _key(x, z) { return `${Math.floor(x/this.cellSize)},${Math.floor(z/this.cellSize)}`; }
  clear() { this.cells.clear(); }
  insert(id, x, z) { /* add id to bucket at _key(x,z) */ }
  queryRadius(x, z, radius) {
    // Return all ids in cells overlapping the circle (x,z,radius).
    // Iterate cell coords from floor((x-radius)/cellSize) to ceil((x+radius)/cellSize), same for z.
    // Collect ids from each cell. Does NOT dedupe (ids live in one cell only, so no dupes).
    // Return array of ids.
  }
}
```
- Cell size default 20 (engage range is 40, so query checks ~5x5 neighborhood — cheap).
- Store ids as arrays in a Map keyed by "cx,cz".

## Deliverable A2: `src/systems/SpatialIndexSystem.js`
Rebuilds the spatial hash every frame so `FindTarget` can query it.

```js
import { SpatialHash } from '../utils/SpatialHash.js';
export class SpatialIndexSystem {
  constructor(world) { this.world = world; this.hash = new SpatialHash(20); }
  update(dt) {
    this.hash.clear();
    for (const e of this.world.query('transform', 'team', 'health')) {
      const tx = e.get('transform'), hp = e.get('health');
      if (!tx || !hp.alive) continue;
      this.hash.insert(e.id, tx.x, tx.z);
    }
    this.world.spatial = this.hash;  // expose for FindTarget
  }
}
```
Register in Bootstrapper BEFORE AISystem:
```js
this._add(new SpatialIndexSystem(this.world), 'update', 50);  // runs first (highest priority)
```
Ensure priority order: SpatialIndex(50) → AI(10) → Projectile(18→ adjust if needed) → Combat(20).
NOTE: priorities are sorted descending, so 50 runs before 10. Confirm by reading Engine.addSystem.

## Deliverable A3: Modify `src/ai/tasks/FindTarget.js`
Use the spatial hash if present, else fall back to brute force (backwards-compatible).

```js
tick(bb, dt) {
  const world = bb.world, tx = bb.transform, team = bb.team;
  if (!world || !tx || !team) return BTStatus.FAILURE;
  const engageRange = bb.engageRange ?? 40;
  let nearest = null, nearestDist2 = engageRange ** 2;

  // --- FAST PATH: spatial hash ---
  if (world.spatial) {
    const candidates = world.spatial.queryRadius(tx.x, tx.z, engageRange);
    for (const id of candidates) {
      const e = world.getEntity(id); if (!e) continue;
      const et = e.get('team'), eh = e.get('health'), etx = e.get('transform');
      if (!et || !eh || !etx || !eh.alive || !team.isEnemyOf(et)) continue;
      const dx = etx.x - tx.x, dz = etx.z - tx.z, d2 = dx*dx + dz*dz;
      if (d2 < nearestDist2) { nearestDist2 = d2; nearest = e; }
    }
    bb.target = nearest || null;
    return nearest ? BTStatus.SUCCESS : BTStatus.FAILURE;
  }

  // --- FALLBACK: brute force (unchanged original) ---
  const enemies = world.query('transform', 'health', 'team');
  for (const e of enemies) { /* ...original logic... */ }
  bb.target = nearest || null;
  return nearest ? BTStatus.SUCCESS : BTStatus.FAILURE;
}
```

## Deliverable B: `test/spatial-benchmark.test.js`
Two purposes: (1) correctness, (2) performance comparison.

### Correctness tests
- Build World + UnitFactory + SpatialIndexSystem
- Spawn 50 units mixed teams spread across the field
- Run SpatialIndexSystem.update() once
- For a sample of 5 entities, compare FindTarget's result (via spatial hash) vs brute-force nearest enemy
- Assert they return the SAME nearest enemy every time

### Performance benchmark
- For N in [100, 500, 1000, 2000]: spawn N units (half red, half blue), run SpatialIndexSystem.update()
- Time 100 FindTarget queries using the hash
- Time 100 FindTarget queries using brute force (temporarily set world.spatial = null)
- Print a table: N | hash_ms | brute_ms | speedup
- Assert: at N=1000, hash is faster than brute force (speedup > 1.5x)

### Regression check
- Run the existing battle (spawn squads, run AI loop with spatial system active)
- Assert battle still resolves with a winner (hash doesn't break gameplay)

## Acceptance Criteria
- [ ] `node test/spatial-benchmark.test.js` prints PASS with a benchmark table
- [ ] Hash and brute-force return identical nearest-enemy results (correctness)
- [ ] At 1000+ units, hash is meaningfully faster (speedup > 1.5x)
- [ ] Existing battles still resolve (no gameplay regression)
- [ ] `vite build` succeeds
- [ ] All 4 existing test suites still pass

## What NOT to do
- Do NOT modify any system other than Bootstrapper (registration) and FindTarget (integration)
- Do NOT remove the brute-force fallback in FindTarget
- Do NOT add npm dependencies
