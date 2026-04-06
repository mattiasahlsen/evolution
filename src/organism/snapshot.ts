import type { Stats } from './stats'

export interface OrganismSnapshot {
  id: number
  x: number
  y: number
  heading: number
  stats: Stats
}
