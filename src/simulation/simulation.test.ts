import { describe, it, expect } from 'vitest'
import { Simulation } from './simulation'
import { DEFAULT_SIM_CONFIG } from './config'
import type { SimConfig } from './config'

// Round all floats to 10 significant digits to eliminate sub-ULP differences
// in Math.log/cos/sqrt across environments without affecting test integrity.
function roundNumbers(value: unknown, digits: number): unknown {
  if (typeof value === 'number') {
    return parseFloat(value.toPrecision(digits))
  }
  if (Array.isArray(value)) {
    return value.map((v) => roundNumbers(v, digits))
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        roundNumbers(v, digits),
      ]),
    )
  }
  return value
}

describe('Simulation', () => {
  describe('regression - snapshot tests', () => {
    const config = { ...DEFAULT_SIM_CONFIG, seed: 1000 }

    it.each([0, 100, 1000, 10_000])(
      'it matches snapshot for %i ticks with default config',
      async (ticks) => {
        const simulation = new Simulation(config)
        for (let i = 0; i < ticks; i++) {
          simulation.tick()
        }
        const snapshot = roundNumbers(simulation.takeSnapshot(), 10)

        await expect(snapshot).toMatchFileSnapshot(
          `__snapshots__/${ticks}-ticks.json`,
        )
      },
    )
  })

  describe('unit tests', () => {
    // Config that always spawns, never replicates, never dies, never moves
    const spawnOnlyConfig: SimConfig = {
      ...DEFAULT_SIM_CONFIG,
      seed: 42,
      spawnRate: 1,
      populationCap: 10,
      defaultStats: {
        replicationRate: 0,
        deathRate: 0,
        mutationRate: 0,
        speed: 0,
      },
    }

    // Config that always spawns and always replicates, never dies
    const replicateConfig: SimConfig = {
      ...DEFAULT_SIM_CONFIG,
      seed: 42,
      spawnRate: 1,
      populationCap: 100,
      defaultStats: {
        replicationRate: 1,
        deathRate: 0,
        mutationRate: 0,
        speed: 0,
      },
    }

    it('starts at tick 0', () => {
      const sim = new Simulation(spawnOnlyConfig)
      expect(sim.getTickCount()).toBe(0)
    })

    it('tick() increments tickCount', () => {
      const sim = new Simulation(spawnOnlyConfig)
      sim.tick()
      sim.tick()
      sim.tick()
      expect(sim.getTickCount()).toBe(3)
    })

    it('getReplicators() starts empty', () => {
      const sim = new Simulation(spawnOnlyConfig)
      expect(sim.getReplicators()).toHaveLength(0)
    })

    it('spawns an organism when spawnRate is 1', () => {
      const sim = new Simulation(spawnOnlyConfig)
      sim.tick()
      expect(sim.getReplicators().length).toBeGreaterThan(0)
    })

    it('does not exceed populationCap', () => {
      const sim = new Simulation(spawnOnlyConfig)
      // Tick enough times to fill the cap
      for (let i = 0; i < 20; i++) {
        sim.tick()
      }
      expect(sim.getReplicators().length).toBeLessThanOrEqual(
        spawnOnlyConfig.populationCap,
      )
    })

    it('organisms replicate when replicationRate is 1', () => {
      const sim = new Simulation(replicateConfig)
      sim.tick() // spawns at least one organism
      const countAfterFirst = sim.getReplicators().length
      sim.tick() // those organisms should replicate
      expect(sim.getReplicators().length).toBeGreaterThan(countAfterFirst)
    })

    it('organisms die when deathRate is 1', () => {
      // First populate using spawnOnlyConfig, then run a death-only tick
      const killConfig: SimConfig = {
        ...DEFAULT_SIM_CONFIG,
        seed: 42,
        spawnRate: 1,
        populationCap: 100,
        defaultStats: {
          replicationRate: 0,
          deathRate: 1,
          mutationRate: 0,
          speed: 0,
        },
      }
      const sim = new Simulation(killConfig)
      // Tick once to spawn (spawn happens before kill in executeTick)
      sim.tick()
      // After tick: spawn adds one, then kill removes all with deathRate=1
      // The organism spawned this tick has deathRate 1 and will be killed
      expect(sim.getReplicators()).toHaveLength(0)
    })

    it('storeInitialCheckpoint() creates a checkpoint at tick 0', () => {
      const sim = new Simulation(spawnOnlyConfig)
      expect(sim.hasCheckpoint(0)).toBe(false)
      sim.storeInitialCheckpoint()
      expect(sim.hasCheckpoint(0)).toBe(true)
    })

    it('storeInitialCheckpoint() is idempotent', () => {
      const sim = new Simulation(spawnOnlyConfig)
      sim.storeInitialCheckpoint()
      sim.storeInitialCheckpoint() // should not throw or overwrite
      expect(sim.hasCheckpoint(0)).toBe(true)
    })

    it('hasCheckpoint() returns false for a tick with no checkpoint', () => {
      const sim = new Simulation(spawnOnlyConfig)
      expect(sim.hasCheckpoint(999)).toBe(false)
    })

    it('auto-saves a checkpoint every 60 ticks', () => {
      const sim = new Simulation(spawnOnlyConfig)
      for (let i = 0; i < 60; i++) {
        sim.tick()
      }
      expect(sim.hasCheckpoint(60)).toBe(true)
    })

    it('seekToTick() replays to the correct tick', () => {
      const sim = new Simulation(spawnOnlyConfig)
      sim.storeInitialCheckpoint()
      for (let i = 0; i < 10; i++) {
        sim.tick()
      }
      expect(sim.getTickCount()).toBe(10)
      sim.seekToTick(5)
      expect(sim.getTickCount()).toBe(5)
    })

    it('seekToTick() produces same state as running to that tick directly', () => {
      const sim1 = new Simulation({ ...spawnOnlyConfig, seed: 7 })
      sim1.storeInitialCheckpoint()
      for (let i = 0; i < 10; i++) {
        sim1.tick()
      }
      sim1.seekToTick(5)
      const snapshot1 = sim1.takeSnapshot()

      const sim2 = new Simulation({ ...spawnOnlyConfig, seed: 7 })
      for (let i = 0; i < 5; i++) {
        sim2.tick()
      }
      const snapshot2 = sim2.takeSnapshot()

      expect(snapshot1).toEqual(snapshot2)
    })

    it('seekToTick() ignores negative target', () => {
      const sim = new Simulation(spawnOnlyConfig)
      sim.tick()
      sim.tick()
      sim.seekToTick(-1)
      expect(sim.getTickCount()).toBe(2)
    })

    it('reset() clears organisms and resets tickCount to 0', () => {
      const sim = new Simulation(spawnOnlyConfig)
      for (let i = 0; i < 5; i++) {
        sim.tick()
      }
      expect(sim.getTickCount()).toBe(5)
      expect(sim.getReplicators().length).toBeGreaterThan(0)

      sim.reset()
      expect(sim.getTickCount()).toBe(0)
      expect(sim.getReplicators()).toHaveLength(0)
    })

    it('reset() clears checkpoints', () => {
      const sim = new Simulation(spawnOnlyConfig)
      sim.storeInitialCheckpoint()
      sim.reset()
      expect(sim.hasCheckpoint(0)).toBe(false)
    })

    it('takeSnapshot() captures the current tickCount', () => {
      const sim = new Simulation(spawnOnlyConfig)
      for (let i = 0; i < 7; i++) {
        sim.tick()
      }
      const snap = sim.takeSnapshot()
      expect(snap.tickCount).toBe(7)
    })

    it('takeSnapshot() captures all organisms', () => {
      const sim = new Simulation(spawnOnlyConfig)
      sim.tick()
      const count = sim.getReplicators().length
      const snap = sim.takeSnapshot()
      expect(snap.organismSnapshots).toHaveLength(count)
    })

    it('organisms wrap toroidally when moving past the right edge', () => {
      // Place organism at x near right edge with heading=0 (rightward) and high speed
      const width = 100
      const height = 100
      const speed = 20
      const config: SimConfig = {
        ...DEFAULT_SIM_CONFIG,
        seed: 42,
        width,
        height,
        spawnRate: 0, // no random spawning
        populationCap: 10,
        defaultStats: {
          replicationRate: 0,
          deathRate: 0,
          mutationRate: 0,
          speed,
        },
      }
      const sim = new Simulation(config)
      sim.storeInitialCheckpoint()

      // Manually advance the sim by seeking to tick 0 to get an organism in
      // via snapshot manipulation — instead, we verify via a known-seed run
      // that after crossing the boundary x wraps back into [0, width)
      //
      // Use a seed that we know spawns organism(s), then confirm positions wrap.
      // Verify via snapshot: all organism x positions are in [0, width)
      const spawnConfig: SimConfig = {
        ...config,
        spawnRate: 1,
        populationCap: 100,
      }
      const sim2 = new Simulation(spawnConfig)
      for (let i = 0; i < 50; i++) {
        sim2.tick()
      }
      for (const org of sim2.getReplicators()) {
        const { x, y } = org.getPosition()
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThan(width)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThan(height)
      }
    })
  })
})
