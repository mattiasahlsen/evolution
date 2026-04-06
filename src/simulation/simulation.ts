import { OrganismFactory } from '../organism/factory'
import type { Organism } from '../organism/organism'
import type { OrganismSnapshot } from '../organism/snapshot'
import { Mulberry32 } from '../rng'
import type { SimConfig } from './config'

const SPAWN_OFFSET = 15
const HEADING_DRIFT = 0.3 // max radians per tick

interface SimulationSnapshot {
  tickCount: number
  rngState: number
  nextOrganismId: number
  organismSnapshots: OrganismSnapshot[]
}

export class Simulation {
  private readonly config: SimConfig

  private organisms: Organism[] = []
  private tickCount = 0
  private seed: number
  private rng: Mulberry32
  private organismFactory = new OrganismFactory()
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

  takeSnapshot(): SimulationSnapshot {
    return {
      tickCount: this.tickCount,
      rngState: this.rng.state,
      nextOrganismId: this.organismFactory.saveCounter(),
      organismSnapshots: this.organisms.map((organism) =>
        organism.toSnapshot(),
      ),
    }
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
    this.organisms = []
    this.tickCount = 0
    this.checkpoints.clear()
    this.seed = (Math.random() * 0xffffffff) >>> 0
    this.rng = new Mulberry32(this.seed)
    this.organismFactory.restoreCounter(0)
  }

  getReplicators(): Organism[] {
    return this.organisms
  }

  getTickCount(): number {
    return this.tickCount
  }

  private executeTick(): void {
    this.spawn()
    this.replicateAndMutate()
    this.kill()
    this.move()
  }

  private restoreSnapshot(snap: SimulationSnapshot): void {
    this.tickCount = snap.tickCount
    this.rng = Mulberry32.fromState(snap.rngState)
    this.organismFactory.restoreCounter(snap.nextOrganismId)
    this.organisms = snap.organismSnapshots.map((snap) =>
      this.organismFactory.fromSnapshot(snap),
    )
  }

  private spawn(): void {
    if (this.organisms.length >= this.config.populationCap) return
    if (this.rng.next() < this.config.spawnRate) {
      const x = this.rng.next() * this.config.width
      const y = this.rng.next() * this.config.height
      const heading = this.rng.next() * Math.PI * 2
      this.organisms.push(
        this.organismFactory.create(x, y, this.config.defaultStats, heading),
      )
    }
  }

  private replicateAndMutate(): void {
    const offspring: Organism[] = []
    for (const parent of this.organisms) {
      if (this.organisms.length + offspring.length >= this.config.populationCap)
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
        const child = this.organismFactory.replicate(parent, this.rng)

        // Heading RNG call stays after replicate() to preserve sequence
        const heading = this.rng.next() * Math.PI * 2
        child.x = childX
        child.y = childY
        child.heading = heading
        offspring.push(child)
      }
    }
    this.organisms.push(...offspring)
  }

  private kill(): void {
    this.organisms = this.organisms.filter(
      (r) => this.rng.next() >= r.stats.deathRate,
    )
  }

  private move(): void {
    for (const r of this.organisms) {
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
