import { CONFIG } from '../config'

export interface Stats {
  replicationRate: number // 0–1, chance per tick to replicate
  deathRate: number // 0–1, chance per tick to die
  mutationRate: number // 0–1, fraction of replications that mutate
  speed: number // 0–5, pixels per tick
}

export function statsToColor(stats: Stats): string {
  const r = Math.round(
    Math.min(stats.replicationRate / CONFIG.colorThreshold, 1) * 255,
  )
  const g = Math.round(
    Math.min(stats.deathRate / CONFIG.colorThreshold, 1) * 255,
  )
  const b = Math.round(
    Math.min(stats.mutationRate / CONFIG.colorThreshold, 1) * 255,
  )
  return `rgb(${r},${g},${b})`
}
