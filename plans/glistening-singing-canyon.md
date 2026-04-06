# Plan: Tick-Rate Control & Rewind

## Context

The simulation currently runs at a fixed minimum speed of ~60 ticks/sec (1 tick per frame) with no way to slow down. There is no history — once a tick is gone, its state is lost. The user wants slow-motion playback and the ability to scrub backward through time to observe past states.

**Design decisions (confirmed with user):**
- Fractional `ticksPerFrame` for slow motion (accumulator pattern)
- Seeded Mulberry32 PRNG replaces `Math.random()` for deterministic replay
- Periodic snapshots every 60 ticks; rewind via checkpoint restore + replay
- Config locked on Play, unlocked on Reset. Speed slider stays interactive.
- App starts paused at tick 0. Scrub bar always visible. Play always resumes from frontier.

---

## Step 1: Create seeded PRNG

**New file: `src/rng.ts`**

Implement `Mulberry32` class:
- `constructor(seed: number)` — single 32-bit state
- `next(): number` — returns `[0, 1)` float (same contract as `Math.random()`)
- `get state(): number` — expose internal state for snapshotting
- `static fromState(state: number): Mulberry32` — restore from saved state

---

## Step 2: Replace `Math.random()` with seeded PRNG

**`src/simulation.ts`** — 11 `Math.random()` calls to replace:
- Add `rng: Mulberry32` and `seed: number` properties
- Constructor: generate seed via `Math.random() * 0xffffffff >>> 0` (only remaining `Math.random` usage), create `new Mulberry32(seed)`
- `gaussianRandom()` (line 8): add `rng` parameter, replace 2x `Math.random()` with `rng.next()`
- `spawn()` (line 41): replace 3x `Math.random()` → `this.rng.next()`
- `replicateAndMutate()` (line 53): replace 4x `Math.random()` → `this.rng.next()`, pass `this.rng` to 7x `gaussianRandom()` calls
- `kill()` (line 90): replace 1x `Math.random()` → `this.rng.next()`
- `move()` (line 96): replace 1x `Math.random()` → `this.rng.next()`

**`src/replicator.ts`** — 1 `Math.random()` call to replace:
- Add optional `heading` parameter to constructor (default `0`)
- Remove `Math.random()` from line 26
- In `simulation.ts`, pass `this.rng.next() * Math.PI * 2` as heading at both `new Replicator()` call sites (lines 48, 84)

---

## Step 3: Fractional tick-rate (slow motion)

**`src/main.ts`:**
- Add `let tickAccumulator = 0` at module scope
- Rewrite main loop: `tickAccumulator += config.ticksPerFrame`, execute `Math.floor(tickAccumulator)` ticks, subtract executed count from accumulator
- Reset accumulator to 0 on Play and Step

**`src/ui.ts`:**
- Speed slider (line 78): change range from `1-10 step 1` to `0.1-10 step 0.1`, rename label to `'Speed'`

---

## Step 4: Snapshot system

**New file: `src/snapshot.ts`** — type definitions:
- `ReplicatorSnapshot` — plain object with all replicator fields
- `SimulationSnapshot` — `{ tickCount, rngState, nextReplicatorId, replicators[] }`

**`src/replicator.ts`:**
- Export `getNextId()` / `setNextId(n)` functions for the module-level `nextId` counter
- Add `toSnapshot(): ReplicatorSnapshot` method
- Add `static fromSnapshot(snap): Replicator` factory (uses `Object.create` to bypass constructor)

**`src/simulation.ts`:**
- Add `checkpoints: Map<number, SimulationSnapshot>` and `checkpointInterval = 60`
- Split `tick()` into `tick()` (increments count, calls `executeTick()`, stores checkpoint if interval hit) and `private executeTick()` (spawn/replicate/kill/move)
- Checkpoint stored at END of tick (after logic runs), so checkpoint at tick N = state after tick N completes
- Add `takeSnapshot()`, `restoreSnapshot(snap)`, `storeInitialCheckpoint()`, `hasCheckpoint(tick)`
- Add `seekToTick(target)`: find nearest checkpoint at or before target, restore it, replay forward using `executeTick()` (no new checkpoints during replay)
- Update `reset()`: clear checkpoints, new seed, new RNG, `setNextId(0)`

---

## Step 5: Config locking

**`src/ui.ts`:**
- Add `private configSliders: HTMLInputElement[]` — track all config slider elements (NOT the speed slider)
- `addSlider()` returns the input element; push config sliders into array in `buildPanel()`
- Config sliders: Spawn Rate, Population Cap, Replication Rate, Death Rate, Mutation Rate, Movement Speed
- Add `lockConfig()` / `unlockConfig()` methods — toggle `disabled` on config sliders

**`src/main.ts`:**
- `onPlay`: call `ui.lockConfig()`
- `onReset`: call `ui.unlockConfig()`

**`src/style.css`:**
- Style disabled sliders: `opacity: 0.4; pointer-events: none`

---

## Step 6: Start paused at tick 0

**`src/main.ts`:**
- Change `let running = true` → `let running = false`
- Add initial render call after setup: `renderer.render(simulation.replicators)`
- In `onPlay`, if `tickCount === 0`, call `simulation.storeInitialCheckpoint()`

---

## Step 7: Scrub bar & rewind

**`src/ui.ts`:**
- Add `onScrub: (tick: number) => void` to `UICallbacks`
- Add `scrubBar: HTMLInputElement`, `scrubLabel: HTMLElement`, `isScrubbing: boolean`
- Build timeline slider in `buildPanel()` after playback buttons, before config sliders
- `input` event → set `isScrubbing = true`, call `onScrub(tick)`
- `change` event (mouse-up) → set `isScrubbing = false`
- Add `updateScrubBar(currentTick, frontierTick)` — updates `max` and (if not scrubbing) `value`

**`src/main.ts`:**
- Add `let frontierTick = 0`
- `onScrub`: set `running = false` (auto-pause), call `simulation.seekToTick(tick)`, render, update stats
- `onPlay`: if `simulation.tickCount < frontierTick`, call `seekToTick(frontierTick)` first
- `onStep`: if scrubbed back, restore frontier first; then advance one tick; update `frontierTick`
- Main loop: after ticks, set `frontierTick = simulation.tickCount`, call `ui.updateScrubBar()`
- `onReset`: set `frontierTick = 0`, call `ui.updateScrubBar(0, 0)`

---

## Verification

1. **Determinism** — hard-code a seed, run 100 ticks, note population. Reset with same seed, run again. Must match.
2. **Slow motion** — speed 0.1: organisms advance 1 tick every ~10 frames. Speed 1: normal. Speed 10: fast.
3. **Scrub bar** — pause at tick 300, drag to tick 60, canvas shows fewer/different replicators. Press Play, resumes from tick 300.
4. **Step after scrub** — scrub to tick 50 (frontier 200), press Step → jumps to tick 201.
5. **Config lock** — Play disables config sliders, speed slider still works. Reset re-enables all.
6. **Fresh load** — app starts paused, empty canvas, tick 0, all sliders editable.
7. **Type check** — `pnpm run build:check` passes.
