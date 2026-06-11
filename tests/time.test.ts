import { describe, it, expect } from 'vitest'
import { fmt, remainingSec, loopOffsetSec } from '../src/lib/time'

describe('fmt', () => {
  it('formats mm:ss', () => {
    expect(fmt(95)).toBe('1:35')
    expect(fmt(0)).toBe('0:00')
    expect(fmt(600)).toBe('10:00')
  })
})

describe('remainingSec', () => {
  it('paused timer returns its frozen remaining', () => {
    expect(remainingSec({ endsAt: new Date(0).toISOString(), paused: true, remainingSec: 42 })).toBe(42)
  })
  it('expired timer clamps to 0', () => {
    expect(remainingSec({ endsAt: new Date(Date.now() - 5000).toISOString(), paused: false })).toBe(0)
  })
  it('future timer counts down', () => {
    const r = remainingSec({ endsAt: new Date(Date.now() + 60_000).toISOString(), paused: false })
    expect(r).toBeGreaterThanOrEqual(59)
    expect(r).toBeLessThanOrEqual(61)
  })
})

describe('loopOffsetSec', () => {
  it('wraps elapsed time into the loop duration', () => {
    const startedAt = new Date(Date.now() - 130_000).toISOString() // 130s ago
    const off = loopOffsetSec(startedAt, 60)
    expect(off).toBeGreaterThanOrEqual(9)
    expect(off).toBeLessThanOrEqual(11)
  })
})
