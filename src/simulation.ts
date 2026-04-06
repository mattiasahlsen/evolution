import { Replicator } from './replicator';
import type { SimConfig } from './types';

const MUTATION_SIGMA = 0.02;
const SPAWN_OFFSET = 15;
const HEADING_DRIFT = 0.3; // max radians per tick

function gaussianRandom(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class Simulation {
  replicators: Replicator[] = [];
  config: SimConfig;
  tickCount = 0;

  constructor(config: SimConfig) {
    this.config = config;
  }

  tick(): void {
    this.tickCount++;
    this.spawn();
    this.replicateAndMutate();
    this.kill();
    this.move();
  }

  reset(): void {
    this.replicators = [];
    this.tickCount = 0;
  }

  private spawn(): void {
    if (this.replicators.length >= this.config.populationCap) return;
    if (Math.random() < this.config.spawnRate) {
      const x = Math.random() * this.config.width;
      const y = Math.random() * this.config.height;
      const hue = parseBaseHue(this.config.baseColor);
      this.replicators.push(
        new Replicator(x, y, this.config.defaultStats, hue),
      );
    }
  }

  private replicateAndMutate(): void {
    const offspring: Replicator[] = [];
    for (const parent of this.replicators) {
      if (this.replicators.length + offspring.length >= this.config.populationCap) break;
      if (Math.random() < parent.stats.replicationRate) {
        const isMutation = Math.random() < parent.stats.mutationRate;
        const angle = Math.random() * Math.PI * 2;
        const dist = SPAWN_OFFSET + Math.random() * SPAWN_OFFSET;
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
            replicationRate: clamp(parent.stats.replicationRate + gaussianRandom() * MUTATION_SIGMA, 0, 1),
            deathRate: clamp(parent.stats.deathRate + gaussianRandom() * MUTATION_SIGMA, 0, 1),
            mutationRate: clamp(parent.stats.mutationRate + gaussianRandom() * MUTATION_SIGMA, 0, 1),
            speed: clamp(parent.stats.speed + gaussianRandom() * MUTATION_SIGMA * 50, 0, 5),
          };
          hue = (parent.hue + gaussianRandom() * 10 + 360) % 360;
          sat = clamp(parent.saturation + gaussianRandom() * 5, 30, 90);
          lit = clamp(parent.lightness + gaussianRandom() * 5, 30, 70);
        }

        offspring.push(new Replicator(childX, childY, childStats, hue, sat, lit));
      }
    }
    this.replicators.push(...offspring);
  }

  private kill(): void {
    this.replicators = this.replicators.filter(
      (r) => Math.random() >= r.stats.deathRate,
    );
  }

  private move(): void {
    for (const r of this.replicators) {
      // Drift heading
      r.heading += (Math.random() - 0.5) * HEADING_DRIFT * 2;
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
