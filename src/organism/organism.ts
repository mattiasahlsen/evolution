import type { RNG } from '../rng'
import { clamp } from './helpers/clamp'
import { gaussianRandom } from './helpers/gaussianRandom'
import type { OrganismSnapshot } from './snapshot'
import type { Stats } from './stats'

export interface Organism {
  readonly getId: () => number

  getPosition: () => { x: number; y: number }
  setPosition: (position: { x: number; y: number }) => void

  getHeading: () => number
  setHeading: (heading: number) => void

  getStats: () => Stats

  replicate(options: {
    id: number
    rng: RNG
    mutationSigma: number
    speedScale: number
  }): Organism

  toSnapshot(): OrganismSnapshot
}
interface OrganismBuildParams {
  id: number
  x: number
  y: number
  heading: number
  stats: Stats
}

class OrganismImpl implements Organism {
  private readonly id: number
  private x: number
  private y: number
  private heading: number
  private readonly stats: Stats

  constructor(options: OrganismBuildParams) {
    this.id = options.id
    this.x = options.x
    this.y = options.y
    this.heading = options.heading
    this.stats = options.stats
  }

  getId() {
    return this.id
  }

  getPosition() {
    return { x: this.x, y: this.y }
  }
  setPosition(position: { x: number; y: number }) {
    this.x = position.x
    this.y = position.y
  }

  getHeading() {
    return this.heading
  }
  setHeading(heading: number) {
    this.heading = heading
  }

  getStats() {
    return this.stats
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
            0.005,
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

    return new OrganismImpl({
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

export function createOrganism(options: OrganismBuildParams): Organism {
  return new OrganismImpl(options)
}
