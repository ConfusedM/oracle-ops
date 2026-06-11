export type HexDef = { id: string; col: number; row: number; star?: boolean; rally?: boolean; start?: string }

const row = (ids: number[], r: number, off: number, extra: Partial<Record<number, Partial<HexDef>>> = {}): HexDef[] =>
  ids.map((n, i) => ({ id: String(n).padStart(2, '0'), col: off + i, row: r, ...extra[n] }))

/** THE FOLDED FLESH — reference layout v3 (rows A–E, exits 05/23, rallies 09/19, starts T1–T6). */
export const HEXES: HexDef[] = [
  ...row([1, 2, 3, 4, 5], 0, 0.5, { 5: { star: true }, 2: { start: 'T1' } }),
  ...row([6, 7, 8, 9, 10, 11], 1, 0, { 9: { rally: true }, 8: { start: 'T2' }, 11: { start: 'T3' } }),
  ...row([12, 13, 14, 15, 16], 2, 0.5, { 13: { start: 'T4' } }),
  ...row([17, 18, 19, 20, 21, 22], 3, 0, { 19: { rally: true }, 20: { start: 'T5' } }),
  ...row([23, 24, 25, 26], 4, 0.5, { 23: { star: true }, 25: { start: 'T6' } }),
]

export const HEX_R = 52
export const VIEW_W = 700
export const VIEW_H = 540

export const hexCenter = (h: HexDef) => ({
  x: 78 + h.col * HEX_R * 1.78,
  y: 118 + h.row * HEX_R * 1.55,
})

export const hexPoints = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
