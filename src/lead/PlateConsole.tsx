import { useState } from 'react'
import { PLATE_EVENTS } from '../lib/types'
import type { SharedState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { useEvents, eventText } from '../lib/useEvents'
import { plateAdjust, plateConfig } from '../lib/actions'

export default function PlateConsole({ gm }: { gm: string }) {
  const shared = useGameState<SharedState>('shared')
  const events = useEvents()
  const [opening, setOpening] = useState('')
  const [threshold, setThreshold] = useState('')
  if (!shared) return <div className="tab-loading">…</div>
  const p = shared.plate

  return (
    <div className="tab">
      <div className={`plate plate-big ${p.active && p.value / p.threshold > 0.8 ? 'plate-hot' : ''}`}>
        <div className="plate-label">THE PLATE {p.active ? '' : '(not yet active)'}</div>
        <div className="plate-value-big">{p.value}<span className="plate-threshold"> / {p.threshold}</span></div>
      </div>

      <div className="panel-sub">CONFIGURE (6:30 — set the opening count from your paper tally)</div>
      <div className="field-row">
        <input className="input input-sm" placeholder={`count (${p.value})`} inputMode="numeric" value={opening} onChange={(e) => setOpening(e.target.value)} />
        <input className="input input-sm" placeholder={`fires at (${p.threshold})`} inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        <button className="btn" onClick={() => {
          plateConfig(gm, opening === '' ? p.value : Number(opening), threshold === '' ? p.threshold : Number(threshold), true)
          setOpening(''); setThreshold('')
        }}>SET & ACTIVATE</button>
      </div>

      <div className="panel-sub">EVENTS</div>
      <div className="btn-col">
        {PLATE_EVENTS.map((e) => (
          <button key={e.label} className={`btn ${e.delta > 0 ? '' : 'btn-gold'}`} disabled={!p.active}
            onClick={() => plateAdjust(gm, e.delta, e.label)}>
            {e.delta > 0 ? `+${e.delta}` : e.delta} — {e.label}
          </button>
        ))}
      </div>

      <div className="panel-sub">PLATE HISTORY</div>
      {events.filter((e) => e.action.startsWith('plate.')).slice(0, 10).map((e) => (
        <div key={e.id} className="muted">{eventText(e)}</div>
      ))}
    </div>
  )
}
