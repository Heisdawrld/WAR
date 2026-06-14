# NORTH STAR — WARZONE: REIMAGINED
> Co-authored plan: **Arena.ai Agent** × **MiMo Code Agent** × @Heisdawrld
> Last Updated: 2026-06-14
> Ambition: **$10B-scale platform**

---

## 0. THE HONEST STARTING POINT

What exists today is a **solid, working demo**: a Three.js browser battle simulator
(8 unit types, formations, projectiles, AI, post-processing, PWA). It runs. It's fun for 5 minutes.

**But a demo is not a product, and a product is not a platform.** The $10B version of
this is not "a better battle sim." It's a **platform** — the place where millions of people
create, share, and spectate simulated warfare.

The direct comparable isn't Totally Accurate Battle Simulator (which made ~$50M).
It's **Roblox for combat** — a UGC engine + social loop + creator economy.

---

## 1. THE $10B VISION (5 sentences)

**WARZONE is the "what-if engine for warfare"** — a browser-native platform where anyone
composes armies from an asymmetrical, ever-growing roster, stages them on any terrain, and
watches emergent tactical outcomes unfold at 60fps with thousands of units.

**The long game is User-Generated Content**: custom unit types, maps, formations, and AI
behaviors authored through a visual editor — turning every player into a game designer.

**Multiplayer and replays make every simulation social and viral**: share a battle as a
link, challenge a friend's army, watch top clashes as esports-style spectacles.

**A creator economy (battle pass + cosmetic marketplace + creator revenue share)**
monetizes the flywheel and incentivizes the best scenario designers.

**The endgame is the YouTube of combat simulation** — a platform, not a game.

---

## 2. THE THREE PILLARS (highest leverage first)

### 🏗 Pillar 1 — Unify the Architecture (THE BLOCKER)
Two parallel engines exist: the working monolith (`src/engine` + `main.js`) and the
unbuilt-but-superior ECS (`src/core` + `src/ecs` + `src/systems` + `src/ai`).
**This is the most dangerous state a codebase can be in.** Every feature gets written twice.
The ECS rots. The monolith grows roots.

**Decision: BRIDGE, don't rewrite.** Keep `main.js` as the entry point but make it
delegate to the ECS `Engine` + `World`. Port one system at a time. Delete the monolith's
parallel code as each ECS system takes over. **Hard rule: no new features in the monolith.**

### ⚡ Pillar 2 — Scale to 10,000+ Units
InstancedMesh + dirty-flag rendering is the right pattern (already in `InstancedPool` /
`RenderSystem`). The O(n²) brute-force `findNearestEnemy` must die — add a **uniform grid
spatial hash** (simple, cache-friendly, perfect for uniform-density battlefields). This is
what separates "cool demo" from "viral sandbox."

### 🎨 Pillar 3 — The Content Authoring Layer (the flywheel)
Unit types are hardcoded in `UnitTypes.js`. The ECS components are already decoupled.
**Expose unit stats, BT tasks, and formations as data (JSON) → modding platform.**
This is the growth engine. Every pillar after this one depends on it.

---

## 3. THE ROADMAP (Phases 0 → 5)

| Phase | Goal | Status |
|-------|------|--------|
| **0 — Foundation** | ECS, Engine, EventBus, BT built | ✅ Done (but NOT integrated) |
| **1 — Unify** | Monolith delegates to ECS; systems ported one-by-one; spatial hash | 🔴 IN PROGRESS |
| **2 — Scale & Content** | 10K units; data-driven units/maps/formations; visual editor v1 | ⏳ |
| **3 — Social** | Shareable battle links; deterministic replays; spectate mode | ⏳ |
| **4 — Multiplayer** | Real-time PvP army battles; lobby/matchmaking; co-op scenarios | ⏳ |
| **5 — Economy & Platform** | Creator marketplace; cosmetics/battle pass; creator revenue share | ⏳ |

---

## 4. ARCHITECTURE TARGET (end of Phase 1)

```
main.js  ──►  Bootstrapper  ──►  Engine (fixed timestep)
                                   │
                                   ▼
                                 World (ECS)
                                   │
        ┌──────────┬───────────────┼───────────────┬───────────────┐
        ▼          ▼               ▼               ▼               ▼
   RenderSystem  AISystem    CombatSystem   SpatialSystem     CleanupSystem
   (InstancedPool,           (damage,        (uniform grid,   (corpse GC)
    dirty flags)              projectiles)    O(n) queries)
        │
        ▼
   EventBus  ◄── decouples every system; no system imports another
```

**Key invariants going forward:**
- ✅ Systems communicate ONLY via EventBus + World queries.
- ✅ All gameplay is DATA (JSON), not code.
- ✅ Deterministic RNG (`SeedRandom`) seeds every simulation → replays/sync work.
- ✅ One render path. One AI path. One combat path. No duplication.

---

## 5. DIVISION OF LABOR (Arena × MiMo)

| Role | Arena.ai Agent | MiMo Code Agent |
|------|----------------|-----------------|
| **Product & vision** | Owns the north star, roadmap, priorities | Validates, challenges, offers second opinion |
| **Architecture** | Designs systems, defines contracts | Implements systems in code |
| **Code** | Reviews every change; writes specs/contracts | Writes the bulk of implementation |
| **Risk** | Calls out tech debt, anti-patterns | Suggests refactors, perf wins |
| **Loop** | Plans → hands off → reviews → iterates | Implements → explains choices → refactors |

**Cadence:** Arena plans a unit of work → MiMo implements → Arena reviews → ship. Repeat.

---

## 6. WHAT WE'RE BUILDING RIGHT NOW (Phase 1, Step 1)

**Goal of this session:** Establish the bridge. `main.js` bootstraps the ECS `Engine`
and `World`. Port `RenderSystem` first (lowest risk, highest visibility — we'll *see* it work).
This proves the ECS is real and unlocks everything else.
