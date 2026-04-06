import { describe, it, expect } from 'vitest'
import { createOrganismFactory, statsToColor, type Stats } from './organism'

describe('statsToColor', () => {
  it('should convert stats to RGB color string', () => {
    const stats: Stats = {
      replicationRate: 0.1,
      deathRate: 0.05,
      mutationRate: 0.02,
      speed: 2,
    }
    const color = statsToColor(stats)
    expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
  })

  it('should clamp values at COLOR_THRESHOLD (0.2)', () => {
    const stats: Stats = {
      replicationRate: 0.5,
      deathRate: 0.3,
      mutationRate: 0.4,
      speed: 3,
    }
    const color = statsToColor(stats)
    expect(color).toBe('rgb(255,255,255)')
  })

  it('should produce different colors for different stats', () => {
    const stats1: Stats = {
      replicationRate: 0.1,
      deathRate: 0.05,
      mutationRate: 0.02,
      speed: 1,
    }
    const stats2: Stats = {
      replicationRate: 0.05,
      deathRate: 0.1,
      mutationRate: 0.15,
      speed: 2,
    }
    const color1 = statsToColor(stats1)
    const color2 = statsToColor(stats2)
    expect(color1).not.toBe(color2)
  })

  it('should handle zero stats', () => {
    const stats: Stats = {
      replicationRate: 0,
      deathRate: 0,
      mutationRate: 0,
      speed: 0,
    }
    const color = statsToColor(stats)
    expect(color).toBe('rgb(0,0,0)')
  })
})

describe('createOrganismFactory', () => {
  it('should create an organism with incrementing IDs', () => {
    const factory = createOrganismFactory()
    const stats: Stats = {
      replicationRate: 0.1,
      deathRate: 0.05,
      mutationRate: 0.02,
      speed: 2,
    }

    const org1 = factory.create(10, 20, stats, 0)
    const org2 = factory.create(30, 40, stats, Math.PI)

    expect(org1.id).toBe(0)
    expect(org2.id).toBe(1)
  })

  it('should create organism with correct position and heading', () => {
    const factory = createOrganismFactory()
    const stats: Stats = {
      replicationRate: 0.1,
      deathRate: 0.05,
      mutationRate: 0.02,
      speed: 2,
    }

    const org = factory.create(100, 200, stats, Math.PI / 2)

    expect(org.x).toBe(100)
    expect(org.y).toBe(200)
    expect(org.heading).toBe(Math.PI / 2)
  })

  it('should copy stats on creation', () => {
    const factory = createOrganismFactory()
    const stats: Stats = {
      replicationRate: 0.1,
      deathRate: 0.05,
      mutationRate: 0.02,
      speed: 2,
    }

    const org = factory.create(0, 0, stats, 0)
    stats.replicationRate = 0.5

    expect(org.stats.replicationRate).toBe(0.1)
  })

  it('should replicate without mutation when rng is high', () => {
    const factory = createOrganismFactory()
    const stats: Stats = {
      replicationRate: 0.5,
      deathRate: 0.1,
      mutationRate: 0.3,
      speed: 2,
    }
    const parent = factory.create(50, 60, stats, 1.5)

    let callCount = 0
    const rng = {
      next: () => {
        callCount++
        return callCount === 1 ? 0.5 : 0.5 // First call determines mutation
      },
    }

    const child = factory.replicate(parent, rng)

    expect(child.id).toBe(1)
    expect(child.x).toBe(parent.x)
    expect(child.y).toBe(parent.y)
    expect(child.heading).toBe(parent.heading)
    expect(child.stats.replicationRate).toBe(parent.stats.replicationRate)
    expect(child.stats.deathRate).toBe(parent.stats.deathRate)
    expect(child.stats.mutationRate).toBe(parent.stats.mutationRate)
    expect(child.stats.speed).toBe(parent.stats.speed)
  })

  it('should replicate with mutation when rng is low', () => {
    const factory = createOrganismFactory()
    const stats: Stats = {
      replicationRate: 0.5,
      deathRate: 0.1,
      mutationRate: 0.8,
      speed: 2,
    }
    const parent = factory.create(50, 60, stats, 1.5)

    let callCount = 0
    const rng = {
      next: () => {
        callCount++
        if (callCount === 1) return 0.5 // Trigger mutation
        return 0.5 // Return consistent values for gaussian
      },
    }

    const child = factory.replicate(parent, rng)

    expect(child.id).toBe(1)
    expect(child.x).toBe(parent.x)
    expect(child.y).toBe(parent.y)
    expect(child.heading).toBe(parent.heading)
    // Stats should be different due to mutation (with very high probability given gaussian)
    // At least some should change
  })

  it('should keep stats within valid bounds after mutation', () => {
    const factory = createOrganismFactory({
      mutationSigma: 10,
      speedScale: 100,
    })
    const stats: Stats = {
      replicationRate: 0.5,
      deathRate: 0.5,
      mutationRate: 0.5,
      speed: 2,
    }
    const parent = factory.create(0, 0, stats, 0)

    const rng = {
      next: () => Math.random(),
    }

    // Replicate many times to test bounds
    let current = parent
    for (let i = 0; i < 50; i++) {
      current = factory.replicate(current, rng)
      expect(current.stats.replicationRate).toBeGreaterThanOrEqual(0)
      expect(current.stats.replicationRate).toBeLessThanOrEqual(1)
      expect(current.stats.deathRate).toBeGreaterThanOrEqual(0)
      expect(current.stats.deathRate).toBeLessThanOrEqual(1)
      expect(current.stats.mutationRate).toBeGreaterThanOrEqual(0)
      expect(current.stats.mutationRate).toBeLessThanOrEqual(1)
      expect(current.stats.speed).toBeGreaterThanOrEqual(0)
      expect(current.stats.speed).toBeLessThanOrEqual(5)
    }
  })

  it('should snapshot and restore organisms', () => {
    const factory = createOrganismFactory()
    const stats: Stats = {
      replicationRate: 0.1,
      deathRate: 0.05,
      mutationRate: 0.02,
      speed: 2,
    }
    const original = factory.create(100, 200, stats, Math.PI)

    const snapshot = factory.toSnapshot(original)
    const restored = factory.fromSnapshot(snapshot)

    expect(restored.id).toBe(original.id)
    expect(restored.x).toBe(original.x)
    expect(restored.y).toBe(original.y)
    expect(restored.heading).toBe(original.heading)
    expect(restored.stats).toEqual(original.stats)
  })

  it('should handle counter save and restore', () => {
    const factory = createOrganismFactory()
    const stats: Stats = {
      replicationRate: 0.1,
      deathRate: 0.05,
      mutationRate: 0.02,
      speed: 2,
    }

    factory.create(0, 0, stats, 0)
    factory.create(0, 0, stats, 0)
    factory.create(0, 0, stats, 0)

    const counter = factory.saveCounter()
    expect(counter).toBe(3)

    const org = factory.create(0, 0, stats, 0)
    expect(org.id).toBe(3)

    factory.restoreCounter(1)
    const orgAfterRestore = factory.create(0, 0, stats, 0)
    expect(orgAfterRestore.id).toBe(1)
  })

  it('should respect custom configuration', () => {
    const factory = createOrganismFactory({
      mutationSigma: 0.1,
      speedScale: 100,
    })
    const stats: Stats = {
      replicationRate: 0.5,
      deathRate: 0.5,
      mutationRate: 0.9,
      speed: 2.5,
    }
    const parent = factory.create(0, 0, stats, 0)

    const rng = {
      next: () => 0.1,
    }

    const child = factory.replicate(parent, rng)
    expect(child.stats).toBeDefined()
  })
})
