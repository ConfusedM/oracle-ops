let offsetMs = 0

/** Call once at app start (and on reconnect) to align local clocks with the DB clock. */
export async function syncServerClock(rpc: () => Promise<string | null>) {
  const t0 = Date.now()
  const serverIso = await rpc()
  if (!serverIso) return
  const rtt = Date.now() - t0
  offsetMs = new Date(serverIso).getTime() - (t0 + rtt / 2)
}

export const serverNow = () => Date.now() + offsetMs

export function remainingSec(t: { endsAt: string; paused: boolean; remainingSec?: number }): number {
  if (t.paused) return t.remainingSec ?? 0
  return Math.max(0, Math.round((new Date(t.endsAt).getTime() - serverNow()) / 1000))
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Where inside a loop a freshly-(re)joined wall should start playback, so all rooms stay in phase. */
export function loopOffsetSec(startedAt: string, durationSec: number): number {
  const elapsed = (serverNow() - new Date(startedAt).getTime()) / 1000
  return ((elapsed % durationSec) + durationSec) % durationSec
}
