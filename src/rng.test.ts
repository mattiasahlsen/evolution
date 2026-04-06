import { describe, it, expect } from 'vitest'
import { Mulberry32 } from './rng'

describe('Mulberry32', () => {
  it('next() returns value in [0, 1)', () => {
    const rng = new Mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('same seed produces same sequence', () => {
    const rng1 = new Mulberry32(42)
    const rng2 = new Mulberry32(42)
    for (let i = 0; i < 20; i++) {
      expect(rng1.next()).toBe(rng2.next())
    }
  })

  it('different seeds produce different sequences', () => {
    const rng1 = new Mulberry32(1)
    const rng2 = new Mulberry32(2)
    const values1 = Array.from({ length: 10 }, () => rng1.next())
    const values2 = Array.from({ length: 10 }, () => rng2.next())
    expect(values1).not.toEqual(values2)
  })

  it('state getter updates after each next() call', () => {
    const rng = new Mulberry32(100)
    const stateBefore = rng.state
    rng.next()
    expect(rng.state).not.toBe(stateBefore)
  })

  it('fromState() resumes the same sequence', () => {
    const rng = new Mulberry32(999)
    // Advance a few steps
    rng.next()
    rng.next()
    const savedState = rng.state

    // Get expected next values from original
    const expected = [rng.next(), rng.next(), rng.next()]

    // Restore from state and compare
    const resumed = Mulberry32.fromState(savedState)
    const actual = [resumed.next(), resumed.next(), resumed.next()]

    expect(actual).toEqual(expected)
  })

  it('seed is integer-truncated via | 0', () => {
    const rng1 = new Mulberry32(1)
    const rng2 = new Mulberry32(1.9)
    const values1 = Array.from({ length: 5 }, () => rng1.next())
    const values2 = Array.from({ length: 5 }, () => rng2.next())
    expect(values1).toEqual(values2)
  })
})
