const COLOR_THRESHOLD = 0.2

function gaussianRandom(rng: { next(): number }): number {
  // Box-Muller transform
  const u1 = rng.next()
  const u2 = rng.next()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export interface Stats {
  replicationRate: number // 0–1, chance per tick to replicate
  deathRate: number       // 0–1, chance per tick to die
  mutationRate: number    // 0–1, fraction of replications that mutate
  speed: number           // 0–5, pixels per tick
}

export interface Organism {
  readonly id: number
  x: number
  y: number
  heading: number
  readonly stats: Stats
}

export interface OrganismSnapshot {
  id: number
  x: number
  y: number
  heading: number
  stats: Stats
}

export interface OrganismFactory {
  create(x: number, y: number, stats: Stats, heading: number): Organism
  replicate(parent: Organism, rng: { next(): number }): Organism
  toSnapshot(o: Organism): OrganismSnapshot
  fromSnapshot(snap: OrganismSnapshot): Organism
  saveCounter(): number
  restoreCounter(value: number): void
}

export function statsToColor(stats: Stats): string {
  const r = Math.round(Math.min(stats.replicationRate / COLOR_THRESHOLD, 1) * 255)
  const g = Math.round(Math.min(stats.deathRate / COLOR_THRESHOLD, 1) * 255)
  const b = Math.round(Math.min(stats.mutationRate / COLOR_THRESHOLD, 1) * 255)
  return `rgb(${r},${g},${b})`
}

export function createOrganismFactory(config?: {
  mutationSigma?: number
  speedScale?: number
}): OrganismFactory {
  const sigma = config?.mutationSigma ?? 0.02
  const speedScale = config?.speedScale ?? 50
  let nextId = 0

  return {
    create(x, y, stats, heading): Organism {
      return { id: nextId++, x, y, heading, stats: { ...stats } }
    },

    replicate(parent, rng): Organism {
      const isMutation = rng.next() < parent.stats.mutationRate
      const stats: Stats = isMutation
        ? {
            replicationRate: clamp(parent.stats.replicationRate + gaussianRandom(rng) * sigma, 0, 1),
            deathRate: clamp(parent.stats.deathRate + gaussianRandom(rng) * sigma, 0, 1),
            mutationRate: clamp(parent.stats.mutationRate + gaussianRandom(rng) * sigma, 0, 1),
            speed: clamp(parent.stats.speed + gaussianRandom(rng) * sigma * speedScale, 0, 5),
          }
        : { ...parent.stats }
      return { id: nextId++, x: parent.x, y: parent.y, heading: parent.heading, stats }
    },

    toSnapshot(o): OrganismSnapshot {
      return { id: o.id, x: o.x, y: o.y, heading: o.heading, stats: { ...o.stats } }
    },

    fromSnapshot(snap): Organism {
      return { id: snap.id, x: snap.x, y: snap.y, heading: snap.heading, stats: { ...snap.stats } }
    },

    saveCounter(): number {
      return nextId
    },

    restoreCounter(value): void {
      nextId = value
    },
  }
}
