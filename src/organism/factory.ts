import type { RNG } from '../rng'
import { BaseOrganism, type Organism } from './organism'
import type { OrganismSnapshot } from './snapshot'
import type { Stats } from './stats'

export interface OrganismFactory {
  create(x: number, y: number, stats: Stats, heading: number): Organism
  replicate(parent: Organism, rng: RNG): Organism
  fromSnapshot(snap: OrganismSnapshot): Organism
  saveCounter(): number
  restoreCounter(value: number): void
}

export class OrganismFactory implements OrganismFactory {
  private nextId = 0
  private mutationSigma: number
  private speedScale: number

  constructor(config?: { mutationSigma?: number; speedScale?: number }) {
    this.mutationSigma = config?.mutationSigma ?? 0.02
    this.speedScale = config?.speedScale ?? 50
  }

  create(x: number, y: number, stats: Stats, heading: number): Organism {
    return new BaseOrganism({
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
    return new BaseOrganism({
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
