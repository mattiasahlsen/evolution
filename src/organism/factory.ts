import type { RNG } from '../rng'
import { type Organism, createOrganism } from './organism'
import type { OrganismSnapshot } from './snapshot'
import type { Stats } from './stats'

export interface OrganismFactory {
  create(x: number, y: number, stats: Stats, heading: number): Organism
  replicate(parent: Organism, rng: RNG): Organism
  fromSnapshot(snap: OrganismSnapshot): Organism
  saveCounter(): number
  restoreCounter(value: number): void
}

interface OrganismFactoryBuildParams {
  mutationSigma?: number
  speedScale?: number
}

class OrganismFactoryImpl implements OrganismFactory {
  private nextId = 0
  private mutationSigma: number
  private speedScale: number

  constructor(config?: OrganismFactoryBuildParams) {
    this.mutationSigma = config?.mutationSigma ?? 0.02
    this.speedScale = config?.speedScale ?? 50
  }

  create(x: number, y: number, stats: Stats, heading: number): Organism {
    return createOrganism({
      id: this.nextId++,
      x,
      y,
      heading,
      stats: { ...stats },
    })
  }

  replicate(parent: Organism, rng: RNG): Organism {
    return parent.replicate({
      id: this.nextId++,
      rng,
      mutationSigma: this.mutationSigma,
      speedScale: this.speedScale,
    })
  }

  fromSnapshot(snap: OrganismSnapshot): Organism {
    return createOrganism({
      id: snap.id,
      x: snap.x,
      y: snap.y,
      heading: snap.heading,
      stats: { ...snap.stats },
    })
  }

  saveCounter(): number {
    return this.nextId
  }

  restoreCounter(value: number): void {
    this.nextId = value
  }
}

export function createOrganismFactory(
  config?: OrganismFactoryBuildParams,
): OrganismFactory {
  return new OrganismFactoryImpl(config)
}
