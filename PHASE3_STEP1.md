# PHASE 3, STEP 1 — SPEC: Shareable Battle Replays
> Lead: Arena.ai Agent | Implementer: MiMo Code Agent
> Goal: A battle is encodable as a short string → shareable as a URL → replays identically.

## Why
This is THE viral lever. A battle becomes `#battle=base64string`. Player shares link → 
friend opens → exact same battle plays out. We already have determinism (same seed = same battle).
Now we make it portable.

## Architecture
```
Battle Setup (units, positions, sides) + Seed
        ↓ encode()
   Compact JSON → base64 string
        ↓
   URL: /#battle=eyJzZWVkIj...
        ↓ decode()
   Recreate exact battle → replay
```

## Deliverable A: `src/replay/BattleEncoder.js`

Encodes/decodes a battle setup to/from a compact string. Pure logic, no Three.js.

### Contract
```js
export class BattleEncoder {
  /**
   * Encode a battle setup into a compact base64 string.
   * @param {Object} setup
   *   - seed: number (the SeedRandom seed)
   *   - units: Array of { type: string, x: number, z: number, side: 'red'|'blue' }
   *   - formation: string (optional, default 'line')
   * @returns string — base64-encoded, URL-safe
   */
  static encode(setup) {
    // 1. Build compact JSON (short keys to minimize size)
    //    Use keys: s (seed), f (formation), u (units array)
    //    Each unit: [typeIndex, x, z, sideIndex] — arrays are smaller than objects
    //    Use integer coords (multiply by 10, round) to avoid float noise
    // 2. JSON.stringify
    // 3. Base64 encode, make URL-safe (replace +/= with -_~)
    // 4. Return string
  }

  /**
   * Decode a battle string back into a setup object.
   * @param string — base64-encoded, URL-safe
   * @returns { seed, units: [{type, x, z, side}], formation } | null if invalid
   */
  static decode(str) {
    // 1. Reverse URL-safe base64
    // 2. JSON.parse
    // 3. Expand compact format back to full objects
    // 4. Validate (return null on any parse error, never throw)
  }
}
```

### Compact format design
To keep URLs short, use arrays not objects:
```json
{
  "s": 42,                          // seed
  "f": "line",                      // formation
  "u": [
    [0, -200, 0, 0],               // [typeIndex, x*10, z*10, sideIndex(0=red,1=blue)]
    [0, -180, 20, 0],
    [2, 200, 0, 1]                  // typeIndex 2 = archer, sideIndex 1 = blue
  ]
}
```
- typeIndex maps to an array: ['swordsman','spearman','archer','knight','horseman','musketeer','giant','catapult']
- sideIndex: 0 = red, 1 = blue
- Coordinates ×10 then rounded to integer (1 decimal place precision is enough for placement)

## Deliverable B: `src/replay/ReplayController.js`

Runs a decoded battle deterministically. Connects encoder to ECS.

### Contract
```js
import { World } from '../ecs/World.js';
import { UnitFactory } from '../ecs/UnitFactory.js';
import { AISystem } from '../systems/AISystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { CleanupSystem } from '../systems/CleanupSystem.js';
import { SeedRandom } from '../utils/SeedRandom.js';

export class ReplayController {
  /**
   * Build a full ECS battle from a decoded setup object.
   * @returns { world, factory, ai, projectiles, combat, cleanup, seed }
   */
  static create(setup) {
    // 1. Create World, UnitFactory, AISystem (with SeedRandom(setup.seed) injected)
    // 2. ProjectileSystem, CombatSystem, CleanupSystem
    // 3. For each unit in setup: factory.spawn(type, x, 0, z, isRed)
    // 4. Return the bundle
  }

  /**
   * Step the battle one frame. Returns current alive counts.
   * @returns { redAlive, blueAlive, winner } 
   */
  static step(bundle, dt) {
    // Run: ai.update, projectiles.update, combat.update, cleanup.lateUpdate
    // Return alive counts + winner (or null if battle ongoing)
  }
}
```

## Deliverable C: `test/replay.test.js`

### Test 1: Encode/decode round-trip
- Create a setup with 10 units (mixed types, both sides, various positions) + seed 42
- Encode → decode → compare
- Assert: decoded seed, unit count, positions, types, sides all match original

### Test 2: URL-safe encoding
- Encode a setup
- Assert: string contains only URL-safe characters (A-Za-z0-9-_~)
- Assert: no +, /, or = in the string

### Test 3: Replayed battle = deterministic battle
- Create setup: 5 swordsmen (red) + 5 spearmen (blue) + seed 42
- Run via ReplayController for 1800 frames, record damage events + winner
- Then encode the setup, decode it, run AGAIN via ReplayController
- Assert: identical damage events, identical winner (replay matches original)

### Test 4: Different seed in replay = different battle
- Same setup but seed 999
- Assert: different damage events or different winner

### Test 5: Invalid string returns null
- decode("!!!invalid!!!") → null (no throw)
- decode("") → null
- decode(null) → null

### Test 6: Compact size
- Encode a 20-unit battle
- Assert: encoded string < 500 characters (short enough for a URL)

## Acceptance Criteria
- [ ] `node test/replay.test.js` prints PASS
- [ ] Encode/decode is lossless (round-trip preserves all data)
- [ ] Replayed battle is byte-identical to original (same seed → same result)
- [ ] Encoded string is URL-safe and compact (<500 chars for 20 units)
- [ ] Invalid input returns null, never throws
- [ ] All 7 existing test suites still pass
- [ ] `vite build` succeeds

## What NOT to do
- Do NOT modify main.js yet (URL parsing + UI integration is Step 2)
- Do NOT add npm dependencies
- Do NOT modify existing ECS files
