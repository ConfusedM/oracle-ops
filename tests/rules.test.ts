import { describe, it, expect } from 'vitest'
import { zoneFor, emberTier, betrayalStats, rollD6, nextGulletTable } from '../src/lib/rules'

describe('zoneFor', () => {
  it('morale/army high is green, low is red', () => {
    expect(zoneFor('morale', 80)).toBe('green')
    expect(zoneFor('morale', 50)).toBe('amber')
    expect(zoneFor('army', 20)).toBe('red')
  })
  it('enemy bar is inverted', () => {
    expect(zoneFor('enemy', 80)).toBe('red')
    expect(zoneFor('enemy', 20)).toBe('green')
    expect(zoneFor('enemy', 50)).toBe('amber')
  })
})

describe('emberTier', () => {
  it('tiers at 3/5/7', () => {
    expect(emberTier(0)).toBeNull()
    expect(emberTier(2)).toBeNull()
    expect(emberTier(3)).toBe('KINDLED')
    expect(emberTier(4)).toBe('KINDLED')
    expect(emberTier(5)).toBe('LODESTAR')
    expect(emberTier(7)).toBe('BEARER')
    expect(emberTier(12)).toBe('BEARER')
  })
})

describe('betrayalStats', () => {
  it('a lodestar holding 5 units', () => {
    expect(betrayalStats(5)).toEqual({ d20: 10, saveDC: 5, damage: 25, hp: 150 })
  })
  it('zero units is a nobody', () => {
    expect(betrayalStats(0)).toEqual({ d20: 0, saveDC: 0, damage: 0, hp: 0 })
  })
})

describe('rollD6', () => {
  it('rolls n dice in 1..6', () => {
    const rolls = rollD6(100)
    expect(rolls).toHaveLength(100)
    expect(rolls.every((r) => r >= 1 && r <= 6)).toBe(true)
  })
})

describe('nextGulletTable', () => {
  it('alternates 5 and 6', () => {
    expect(nextGulletTable(1)).toBe('Table 5')
    expect(nextGulletTable(2)).toBe('Table 6')
    expect(nextGulletTable(3)).toBe('Table 5')
  })
})
