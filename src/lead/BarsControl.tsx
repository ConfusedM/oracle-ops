import { useState } from 'react'
import { BAR_LABELS, BAR_REASONS, BAR_COLORS } from '../lib/types'
import type { BarId, SharedState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { zoneFor } from '../lib/rules'
import { barAdjust, retireEnemyBar } from '../lib/actions'

function BarEditor({ gm, bar }: { gm: string; bar: BarId }) {
  const shared = useGameState<SharedState>('shared')
  const [reason, setReason] = useState('')
  if (!shared) return null
  const v = shared.bars[bar]
  const zone = zoneFor(bar, v)
  const go = (delta: number) => {
    barAdjust(gm, bar, delta, reason.trim() || 'adjustment')
    setReason('')
  }
  return (
    <div className="bar-editor">
      <div className="bar-head">
        <span className="bar-label" style={{ color: BAR_COLORS[bar] }}>{BAR_LABELS[bar]} — {v}</span>
        <span className={`zone-chip zone-${zone}`}>{zone.toUpperCase()}</span>
      </div>
      <div className="chip-row">
        {BAR_REASONS[bar].map((r) => (
          <button key={r} className="chip" onClick={() => setReason(r)}>{r}</button>
        ))}
      </div>
      <input className="input" placeholder="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="btn-row">
        <button className="btn btn-dark" onClick={() => go(-10)}>−10</button>
        <button className="btn btn-dark" onClick={() => go(-5)}>−5</button>
        <button className="btn" onClick={() => go(5)}>+5</button>
        <button className="btn" onClick={() => go(10)}>+10</button>
      </div>
    </div>
  )
}

export default function BarsControl({ gm }: { gm: string }) {
  const shared = useGameState<SharedState>('shared')
  if (!shared) return <div className="tab-loading">…</div>
  return (
    <div className="tab">
      <BarEditor gm={gm} bar="morale" />
      <BarEditor gm={gm} bar="army" />
      {!shared.bars.enemyRetired ? (
        <>
          <BarEditor gm={gm} bar="enemy" />
          <button className="btn btn-dark" onClick={() => {
            if (confirm('Ceremonially RETIRE the ENEMY bar and bring in THE PLATE?') && confirm('The room should feel the promotion like a temperature drop. Proceed?')) {
              retireEnemyBar(gm)
            }
          }}>
            ⬛ RETIRE ENEMY BAR → THE PLATE
          </button>
        </>
      ) : (
        <div className="panel-sub">ENEMY bar retired — the Plate stands (see PLATE tab)</div>
      )}
    </div>
  )
}
