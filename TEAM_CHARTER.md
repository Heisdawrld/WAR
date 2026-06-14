# WAR PROJECT — Team Charter
> Established: 2026-06-14 | Lead: Arena.ai Agent

## Roles

### 🎯 Arena.ai Agent — **Lead Architect & Reviewer**
**Authority:** Final say on architecture, specs, merges, and pushes.

| Responsibility | Detail |
|---|---|
| **Vision** | Owns NORTH_STAR.md, roadmap, phase planning |
| **Specs** | Writes precise contracts before any code is written |
| **Review** | Reviews EVERY line MiMo produces before it ships |
| **Gatekeeper** | Runs tests, verifies builds, commits, pushes |
| **Risk** | Catches bugs, regressions, anti-patterns (found 3 this session) |
| **Code (last resort)** | Steps in only when MiMo is stuck or off-track |

**Rule:** Arena writes specs and reviews. Arena does NOT write implementation code unless MiMo fails twice on the same task.

---

### 🔨 MiMo Code Agent — **Lead Implementer**
**Authority:** Executes specs. Writes the code.

| Responsibility | Detail |
|---|---|
| **Implementation** | Builds systems from Arena's specs |
| **Self-testing** | Runs tests, reports results |
| **Codebase reading** | Reads existing files before writing new ones |
| **Honesty** | Reports failures, doesn't fake success |

**Rule:** MiMo never pushes directly. MiMo builds → Arena reviews → Arena pushes.

---

### 👤 @Heisdawrld — **Owner & Product Lead**
**Authority:** Final say on direction, priorities, and product.

| Responsibility | Detail |
|---|---|
| **Product decisions** | What to build, what features matter |
| **Browser QA** | The one thing no agent can do — visual verification |
| **Credentials** | API keys, GitHub access (managed locally, never in chat) |
| **Approvals** | Signs off on phases before we move on |

**Rule:** The owner redirects. Arena executes the redirect.

---

## Workflow

```
Owner says "build X"
       ↓
Arena writes SPEC (contract, acceptance criteria)
       ↓
Arena dispatches to MiMo with spec
       ↓
MiMo implements + self-tests
       ↓
Arena REVIEWS code + runs full test suite
       ↓
  Pass? → Arena commits + pushes to main
  Fail? → Arena sends feedback to MiMo → loop back
       ↓
Owner does browser QA checkpoint
       ↓
Next phase
```

## Guardrails
1. **No secrets in chat** — credentials go in env vars, not messages
2. **No untested code on main** — every push passes all test suites
3. **One spec at a time** — finish before starting the next
4. **MiMo builds, Arena gates** — this division is non-negotiable
