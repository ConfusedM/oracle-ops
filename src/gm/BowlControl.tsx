import { useState } from 'react'
import { bowlAdjust, bowlAwardD6 } from '../lib/actions'
import { useGameState } from '../lib/useGameState'
import type { SharedState } from '../lib/types'

const QUICK_REASONS = ['civilian saved', 'escort home', 'defiance in its own key', 'succumbed to 9', 'PC death', 'company broken']

export default function BowlControl({ gm }: { gm: string }) {
  const shared = useGameState<SharedState>('shared')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (fn: () => Promise<any>) => {
    if (!reason.trim() || busy) return
    setBusy(true)
    try { await fn() } finally { setBusy(false); setReason('') }
  }
  return (
    <div className="bowl-control">
      <div className="bowl-control-value">BOWL: <b>{shared?.bowl ?? '—'}</b></div>
      <input
        className="input" placeholder="reason (required — announce what bought it)"
        value={reason} onChange={(e) => setReason(e.target.value)}
      />
      <div className="chip-row">
        {QUICK_REASONS.map((r) => (
          <button key={r} className="chip" onClick={() => setReason(r)}>{r}</button>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn btn-dark" disabled={!reason.trim() || busy} onClick={() => go(() => bowlAdjust(gm, -3, reason))}>−3</button>
        <button className="btn btn-dark" disabled={!reason.trim() || busy} onClick={() => go(() => bowlAdjust(gm, -1, reason))}>−1</button>
        <button className="btn" disabled={!reason.trim() || busy} onClick={() => go(() => bowlAdjust(gm, 1, reason))}>+1</button>
        <button className="btn btn-gold" disabled={!reason.trim() || busy} onClick={() => go(() => bowlAwardD6(gm, 1, reason))}>+1d6</button>
        <button className="btn btn-gold" disabled={!reason.trim() || busy} onClick={() => go(() => bowlAwardD6(gm, 2, reason))}>+2d6</button>
        <button className="btn btn-gold" disabled={!reason.trim() || busy} onClick={() => go(() => bowlAwardD6(gm, 3, reason))}>+3d6</button>
      </div>
    </div>
  )
}
