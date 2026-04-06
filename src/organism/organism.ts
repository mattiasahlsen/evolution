import type { RNG } from '../rng'
import { clamp } from './helpers/clamp'
import { gaussianRandom } from './helpers/gaussianRandom'
import type { OrganismSnapshot } from './snapshot'
import type { Stats } from './stats'

export interface Organism {
  readonly id: number
  x: number
  y: number
  heading: number
  readonly stats: Stats

  replicate(options: {
    id: number
    rng: RNG
    mutationSigma: number
    speedScale: number
  }): Organism

  toSnapshot(): OrganismSnapshot
}

export class BaseOrganism implements Organism {
  public readonly id: number
  public x: number
  public y: number
  public heading: number
  public readonly stats: Stats

  constructor(options: {
    id: number
    x: number
    y: number
    heading: number
    stats: Stats
  }) {
    this.id = options.id
    this.x = options.x
    this.y = options.y
    this.heading = options.heading
    this.stats = options.stats
  }

  replicate({
    id,
    rng,
    mutationSigma,
    speedScale,
  }: {
    id: number
    rng: RNG
    mutationSigma: number
    speedScale: number
  }): Organism {
    const isMutation = rng.next() < this.stats.mutationRate
    const stats: Stats = isMutation
      ? {
          replicationRate: clamp(
            this.stats.replicationRate + gaussianRandom(rng) * mutationSigma,
            0,
            1,
          ),
          deathRate: clamp(
            this.stats.deathRate + gaussianRandom(rng) * mutationSigma,
            0,
            1,
          ),
          mutationRate: clamp(
            this.stats.mutationRate + gaussianRandom(rng) * mutationSigma,
            0,
            1,
          ),
          speed: clamp(
            this.stats.speed + gaussianRandom(rng) * mutationSigma * speedScale,
            0,
            5,
          ),
        }
      : { ...this.stats }

    return new BaseOrganism({
      id,
      x: this.x,
      y: this.y,
      heading: this.heading,
      stats,
    })
  }

  toSnapshot(): OrganismSnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      heading: this.heading,
      stats: { ...this.stats },
    }
  }
}
