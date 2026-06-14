# ⚔️ WARZONE SANDBOX

> The **"what-if engine for warfare"** — a browser-native platform where anyone
> composes armies, stages them on procedural terrain, and watches emergent
> tactical outcomes unfold at 60fps.

[![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7)](render.yaml)
[![Engine](https://img.shields.io/badge/Engine-ECS%20Architecture-blue)](src/ecs/)
[![Tests](https://img.shields.io/badge/Tests-57%20assertions-brightgreen)](test/)

## 🎮 Play

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # production build → dist/
```

No backend required — it's a fully client-side PWA with offline support.

## 🧠 Architecture

Built on a **custom ECS (Entity-Component-System)** engine — not a monolithic game loop.

```
main.js → ECSUnitManager → World (ECS)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
     AISystem          ProjectileSystem     CombatSystem
  (behavior trees)    (arrows/bullets/AOE)  (HP, damage, kill)
          │                   │                   │
          └───────────┬───────┴───────────────────┘
                      ▼
                CleanupSystem → EventBus (decoupled)
```

### Core Systems
| System | Responsibility |
|--------|---------------|
| **AISystem** | Runs per-unit behavior trees (FindTarget → Chase → Attack) |
| **ProjectileSystem** | Tracks flying projectiles, resolves impacts, AOE splash |
| **CombatSystem** | Event-driven damage application + kill detection |
| **CleanupSystem** | Timed corpse removal after death |
| **ECSUnitManager** | Bridge between ECS state and Three.js instanced rendering |

### Key Design Decisions
- **Custom ECS** (not bitECS) — full control for <1000 entities
- **EventBus decoupling** — no system imports another
- **Deterministic RNG** (`SeedRandom`) — enables replays + sync
- **Dirty-flagged rendering** — GPU efficiency via InstancedMesh

## ⚔️ Unit Roster (8 types)

| Unit | HP | Damage | Range | Special |
|------|-----|--------|-------|---------|
| ⚔️ Swordsman | 100 | 15 | 2.5 | Shield block (25%) |
| 🗡️ Spearman | 80 | 12 | 3.5 | Anti-cavalry (2x) |
| 🏹 Archer | 60 | 10 | 30 | Volley (3 arrows) |
| 🐴 Knight | 150 | 25 | 2.5 | Charge (+50%) |
| 🐎 Horseman | 90 | 18 | 2.5 | Flank bonus (3x) |
| 🔫 Musketeer | 70 | 20 | 25 | Slow reload |
| 👹 Giant | 300 | 40 | 4 | AOE slam |
| 🏗️ Catapult | 50 | 60 | 50 | Siege AOE |

## 🧪 Tests

```bash
node test/ecs-bridge.test.js       # 20 assertions — entity spawning + queries
node test/ecs-battle.test.js       # 10 assertions — full melee battle
node test/ecs-ranged.test.js       # 14 assertions — ranged + AOE combat
node test/ecs-integration.test.js  # 13 assertions — full game flow
```

**57 assertions, all passing.** The ECS engine is proven headless — no browser needed.

## 🗺️ Roadmap

| Phase | Status |
|-------|--------|
| **0 — Foundation** (ECS, Engine, EventBus, BT) | ✅ Complete |
| **1 — Unify** (ECS replaces monolith) | ✅ Complete |
| **2 — Scale & Content** (10K units, data-driven units, visual editor) | ⏳ Next |
| **3 — Social** (shareable battles, replays, spectate) | ⏳ |
| **4 — Multiplayer** (PvP, matchmaking, co-op) | ⏳ |
| **5 — Economy** (creator marketplace, cosmetics, revenue share) | ⏳ |

See [`NORTH_STAR.md`](NORTH_STAR.md) for the full vision.

## 🛠️ Tech Stack

- **Three.js** — 3D rendering (InstancedMesh, post-processing)
- **Custom ECS** — Entity-Component-System game engine
- **Vite** — Build tooling
- **PWA** — Offline support, service worker, fullscreen

## 👥 Team

- **@Heisdawrld** — Creator
- **@fiy-73** — Contributor
- **Arena.ai Agent** × **MiMo Code Agent** — AI co-architects (Phase 1 ECS rebuild)

## 📄 License

MIT
