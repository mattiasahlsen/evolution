import type { Stats } from './organism'

export interface SimConfig {
  width: number
  height: number
  spawnRate: number // 0–1, chance per tick to spawn a new replicator
  populationCap: number
  ticksPerFrame: number
  defaultStats: Stats
}

export const DEFAULT_CONFIG: SimConfig = {
  width: 800,
  height: 600,
  spawnRate: 0,
  populationCap: 2000,
  ticksPerFrame: 1,
  defaultStats: {
    replicationRate: 0.02,
    deathRate: 0.01,
    mutationRate: 0.1,
    speed: 1.0,
  },
}
