import { describe, it, expect } from 'vitest'
import { Simulation } from './simulation'
import { DEFAULT_CONFIG } from '../config'

describe('Simulation', () => {
  describe('regression - snapshot tests', () => {
    const config = { ...DEFAULT_CONFIG, seed: 1000 }

    it.each([0, 100, 1000, 10_000])(
      'it matches snapshot for %i ticks with default config',
      async (ticks) => {
        const simulation = new Simulation(config)
        for (let i = 0; i < ticks; i++) {
          simulation.tick()
        }
        const snapshot = simulation.takeSnapshot()

        await expect(snapshot).toMatchFileSnapshot(
          `__snapshots__/${ticks}-ticks.json`,
        )
      },
    )
  })
})
