# Plan: Write More Tests

## Context

The evolution simulator has good tests for `organism.ts`/`factory.ts`/`stats.ts`, but three areas are completely untested: the `Mulberry32` RNG, the helper utilities (`clamp`, `gaussianRandom`), and the core `Simulation` class (which only has snapshot regression tests, no unit tests). This plan adds focused unit tests for all three areas.

## Files to Create/Modify

### 1. NEW: `src/rng.test.ts`

Tests for `Mulberry32` in `src/rng.ts`:

| Test | Verifies |
|------|----------|
| `next() returns value in [0, 1)` | Output is ≥ 0 and < 1 |
| `same seed produces same sequence` | Two RNGs with seed 42 produce identical outputs |
| `different seeds produce different sequences` | Seeds 1 vs 2 diverge |
| `state getter reflects current state` | After calling `next()`, `state` changes |
| `fromState() resumes sequence` | `fromState(rng.state)` produces the same values as continuing from `rng` |
| `seed is integer-truncated (| 0)` | `new Mulberry32(1.9)` behaves like `new Mulberry32(1)` |

### 2. NEW: `src/organism/helpers/helpers.test.ts`

Tests for `clamp` (`src/organism/helpers/clamp.ts`) and `gaussianRandom` (`src/organism/helpers/gaussianRandom.ts`):

**clamp:**
| Test | Verifies |
|------|----------|
| `returns value when within range` | `clamp(5, 0, 10) === 5` |
| `clamps to min when below` | `clamp(-1, 0, 10) === 0` |
| `clamps to max when above` | `clamp(11, 0, 10) === 10` |
| `returns min when value equals min` | `clamp(0, 0, 10) === 0` |
| `returns max when value equals max` | `clamp(10, 0, 10) === 10` |

**gaussianRandom:**
| Test | Verifies |
|------|----------|
| `calls rng.next() exactly twice` | Mock counts calls, expect 2 |
| `returns a finite number` | Output is finite (not NaN/Infinity) |
| `returns different values for different inputs` | Two different RNG sequences produce different outputs |
| `known input produces known output` | `u1=0.5, u2=0.5` → `Math.sqrt(-2*Math.log(0.5)) * Math.cos(Math.PI)` |

### 3. MODIFIED: `src/simulation/simulation.test.ts`

Add a new `describe('Simulation unit tests', ...)` block alongside the existing snapshot tests. Use extreme probability configs to make behavior deterministic.

**Base configs:**
```ts
const alwaysSpawnConfig = { ...DEFAULT_SIM_CONFIG, seed: 42, spawnRate: 1, populationCap: 10,
  defaultStats: { replicationRate: 0, deathRate: 0, mutationRate: 0, speed: 0 } }
const alwaysReplicateConfig = { ...DEFAULT_SIM_CONFIG, seed: 42, spawnRate: 1, populationCap: 20,
  defaultStats: { replicationRate: 1, deathRate: 0, mutationRate: 0, speed: 0 } }
```

| Test | Setup | Verifies |
|------|-------|----------|
| `starts at tick 0` | `new Simulation(config)` | `getTickCount() === 0` |
| `tick() increments tickCount` | tick 3 times | `getTickCount() === 3` |
| `getReplicators() starts empty` | fresh sim | `getReplicators().length === 0` |
| `spawn adds organism when spawnRate=1` | `alwaysSpawnConfig`, tick once | `getReplicators().length === 1` |
| `does not spawn when at populationCap` | spawn up to cap, then tick | count stays at cap |
| `organisms replicate when replicationRate=1` | `alwaysReplicateConfig`, tick once, check count > 1 | replication occurs |
| `organisms die when deathRate=1` | spawn one, then tick with deathRate=1 | count goes to 0 |
| `storeInitialCheckpoint() creates checkpoint at 0` | call `storeInitialCheckpoint()` | `hasCheckpoint(0) === true` |
| `hasCheckpoint() returns false for missing tick` | fresh sim | `hasCheckpoint(999) === false` |
| `checkpoint auto-saved every 60 ticks` | tick 60 times | `hasCheckpoint(60) === true` |
| `seekToTick() replays to correct tick` | tick 10, seek to 5 | `getTickCount() === 5` |
| `seekToTick() is idempotent for same tick` | tick 10, seek to 10 twice | same organism count both times |
| `seekToTick() ignores negative target` | seek to -1 | tick stays the same |
| `reset() clears state` | tick 5, reset | tick=0, organisms=[] |
| `takeSnapshot() captures tickCount` | tick 7, snapshot | `snapshot.tickCount === 7` |
| `takeSnapshot() captures organism count` | spawn, snapshot | `snapshot.organismSnapshots.length === count` |
| `toroidal wrap: organism leaving right edge appears at left` | position organism at edge, speed=width, tick move | position wraps correctly |

For the toroidal wrap test, set up a simulation with seed-controlled RNG so the organism's heading is 0 (rightward) and position is near the right edge.

## Verification

Run `pnpm verify` to confirm TypeScript compiles and all tests pass (including the existing snapshots).
