import { describe, it, expect } from 'vitest'
import { clamp } from './clamp'
import { gaussianRandom } from './gaussianRandom'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to min when value is below', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
  })

  it('clamps to max when value is above', () => {
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('works with negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(0, -10, -1)).toBe(-1)
    expect(clamp(-20, -10, -1)).toBe(-10)
  })
})

describe('gaussianRandom', () => {
  it('calls rng.next() exactly twice', () => {
    let callCount = 0
    const rng = {
      next: () => {
        callCount++
        return 0.5
      },
    }
    gaussianRandom(rng)
    expect(callCount).toBe(2)
  })

  it('returns a finite number', () => {
    const rng = { next: () => 0.5 }
    const result = gaussianRandom(rng)
    expect(Number.isFinite(result)).toBe(true)
  })

  it('produces known output for known input', () => {
    // Box-Muller: sqrt(-2 * ln(u1)) * cos(2π * u2) with u1=u2=0.5
    const rng = { next: () => 0.5 }
    const expected = Math.sqrt(-2 * Math.log(0.5)) * Math.cos(2 * Math.PI * 0.5)
    expect(gaussianRandom(rng)).toBeCloseTo(expected, 10)
  })

  it('returns different values for different RNG inputs', () => {
    let call1 = 0
    const rng1 = { next: () => (call1++ === 0 ? 0.1 : 0.2) }

    let call2 = 0
    const rng2 = { next: () => (call2++ === 0 ? 0.9 : 0.8) }

    expect(gaussianRandom(rng1)).not.toBe(gaussianRandom(rng2))
  })
})
