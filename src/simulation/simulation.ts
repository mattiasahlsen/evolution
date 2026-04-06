import { createOrganismFactory } from '../organism'
import type { Organism, OrganismSnapshot } from '../organism'
import { Mulberry32 } from '../rng'
import type { SimConfig } from '../config'

const SPAWN_OFFSET = 15
const HEADING_DRIFT = 0.3 // max radians per tick

interface SimulationSnapshot {
  tickCount: number
  rngState: number
  nextOrganismId: number
  organisms: OrganismSnapshot[]
}

export class Simulation {
  replicators: Organism[] = []
  config: SimConfig
  tickCount = 0
  seed: number
  rng: Mulberry32
  private organisms = createOrganismFactory()
  private checkpoints = new Map<number, SimulationSnapshot>()
  private readonly checkpointInterval = 60

  constructor(config: SimConfig) {
    this.config = config
    this.seed = config.seed ?? (Math.random() * 0xffffffff) >>> 0
    this.rng = new Mulberry32(this.seed)
  }

  tick(): void {
    this.tickCount++
    this.executeTick()
    if (this.tickCount % this.checkpointInterval === 0) {
      this.checkpoints.set(this.tickCount, this.takeSnapshot())
    }
  }

  private executeTick(): void {
    this.spawn()
    this.replicateAndMutate()
    this.kill()
    this.move()
  }

  takeSnapshot(): SimulationSnapshot {
    return {
      tickCount: this.tickCount,
      rngState: this.rng.state,
      nextOrganismId: this.organisms.saveCounter(),
      organisms: this.replicators.map((r) => this.organisms.toSnapshot(r)),
    }
  }

  restoreSnapshot(snap: SimulationSnapshot): void {
    this.tickCount = snap.tickCount
    this.rng = Mulberry32.fromState(snap.rngState)
    this.organisms.restoreCounter(snap.nextOrganismId)
    this.replicators = snap.organisms.map((s) => this.organisms.fromSnapshot(s))
  }

  storeInitialCheckpoint(): void {
    if (!this.checkpoints.has(0)) {
      this.checkpoints.set(0, this.takeSnapshot())
    }
  }

  hasCheckpoint(tick: number): boolean {
    return this.checkpoints.has(tick)
  }

  seekToTick(target: number): void {
    if (target < 0) return

    // Find nearest checkpoint at or before target
    let bestTick = 0
    for (const tick of this.checkpoints.keys()) {
      if (tick <= target && tick > bestTick) {
        bestTick = tick
      }
    }

    const checkpoint = this.checkpoints.get(bestTick)
    if (checkpoint) {
      this.restoreSnapshot(checkpoint)
    }

    // Replay forward from checkpoint to target
    while (this.tickCount < target) {
      this.tickCount++
      this.executeTick()
    }
  }

  reset(): void {
    this.replicators = []
    this.tickCount = 0
    this.checkpoints.clear()
    this.seed = (Math.random() * 0xffffffff) >>> 0
    this.rng = new Mulberry32(this.seed)
    this.organisms.restoreCounter(0)
  }

  private spawn(): void {
    if (this.replicators.length >= this.config.populationCap) return
    if (this.rng.next() < this.config.spawnRate) {
      const x = this.rng.next() * this.config.width
      const y = this.rng.next() * this.config.height
      const heading = this.rng.next() * Math.PI * 2
      this.replicators.push(
        this.organisms.create(x, y, this.config.defaultStats, heading),
      )
    }
  }

  private replicateAndMutate(): void {
    const offspring: Organism[] = []
    for (const parent of this.replicators) {
      if (
        this.replicators.length + offspring.length >=
        this.config.populationCap
      )
        break
      if (this.rng.next() < parent.stats.replicationRate) {
        // Position RNG calls must happen before replicate() to preserve sequence
        const angle = this.rng.next() * Math.PI * 2
        const dist = SPAWN_OFFSET + this.rng.next() * SPAWN_OFFSET
        let childX = parent.x + Math.cos(angle) * dist
        let childY = parent.y + Math.sin(angle) * dist
        // Toroidal wrap
        childX =
          ((childX % this.config.width) + this.config.width) % this.config.width
        childY =
          ((childY % this.config.height) + this.config.height) %
          this.config.height

        // replicate() consumes: rng.next() for isMutation, then 8× if mutating
        const child = this.organisms.replicate(parent, this.rng)

        // Heading RNG call stays after replicate() to preserve sequence
        const heading = this.rng.next() * Math.PI * 2
        child.x = childX
        child.y = childY
        child.heading = heading
        offspring.push(child)
      }
    }
    this.replicators.push(...offspring)
  }

  private kill(): void {
    this.replicators = this.replicators.filter(
      (r) => this.rng.next() >= r.stats.deathRate,
    )
  }

  private move(): void {
    for (const r of this.replicators) {
      // Drift heading
      r.heading += (this.rng.next() - 0.5) * HEADING_DRIFT * 2
      // Move
      r.x += Math.cos(r.heading) * r.stats.speed
      r.y += Math.sin(r.heading) * r.stats.speed
      // Toroidal wrap
      r.x = ((r.x % this.config.width) + this.config.width) % this.config.width
      r.y =
        ((r.y % this.config.height) + this.config.height) % this.config.height
    }
  }
}
