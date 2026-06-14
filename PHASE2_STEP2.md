# PHASE 2, STEP 2 — SPEC: Data-Driven Units (Modding Foundation)
> Lead: Arena.ai Agent | Implementer: MiMo Code Agent
> Goal: Move unit definitions from hardcoded JS into data. Foundation of the content platform.

## Why
`src/entities/UnitTypes.js` hardcodes all 8 units. Adding a unit means editing code.
The $10B vision is a *platform* — users create units without touching code. Step 1 of that:
separate data from code, with a loader + schema validation.

## Deliverable A: `src/data/units.json`
Extract every field from `UNIT_TYPES` into pure JSON. Exact same values, just data.

```json
{
  "version": 1,
  "units": {
    "swordsman": {
      "name": "Swordsman", "icon": "⚔️",
      "hp": 100, "damage": 15, "range": 2.5, "speed": 5, "attackSpeed": 1.0,
      "color": 8389692, "special": "shield", "shieldChance": 0.25, "size": 1.0
    },
    ...
  }
}
```
NOTE: Three.js colors are numbers (0xcc4444 = 13402180). Convert ALL hex to decimal ints.
Keep formation types in a separate file or section (they don't belong in units.json).

## Deliverable B: `src/data/formations.json`
```json
{
  "version": 1,
  "formations": {
    "line": { "name": "Line", "icon": "━━━", "spacing": 3 },
    ...
  }
}
```

## Deliverable C: `src/data/DataLoader.js`
Loads + validates JSON, with a schema check.

```js
export class DataLoader {
  static async loadUnits(url = '/src/data/units.json') {
    const res = await fetch(url);
    const data = await res.json();
    return DataLoader.validateUnits(data);
  }
  static validateUnits(data) {
    // Required fields per unit: name, icon, hp, damage, range, speed, attackSpeed, color, size
    // Throw with a clear message if any unit is missing a required field
    // Clamp numeric ranges (hp > 0, damage >= 0, size > 0, etc.)
    // Return a Map identical in shape to the old UNIT_TYPES object
  }
  static async loadFormations(url = '/src/data/formations.json') {
    const res = await fetch(url);
    const data = await res.json();
    return DataLoader.validateFormations(data);
  }
}
```

## Deliverable D: Modify `src/entities/UnitTypes.js`
Keep the file but make it load from JSON at init. For backwards compatibility (tests, 
headless Node usage that can't fetch), keep the hardcoded values as a FALLBACK:

```js
// units.json is the source of truth in-browser. This fallback is for headless tests.
export const UNIT_TYPES = { /* ...same hardcoded values... */ };
export const FORMATION_TYPES = { /* ...same hardcoded values... */ };
export async function loadUnitData() {
  try {
    const units = await DataLoader.loadUnits();
    return units;
  } catch { return UNIT_TYPES; }  // fallback
}
```
The key requirement: existing code that imports UNIT_TYPES must keep working unchanged.

## Deliverable E: `test/data-driven.test.js`

### Test 1: JSON matches hardcoded values
- Load units.json directly (use fs.readFile in Node, since fetch isn't available)
- Compare every field against the exported UNIT_TYPES
- Assert: identical hp, damage, range, speed, attackSpeed, color, size, etc.

### Test 2: Validation catches errors
- Create a malformed unit definition (missing 'hp', negative 'damage', zero 'size')
- Run DataLoader.validateUnits()
- Assert: it throws a clear error for each bad case

### Test 3: Battle works with loaded data
- Load units.json, build a World + UnitFactory-style spawn using loaded stats
- (Since UnitFactory imports UNIT_TYPES directly, test that spawning with loaded
  values produces entities with the same component stats as hardcoded)
- Run a quick 5v5 battle, assert it resolves

### Test 4: Adding a custom unit works
- Define a custom unit JSON: { name: "Berserker", hp: 120, damage: 30, range: 2, ... }
- Validate it, then confirm it can be spawned and has correct stats

## Acceptance Criteria
- [ ] `node test/data-driven.test.js` prints PASS
- [ ] units.json values exactly match the old hardcoded UNIT_TYPES
- [ ] DataLoader.validateUnits rejects malformed definitions with clear errors
- [ ] Custom units can be defined and spawned
- [ ] All 5 existing test suites still pass (no regression)
- [ ] `vite build` succeeds
- [ ] No changes to how main.js or ECSUnitManager import UNIT_TYPES

## What NOT to do
- Do NOT break the existing UNIT_TYPES export (backwards compat is mandatory)
- Do NOT modify UnitFactory, ECSUnitManager, or any system
- Do NOT add npm dependencies
