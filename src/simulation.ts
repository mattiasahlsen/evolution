import { Replicator, getNextId, setNextId } from './replicator';
import { Mulberry32 } from './rng';
import type { SimConfig } from './types';
import type { SimulationSnapshot } from './snapshot';

const MUTATION_SIGMA = 0.02;
const SPAWN_OFFSET = 15;
const HEADING_DRIFT = 0.3; // max radians per tick

function gaussianRandom(rng: Mulberry32): number {
  // Box-Muller transform
  const u1 = rng.next();
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class Simulation {
  replicators: Replicator[] = [];
  config: SimConfig;
  tickCount = 0;
  seed: number;
  rng: Mulberry32;
  private checkpoints = new Map<number, SimulationSnapshot>();
  private readonly checkpointInterval = 60;

  constructor(config: SimConfig) {
    this.config = config;
    this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.rng = new Mulberry32(this.seed);
  }

  tick(): void {
    this.tickCount++;
    this.executeTick();
    if (this.tickCount % this.checkpointInterval === 0) {
      this.checkpoints.set(this.tickCount, this.takeSnapshot());
    }
  }

  private executeTick(): void {
    this.spawn();
    this.replicateAndMutate();
    this.kill();
    this.move();
  }

  takeSnapshot(): SimulationSnapshot {
    return {
      tickCount: this.tickCount,
      rngState: this.rng.state,
      nextReplicatorId: getNextId(),
      replicators: this.replicators.map((r) => r.toSnapshot()),
    };
  }

  restoreSnapshot(snap: SimulationSnapshot): void {
    this.tickCount = snap.tickCount;
    this.rng = Mulberry32.fromState(snap.rngState);
    setNextId(snap.nextReplicatorId);
    this.replicators = snap.replicators.map((s) => Replicator.fromSnapshot(s));
  }

  storeInitialCheckpoint(): void {
    if (!this.checkpoints.has(0)) {
      this.checkpoints.set(0, this.takeSnapshot());
    }
  }

  hasCheckpoint(tick: number): boolean {
    return this.checkpoints.has(tick);
  }

  seekToTick(target: number): void {
    if (target < 0) return;

    // Find nearest checkpoint at or before target
    let bestTick = 0;
    for (const tick of this.checkpoints.keys()) {
      if (tick <= target && tick > bestTick) {
        bestTick = tick;
      }
    }

    const checkpoint = this.checkpoints.get(bestTick);
    if (checkpoint) {
      this.restoreSnapshot(checkpoint);
    }

    // Replay forward from checkpoint to target
    while (this.tickCount < target) {
      this.tickCount++;
      this.executeTick();
    }
  }

  reset(): void {
    this.replicators = [];
    this.tickCount = 0;
    this.checkpoints.clear();
    this.seed = (Math.random() * 0xffffffff) >>> 0;
    this.rng = new Mulberry32(this.seed);
    setNextId(0);
  }

  private spawn(): void {
    if (this.replicators.length >= this.config.populationCap) return;
    if (this.rng.next() < this.config.spawnRate) {
      const x = this.rng.next() * this.config.width;
      const y = this.rng.next() * this.config.height;
      const heading = this.rng.next() * Math.PI * 2;
      const hue = parseBaseHue(this.config.baseColor);
      this.replicators.push(
        new Replicator(x, y, this.config.defaultStats, hue, 70, 50, heading),
      );
    }
  }

  private replicateAndMutate(): void {
    const offspring: Replicator[] = [];
    for (const parent of this.replicators) {
      if (this.replicators.length + offspring.length >= this.config.populationCap) break;
      if (this.rng.next() < parent.stats.replicationRate) {
        const isMutation = this.rng.next() < parent.stats.mutationRate;
        const angle = this.rng.next() * Math.PI * 2;
        const dist = SPAWN_OFFSET + this.rng.next() * SPAWN_OFFSET;
        let childX = parent.x + Math.cos(angle) * dist;
        let childY = parent.y + Math.sin(angle) * dist;
        // Toroidal wrap
        childX = ((childX % this.config.width) + this.config.width) % this.config.width;
        childY = ((childY % this.config.height) + this.config.height) % this.config.height;

        let childStats = { ...parent.stats };
        let hue = parent.hue;
        let sat = parent.saturation;
        let lit = parent.lightness;

        if (isMutation) {
          childStats = {
            replicationRate: clamp(parent.stats.replicationRate + gaussianRandom(this.rng) * MUTATION_SIGMA, 0, 1),
            deathRate: clamp(parent.stats.deathRate + gaussianRandom(this.rng) * MUTATION_SIGMA, 0, 1),
            mutationRate: clamp(parent.stats.mutationRate + gaussianRandom(this.rng) * MUTATION_SIGMA, 0, 1),
            speed: clamp(parent.stats.speed + gaussianRandom(this.rng) * MUTATION_SIGMA * 50, 0, 5),
          };
          hue = (parent.hue + gaussianRandom(this.rng) * 10 + 360) % 360;
          sat = clamp(parent.saturation + gaussianRandom(this.rng) * 5, 30, 90);
          lit = clamp(parent.lightness + gaussianRandom(this.rng) * 5, 30, 70);
        }

        const heading = this.rng.next() * Math.PI * 2;
        offspring.push(new Replicator(childX, childY, childStats, hue, sat, lit, heading));
      }
    }
    this.replicators.push(...offspring);
  }

  private kill(): void {
    this.replicators = this.replicators.filter(
      (r) => this.rng.next() >= r.stats.deathRate,
    );
  }

  private move(): void {
    for (const r of this.replicators) {
      // Drift heading
      r.heading += (this.rng.next() - 0.5) * HEADING_DRIFT * 2;
      // Move
      r.x += Math.cos(r.heading) * r.stats.speed;
      r.y += Math.sin(r.heading) * r.stats.speed;
      // Toroidal wrap
      r.x = ((r.x % this.config.width) + this.config.width) % this.config.width;
      r.y = ((r.y % this.config.height) + this.config.height) % this.config.height;
    }
  }
}

function parseBaseHue(hslString: string): number {
  const match = hslString.match(/hsl\((\d+)/);
  return match ? parseInt(match[1], 10) : 140;
}
