import { useState } from 'react'
import { HORRORS, DEATH_LINES } from '../lib/types'
import type { HorrorId, HorrorState } from '../lib/types'

const STATE_LABEL: Record<HorrorState, string> = {
  fighting: 'FIGHTING', bloodied: 'BLOODIED', slain: 'SLAIN', broken: 'COMPANY BROKEN',
}

// All overlay positions are % of the 750x1050 card frame.
export default function HorrorCard({ id, state, marks }: { id: HorrorId; state: HorrorState; marks: number }) {
  const h = HORRORS[id]
  const [artOk, setArtOk] = useState(true)
  return (
    <div className={`tcg-card tcg-${state}`} style={{ ['--horror' as any]: h.color }}>
      <img className="tcg-layer" src={`./tcg/card-bg-${id}.png`} alt="" draggable={false} />
      {artOk && (
        <img className="tcg-art" src={`./horrors/${id}.png`} alt=""
          draggable={false} onError={() => setArtOk(false)} />
      )}
      <img className="tcg-layer" src="./tcg/card-frame.png" alt="" draggable={false} />

      <div className="tcg-name">{h.emotion}</div>
      <div className="tcg-desc">
        {state === 'slain' ? <span className="tcg-deathline">{DEATH_LINES[id]}</span> : h.name}
      </div>
      <div className="tcg-gm">{h.gm}</div>
      <div className="tcg-marks">{marks}</div>

      {state !== 'fighting' && (
        <div className={`tcg-stamp tcg-stamp-${state}`}>{STATE_LABEL[state]}</div>
      )}
    </div>
  )
}
