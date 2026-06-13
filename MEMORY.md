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
⏳ Pending integration into main.js

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
