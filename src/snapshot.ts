import type { ReplicatorStats } from './types'

export interface ReplicatorSnapshot {
  id: number
  x: number
  y: number
  heading: number
  stats: ReplicatorStats
}

export interface SimulationSnapshot {
  tickCount: number
  rngState: number
  nextReplicatorId: number
  replicators: ReplicatorSnapshot[]
}
