import type { ReplicatorStats } from './types'

export interface ReplicatorSnapshot {
  id: number
  x: number
  y: number
  heading: number
  stats: ReplicatorStats
  hue: number
  saturation: number
  lightness: number
}

export interface SimulationSnapshot {
  tickCount: number
  rngState: number
  nextReplicatorId: number
  replicators: ReplicatorSnapshot[]
}
