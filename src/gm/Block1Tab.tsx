import { useState } from 'react'
import { HORROR_IDS, HORRORS, HORROR_STATES, DEATH_LINES } from '../lib/types'
import type { Block1State, HorrorId, HorrorState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { setHorrorState, fireSurge, markDealt, bowlAwardD6 } from '../lib/actions'

export default function Block1Tab({ gm }: { gm: string }) {
  const b1 = useGameState<Block1State>('block1')
  const defaultHorror = (HORROR_IDS.find((id) => HORRORS[id].gm === gm) ?? 'kaervox') as HorrorId
  const [horror, setHorror] = useState<HorrorId>(defaultHorror)
  const [busy, setBusy] = useState(false)
  if (!b1) return <div className="tab-loading">…</div>
  const h = HORRORS[horror]
  const st = b1.horrors[horror]

  const change = async (next: HorrorState) => {
    if (busy) return
    if (next === 'slain' && !confirm(`SLAY ${h.name}?\n\nDeath line (read room-wide):\n"${DEATH_LINES[horror]}"\n\n+3d6 to the Titan.`)) return
    if (next === 'broken' && !confirm(`Mark ${h.emotion}'s company BROKEN?`)) return
    setBusy(true)
    try { await setHorrorState(gm, horror, next) } finally { setBusy(false) }
  }

  return (
    <div className="tab">
      <div className="chip-row">
        {HORROR_IDS.map((id) => (
          <button key={id} className={`chip ${id === horror ? 'chip-on' : ''}`}
            style={id === horror ? { borderColor: HORRORS[id].color } : {}}
            onClick={() => setHorror(id)}>
            {HORRORS[id].emotion}
          </button>
        ))}
      </div>
      <div className="my-charge" style={{ borderColor: h.color }}>
        <div className="my-charge-name">{h.name}</div>
        <div className="my-charge-state">{st.toUpperCase()}</div>
      </div>
      <button className="btn btn-huge" style={{ background: h.color, color: '#111' }}
        onClick={() => fireSurge(gm, horror)}>
        ⚡ SURGE — room +1 {h.emotion}
      </button>
      <div className="btn-row">
        {HORROR_STATES.map((s) => (
          <button key={s} className={`btn ${st === s ? 'btn-on' : ''}`} disabled={busy} onClick={() => change(s)}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn" onClick={() => markDealt(gm, horror)}>MARK DEALT ({b1.marks[horror]})</button>
        <button className="btn btn-gold" onClick={() => bowlAwardD6(gm, 1, 'civilian saved in the domain')}>CIVILIAN +1d6</button>
      </div>
      <button className="btn btn-gold" onClick={() => {
        const name = prompt('Marked player cleansed for life — name?')
        if (name) bowlAwardD6(gm, 2, `${name} survived their own Horror's death — CLEANSED FOR LIFE`)
      }}>
        MARKED PLAYER CLEANSED +2d6
      </button>
    </div>
  )
}
