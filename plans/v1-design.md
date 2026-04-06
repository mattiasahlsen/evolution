# Evolution Simulator — v1 Design

## Tech
- **Vite + vanilla TypeScript**, pnpm, no framework
- **Canvas 2D** for rendering, plain DOM for UI panel

## Simulation space
- Continuous 2D, toroidal wrapping (exit one edge, enter the opposite)

## Entities: Replicators
- **Stats:** `replicationRate` (0–1), `deathRate` (0–1), `mutationRate` (0–1), `speed` (0–5)
- **Visual:** SVG sprite (round blob with eyes), drawn via offscreen canvas stamping
- **Color:** Fixed base color on spawn. Shifts randomly on mutation — visual divergence tracks genetic divergence
- **Movement:** Random walk (heading drifts by small random angle each frame), smooth

## Population dynamics
- **Initial population:** 0
- **Spawning:** Global spawn rate (% chance per tick). New replicators get user-configurable default stats and the base color
- **Replication:** Each tick, each replicator has `replicationRate` chance to copy itself. Offspring appears offset ~10–20px in random direction
- **Mutation:** `mutationRate` fraction of replications produce a mutant. All stats get independent Gaussian noise (sigma ~0.02), clamped to valid ranges. Color also shifts
- **Death:** Each tick, each replicator has `deathRate` chance to die
- **Hard population cap:** Default 2,000, configurable

## Simulation loop
- One tick per `requestAnimationFrame` (~60/sec)
- Speed multiplier: controls ticks-per-frame (1x, 2x, 5x, etc.)

## UI
- **Side panel** with sliders for: spawn rate, pop cap, sim speed, default replicator stats
- **Playback:** Play/pause, step one tick, reset
- **Live population count**
- **Click to inspect** a replicator's stats (tooltip)

## Not in v1
- Resource/energy model, density-based death, population graph, manual placement
