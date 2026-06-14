# PHASE 3, STEP 2 — SPEC: Replay URL Integration
> Lead: Arena.ai Agent | Implementer: MiMo Code Agent
> Goal: Open a shared link → battle auto-loads and plays. Also add a "Share" button.

## Why
We built the encoder/decoder (Step 1). Now we wire it into the actual game:
- Player builds an army, hits "Share" → gets a link
- Anyone opening that link sees the exact same battle replay

## Deliverable A: Modify `src/main.js` — URL replay loading

On game init, check the URL hash for a battle code:
```js
async init() {
  // ... existing init code ...
  
  // AFTER showScreen('main-menu'), check for shared battle
  const hash = window.location.hash;
  if (hash.startsWith('#battle=')) {
    const code = hash.substring(8);
    const setup = BattleEncoder.decode(code);
    if (setup) {
      this.loadSharedBattle(setup);
    }
  }
}

loadSharedBattle(setup) {
  // 1. Clear existing units
  this.unitManager.clearAll();
  
  // 2. Spawn units from the decoded setup
  for (const unit of setup.units) {
    const pos = new THREE.Vector3(unit.x, 0, unit.z);
    this.unitManager.addUnit(unit.type, pos, unit.side);
  }
  
  // 3. Set the formation
  this.selectedFormation = setup.formation || 'line';
  
  // 4. Set the deterministic seed
  this.ecsGame.setSeed(setup.seed);
  
  // 5. Sync positions to ECS
  this.unitManager.syncToECS();
  
  // 6. Jump straight to battle (skip army builder)
  this.battleTime = 0;
  this.ui.hideHint();
  this.audio.playSfx('fight');
  this.ui.showScreen('battle');
  this.state = 'battle';
  this.ui.updateBattleHUD(this.unitManager.getStats());
  
  // 7. Show a banner: "Replaying shared battle"
  this.ui.showHint('▶ Replaying shared battle');
}

shareCurrentBattle() {
  // Called from a Share button
  // 1. Build setup object from current units
  const units = this.unitManager.units
    .filter(u => u.alive)
    .map(u => ({ type: u.type, x: Math.round(u.position.x * 10) / 10, z: Math.round(u.position.z * 10) / 10, side: u.side }));
  
  // 2. Get current seed (or generate one if not set)
  const seed = this.ecsGame.getSeed();
  
  // 3. Encode
  const code = BattleEncoder.encode({ seed, units, formation: this.selectedFormation });
  
  // 4. Build URL
  const url = `${window.location.origin}${window.location.pathname}#battle=${code}`;
  
  // 5. Copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    this.ui.showHint('🔗 Battle link copied to clipboard! Share it anywhere.');
  }).catch(() => {
    // Fallback: show the URL in a prompt
    prompt('Copy this battle link:', url);
  });
}
```

Add `import { BattleEncoder } from './replay/BattleEncoder.js';` at top of main.js.

## Deliverable B: Add Share button to UI

In the army-builder screen and results screen, add a "Share Battle" button.
The simplest approach — add it to the existing `handleAction` switch:
```js
case 'share-battle':
  this.shareCurrentBattle();
  break;
```

MiMo should:
1. Read `src/main.js` to understand the current UI structure
2. Read `index.html` to find where buttons live
3. Add a Share button to the battle HUD (visible during battle) and results screen
4. Wire it to `handleAction('share-battle')`

The button should be unobtrusive — a 🔗 icon in the top bar during battle.

## Deliverable C: `test/replay-url.test.js`

Since we can't test browser URL handling in Node, test the SETUP BUILDING logic:

### Test 1: Building setup from unit list matches encoder format
- Create a mock unit list (like ECSUnitManager.units would have)
- Build the setup object, encode it, decode it, verify round-trip

### Test 2: Seed propagation
- Create a setup with seed 42
- Verify ReplayController.create() produces an AISystem with the correct seed
- Run a battle, verify it matches the determinism test results

### Test 3: Share URL format
- Encode a battle
- Assert it can be prefixed with `#battle=` and is valid
- Decode it back from that format

## Acceptance Criteria
- [ ] URL hash `#battle=<code>` loads a battle on page open
- [ ] Share button generates a URL and copies to clipboard
- [ ] Seed is set via ecsGame.setSeed() for deterministic replay
- [ ] Shared battle skips army builder and goes straight to battle
- [ ] All 8 existing test suites still pass
- [ ] `vite build` succeeds
- [ ] No browser-only APIs (Buffer, window) used in non-browser contexts

## What NOT to do
- Do NOT break existing game flow (no shared link = normal game)
- Do NOT add npm dependencies
- Do NOT modify BattleEncoder or ReplayController (they're done)
