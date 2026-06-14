# WARZONE SANDBOX — Project Memory

> **Last Updated:** 2026-06-13
> **Session:** 001 — Foundation Architecture (Phase 0 Complete)

## 1. Project Identity
- **Name:** WARZONE SANDBOX
- **Repo:** `github.com/Heisdawrld/WAR`
- **Deploy:** Render (static site) — `render.yaml`
- **Team:** @Heisdawrld, @fiy-73
- **Current Phase:** Phase 0 — Foundation

## 2. What's Been Built (Session 001)
### Core Infrastructure
- `src/core/EventBus.js` — Typed event system
- `src/core/Engine.js` — Game loop, fixed timestep, system registry
- `src/core/Bootstrapper.js` — Single entry point wiring everything

### ECS Layer
- `src/ecs/World.js` — Entity container with inverted-index queries
- `src/ecs/Entity.js` — ID + typed component bag
- `src/ecs/Component.js` — Base class + serialization
- Components: Transform, Health, Combat, Team, UnitType, AIState

### Systems
- `src/systems/InstancedPool.js` — GPU InstancedMesh pool
- `src/systems/RenderSystem.js` — ECS to GPU rendering
- `src/systems/AISystem.js` — Behavior tree executor
- `src/systems/CombatSystem.js` — Damage processing
- `src/systems/CleanupSystem.js` — Corpse cleanup

### AI — Real Behavior Tree
- Nodes: BTNode, Selector, Sequence, Inverter, Repeater
- Tasks: FindTarget, IsTargetInRange, Patrol, Chase, Attack
- `src/ai/BehaviorRegistry.js` — Unit type → tree map

### Utilities
- `src/utils/SeedRandom.js` — Deterministic RNG
- `src/utils/StateMachine.js` — FSM

## 3. Status
✅ Phase 0 files built (29 new files)
✅ Phase 1 — ECS REPLACES MONOLITH (complete)
  ├ Step 1: ECS bridge — UnitFactory + spawn/query pipeline (20 tests) ✅
  ├ Step 2: Full melee battle proven headless (10 tests) ✅
  ├ Step 3: MovementSystem fix (unregistered — redundant with BT) ✅
  ├ Step 4: ProjectileSystem — ranged + AOE combat (14 tests) ✅
  ├ Step 5: ECS wired into main.js via ECSUnitManager + ECSGameController ✅
  └ Step 6: Integration test — full game flow through ECSUnitManager (13 tests) ✅
✅ Phase 2 — Step 1: Spatial hash (scale to 10K units) ✅
  ├ SpatialHash + SpatialIndexSystem (priority 50, runs before AI) ✅
  ├ FindTarget fast path, brute-force fallback preserved ✅
  └ 3.36x speedup at 1000 units, correctness verified (5 tests) ✅
⏳ Phase 2 — Step 2: Data-driven units (modding foundation) — NEXT
⏳ CHECKPOINT: Browser QA needed (owner) — major arch changes unverified in-browser

Total: 62 assertions passing across 5 test suites. vite build succeeds.

### Architecture after Phase 1
- main.js uses ECSUnitManager (drop-in replacement for UnitManager)
- ECSGameController drives AISystem → ProjectileSystem → CombatSystem → CleanupSystem
- VisualProjectiles renders flying arrows/bullets/rocks from ECS events
- ECS state syncs to legacy rendering proxies via syncFromECS() each frame
- Monolith BehaviorTree.js + entities/Projectile.js + entities/UnitManager.js are DEPRECATED

### Known Issues
- MovementSystem.js exists but is unused (BT tasks handle movement). Repurpose for separation/avoidance in Phase 2.
- Old monolith files (BehaviorTree.js, UnitManager.js, Projectile.js) still in repo — safe to delete after browser testing confirms ECS works.
- Visual projectile quality is basic (simple meshes). Can be enhanced with trails/arcs.
- Needs browser testing: 3D rendering, camera, UI screens, touch input, audio, PWA.

## 4. Roadmap
| Phase | Description |
|---|---|
| Phase 0 | Foundation — ✅ Complete |
| Phase 1 | Content & Gameplay |
| Phase 2 | Audio & Visual |
| Phase 3 | Game Modes |
| Phase 4 | Multiplayer & Backend |
| Phase 5 | Monetization |

## 5. Key Decisions
- Custom ECS (not bitECS) — control for <1000 entities
- EventBus decoupling — no system imports another
- Deterministic RNG — replay + sync
- Dirty-flagged rendering — GPU efficiency

## 6. Session Log
### Session 001 — 2026-06-13
Built: EventBus, Engine, ECS, StateMachine, SeedRandom, RenderSystem, AISystem, CombatSystem, CleanupSystem, behavior tree system, Bootstrapper. 29 files committed and pushed.

### Session 002 — 2026-06-14 (Arena × MiMo collaboration)
- Wrote $10B platform vision (NORTH_STAR.md) + 6-phase roadmap
- Step 1: MiMo built UnitFactory + MovementSystem; Arena reviewed (20 tests pass)
- Step 2: Proved ECS runs full melee battles headless (10 tests pass)
- Step 4: MiMo built ProjectileSystem (ranged + AOE); Arena reviewed (14 tests pass)
- Step 5: Arena built ECSUnitManager + ECSGameController + VisualProjectiles; wired into main.js
- Step 6: Integration test proves full game flow (13 tests pass)
- Phase 1 COMPLETE: ECS replaces monolith. 57 total assertions passing.

### Session 003 — 2026-06-14 (Arena leads, MiMo implements)
- Arena promoted to project lead; MiMo as implementer.
- Phase 2 Step 1: MiMo built SpatialHash + SpatialIndexSystem + FindTarget integration.
  - 3.36x speedup at 1000 units; correctness verified vs brute-force.
  - 62 total assertions across 5 suites. Pushed to main (commit 9fdeb39).
