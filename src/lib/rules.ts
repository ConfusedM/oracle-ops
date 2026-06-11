import type { BarId, Zone } from './types'

export function zoneFor(bar: BarId, value: number): Zone {
  const hi = value >= 67
  const lo = value <= 33
  if (bar === 'enemy') return hi ? 'red' : lo ? 'green' : 'amber'
  return hi ? 'green' : lo ? 'red' : 'amber'
}

export function emberTier(count: number): 'KINDLED' | 'LODESTAR' | 'BEARER' | null {
  if (count >= 7) return 'BEARER'
  if (count >= 5) return 'LODESTAR'
  if (count >= 3) return 'KINDLED'
  return null
}

export function betrayalStats(units: number) {
  return { d20: 2 * units, saveDC: units, damage: 5 * units, hp: 30 * units }
}

export const rollD6 = (n = 1) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6))

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Gullet waves alternate Tide tables 5 and 6. */
export function nextGulletTable(wave: number): 'Table 5' | 'Table 6' {
  return wave % 2 === 1 ? 'Table 5' : 'Table 6'
}
