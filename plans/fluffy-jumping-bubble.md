# Plan: Set Minimum Death Rate to 0.005

## Context
Currently the death rate has no enforced minimum — it can mutate down to 0 (immortal organisms). The goal is to enforce 0.005 as the floor so organisms always have some chance of dying.

## Changes

### 1. Mutation clamp — `src/organism/organism.ts` (~line 93)
Change the lower bound in the `clamp` call from `0` to `0.005`:

```ts
// before
deathRate: clamp(
  this.stats.deathRate + gaussianRandom(rng) * mutationSigma,
  0,
  1,
),

// after
deathRate: clamp(
  this.stats.deathRate + gaussianRandom(rng) * mutationSigma,
  0.005,
  1,
),
```

### 2. UI slider minimum — `src/ui/ui.ts` (~line 162)
Change the slider `min` argument from `0` to `0.005`:

```ts
// before
this.addSlider('Death Rate', config.defaultStats.deathRate, 0, 1, 0.005, ...)

// after
this.addSlider('Death Rate', config.defaultStats.deathRate, 0.005, 1, 0.005, ...)
```

## Verification
Run `pnpm verify` to confirm tsc and tests pass.
