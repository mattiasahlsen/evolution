import type { RNG } from '../../rng'

export function gaussianRandom(rng: RNG): number {
  // Box-Muller transform
  const u1 = rng.next()
  const u2 = rng.next()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}
