# Plan: Stat-based Color Logic

## Context

Colors are currently inherited from a parent with small random HSL mutations on each replication. This makes color an emergent lineage proxy, but decoupled from actual stats. The goal is to make color a **pure, deterministic function of stats** — so visual appearance directly encodes the organism's biology at a glance.

Decided design:
- **R** = `replicationRate` (range 0–0.2 → 0–255)
- **G** = `deathRate` (range 0–0.2 → 0–255)
- **B** = `mutationRate` (range 0–0.2 → 0–255)
- **Saturation**: always 100% (speed has no visual effect)
- Format: `rgb(R, G, B)`

All three rates use the same 0–0.2 clamp range so channels are on equal footing.

## Files to Modify

### 1. `src/types.ts`
- Remove `baseColor: string` from `SimConfig`
- Remove `baseColor: 'hsl(140, 70%, 50%)'` from `DEFAULT_CONFIG`

### 2. `src/snapshot.ts`
- Remove `hue`, `saturation`, `lightness` from `ReplicatorSnapshot`

### 3. `src/replicator.ts`
- Remove fields: `hue`, `saturation`, `lightness`
- Remove those parameters from the constructor
- Rewrite `color` getter:
  ```ts
  get color(): string {
    const r = Math.round(Math.min(this.stats.replicationRate / 0.2, 1) * 255);
    const g = Math.round(Math.min(this.stats.deathRate / 0.2, 1) * 255);
    const b = Math.round(Math.min(this.stats.mutationRate / 0.2, 1) * 255);
    return `rgb(${r},${g},${b})`;
  }
  ```
- Remove `hue`/`saturation`/`lightness` from `toSnapshot()` and `fromSnapshot()`

### 4. `src/simulation.ts`
- In `spawn()`: remove `hue` variable and `parseBaseHue` call; update `new Replicator(...)` call to drop the three color args
- In `replicateAndMutate()`: remove `hue`, `sat`, `lit` variables and their mutation block (lines 137–150); update offspring `new Replicator(...)` call
- Delete `parseBaseHue` function at the bottom of the file

## No Changes Needed
- `src/renderer.ts` — uses `r.color` generically
- `src/sprite.ts` — uses color string as a cache key; still works
- `src/ui.ts` — uses `r.color` in tooltip; still works
- `src/main.ts` — uses `DEFAULT_CONFIG`; will pick up removal automatically

## Verification

1. Run `pnpm dev` and open the app
2. Spawn replicators — confirm they are not black (default stats give R≈26, G≈13, B≈128, a medium blue-purple)
3. Evolve for many ticks — confirm colors shift as stats mutate (more red = faster replicators, more green = hardier, more blue = hypermutators)
4. Click a replicator — confirm tooltip `Color:` shows an `rgb(...)` string matching its visual color
5. Confirm TypeScript compiles cleanly with no errors about `hue`, `saturation`, `lightness`, or `baseColor`
