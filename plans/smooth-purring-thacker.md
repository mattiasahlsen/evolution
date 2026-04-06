# Plan: Deepen Organism Model into a Single Module

## Context

The concept of "what an organism is and how it evolves" is spread across four files: `types.ts` (stat fields), `replicator.ts` (entity class, ID counter, color), `snapshot.ts` (serialization shape), and `simulation.ts` (mutation formula and constants). Any change to the organism model — adding a stat, adjusting mutation noise, changing the color mapping — requires coordinated edits across all four. The goal is to consolidate this into a single `src/organism.ts` module, making the mutation formula, color logic, ID allocation, and serialization testable and independently owned.

RFC: mattiasahlsen/evolution#1

---

## Target Interface (`src/organism.ts`)

```typescript
export interface Stats {
  replicationRate: number;
  deathRate: number;
  mutationRate: number;
  speed: number;
}

export interface Organism {
  readonly id: number;
  x: number; y: number; heading: number;
  readonly stats: Stats;
}

export interface OrganismSnapshot {
  id: number; x: number; y: number; heading: number; stats: Stats;
}

export interface OrganismFactory {
  create(x: number, y: number, stats: Stats, heading: number): Organism;
  replicate(parent: Organism, rng: { next(): number }): Organism;
  toSnapshot(o: Organism): OrganismSnapshot;
  fromSnapshot(snap: OrganismSnapshot): Organism;
  saveCounter(): number;
  restoreCounter(value: number): void;
}

export function statsToColor(stats: Stats): string;
export function createOrganismFactory(config?: { mutationSigma?: number; speedScale?: number }): OrganismFactory;
```

`replicate()` returns a child with mutated stats at the parent's position; the simulation overwrites `x`, `y`, `heading` after the call. `statsToColor` replaces the `r.color` getter throughout.

---

## Critical RNG Order Constraint

Determinism depends on preserving the exact `rng.next()` call order per offspring:

```
rng.next()  → angle        (simulation, before replicate())
rng.next()  → dist         (simulation, before replicate())
rng.next()  → isMutation   (factory.replicate(), first call inside)
[8× rng.next() if mutating → 4 stats × gaussianRandom = 2 calls each]
rng.next()  → child heading (simulation, after replicate())
```

`replicate()` must be called **between** the position calls and the heading call.

---

## Steps

### Step 1 — Create `src/organism.ts`

New file. Contains everything currently split across `replicator.ts`, `snapshot.ts`, and the mutation block in `simulation.ts`.

Key implementation details:
- `statsToColor`: copy verbatim from `Replicator.get color()` — `min(stat / 0.2, 1) * 255`, extract `0.2` as named constant `COLOR_THRESHOLD`
- `createOrganismFactory(config?)`: module-level `let nextId = 0`; defaults `mutationSigma = 0.02`, `speedScale = 50`
- `create()`: returns plain object `{ id: nextId++, x, y, heading, stats: { ...stats } }`
- `replicate(parent, rng)`:
  1. `const isMutation = rng.next() < parent.stats.mutationRate`
  2. If mutating: compute 4 stats via `gaussianRandom(rng)` (Box-Muller, 2 calls each) in order: `replicationRate`, `deathRate`, `mutationRate`, `speed` (speed uses `sigma * speedScale`)
  3. Return `{ id: nextId++, x: parent.x, y: parent.y, heading: parent.heading, stats: ... }`
- `fromSnapshot()`: plain object literal — no `Object.create` hack needed
- `gaussianRandom` and `clamp`: private module-level helpers, not exported

### Step 2 — Update `src/simulation.ts`

Imports:
- Remove: `Replicator, getNextId, setNextId` from `./replicator`
- Add: `createOrganismFactory, type Organism, type OrganismSnapshot` from `./organism`
- Remove: `SimulationSnapshot` from `./snapshot`
- Define `SimulationSnapshot` locally (rename fields: `nextReplicatorId` → `nextOrganismId`, `replicators` → `organisms`):
  ```typescript
  interface SimulationSnapshot {
    tickCount: number; rngState: number;
    nextOrganismId: number;
    organisms: OrganismSnapshot[];
  }
  ```

Remove: `MUTATION_SIGMA`, `gaussianRandom`, `clamp` (all move to `organism.ts`). Keep: `SPAWN_OFFSET`, `HEADING_DRIFT`.

Class changes:
- `replicators: Replicator[]` → `replicators: Organism[]`
- Add field: `private organisms = createOrganismFactory()`

Method changes:
- `takeSnapshot()`: `getNextId()` → `this.organisms.saveCounter()`; `r.toSnapshot()` → `this.organisms.toSnapshot(r)`; field names per new interface
- `restoreSnapshot()`: `setNextId(...)` → `this.organisms.restoreCounter(...)`; `Replicator.fromSnapshot(s)` → `this.organisms.fromSnapshot(s)`; field names per new interface
- `reset()`: `setNextId(0)` → `this.organisms.restoreCounter(0)`
- `spawn()`: `new Replicator(x, y, stats, heading)` → `this.organisms.create(x, y, stats, heading)`
- `replicateAndMutate()` — critical rewrite:
  ```typescript
  // Keep (position RNG calls stay here):
  const angle = this.rng.next() * Math.PI * 2;
  const dist = SPAWN_OFFSET + this.rng.next() * SPAWN_OFFSET;
  let childX = ...; let childY = ...;  // + toroidal wrap

  // Replace 12-line mutation block with:
  const child = this.organisms.replicate(parent, this.rng);  // isMutation + optional Gaussian noise

  // Keep (heading RNG call stays here, after replicate):
  const heading = this.rng.next() * Math.PI * 2;
  child.x = childX; child.y = childY; child.heading = heading;
  offspring.push(child);
  ```
- `kill()`, `move()`: unchanged — already access `r.stats.*`, `r.x/y/heading` which remain on `Organism`

### Step 3 — Update `src/renderer.ts`

- `import type { Replicator }` → `import type { Organism }` + `import { statsToColor }` from `./organism`
- Parameter types: `Replicator[]` → `Organism[]`, return type `Replicator | null` → `Organism | null`
- `r.color` → `statsToColor(r.stats)`

### Step 4 — Update `src/ui.ts`

- `import type { Replicator }` → `import type { Organism }` + `import { statsToColor }` from `./organism`
- `showTooltip(r: Replicator, ...)` → `showTooltip(r: Organism, ...)`
- `r.color` (in tooltip HTML, used twice) → `statsToColor(r.stats)`

### Step 5 — Update `src/types.ts`

- Add: `import type { Stats } from './organism'`
- Change: `defaultStats: ReplicatorStats` → `defaultStats: Stats` in `SimConfig`
- Delete: `ReplicatorStats` interface definition

### Step 6 — Delete `src/replicator.ts`

Pre-condition: grep for `from './replicator'` returns zero results.

### Step 7 — Delete `src/snapshot.ts`

Pre-condition: grep for `from './snapshot'` returns zero results.

---

## Files Changed

| File | Action |
|---|---|
| `src/organism.ts` | Create |
| `src/simulation.ts` | Modify (imports, 4 methods, field types) |
| `src/types.ts` | Modify (import swap, delete `ReplicatorStats`) |
| `src/renderer.ts` | Modify (type + color) |
| `src/ui.ts` | Modify (type + color) |
| `src/replicator.ts` | Delete |
| `src/snapshot.ts` | Delete |

`src/main.ts`, `src/rng.ts`, `src/sprite.ts` — no changes needed.

---

## Verification

1. `pnpm build` — must complete with zero TypeScript errors
2. `pnpm dev` — open browser, run simulation, confirm organisms appear with correct colors and replicate visibly
3. Play → scrub backward → scrub forward to frontier → Play — confirm deterministic replay produces identical population states
4. Click an organism — tooltip must show correct stats and color swatch
5. Reset → reconfigure → Play — confirm config locking still works
