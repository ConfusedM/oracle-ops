import { useEffect, useState } from 'react'
import { GM_NAMES } from '../lib/types'
import type { SharedState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { useEvents, eventText } from '../lib/useEvents'
import BowlControl from './BowlControl'
import Block1Tab from './Block1Tab'
import Block2Tab from './Block2Tab'
import Block3Tab from './Block3Tab'
import BetrayalCalc from './BetrayalCalc'

export default function GmPage() {
  const shared = useGameState<SharedState>('shared')
  const events = useEvents()
  const [gm, setGm] = useState<string | null>(localStorage.getItem('gmName'))
  const [tab, setTab] = useState<1 | 2 | 3 | 4>((shared?.activeBlock ?? 1) as 1 | 2 | 3)
  const [showBowl, setShowBowl] = useState(false)
  const [followed, setFollowed] = useState(false)

  // follow the active block once it loads (until the GM taps a tab themself)
  useEffect(() => {
    if (shared && !followed) {
      setTab(shared.activeBlock)
      setFollowed(true)
    }
  }, [shared, followed])

  if (!gm) {
    return (
      <div className="chip-select">
        <div className="chip-select-title">WHO GOES THERE?</div>
        <div className="chip-select-grid">
          {GM_NAMES.map((n) => (
            <button key={n} className="btn btn-huge" onClick={() => { localStorage.setItem('gmName', n); setGm(n) }}>
              {n}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="gm">
      <div className="gm-header">
        <button className="gm-name" onClick={() => { localStorage.removeItem('gmName'); setGm(null) }}>{gm}</button>
        <span className="gm-block">BLOCK {shared?.activeBlock ?? '—'}</span>
        <button className={`btn btn-sm ${showBowl ? 'btn-on' : ''}`} onClick={() => setShowBowl(!showBowl)}>
          HOPE {shared?.bowl ?? ''}
        </button>
      </div>
      {showBowl && <BowlControl gm={gm} />}
      <div className="gm-ticker">
        {events.filter((e) => e.ticker).slice(0, 3).map((e) => (
          <div key={e.id} className="gm-ticker-item">{eventText(e)}</div>
        ))}
      </div>
      <div className="tab-bar">
        {([1, 2, 3] as const).map((b) => (
          <button key={b} className={`tab-btn ${tab === b ? 'tab-on' : ''}`} onClick={() => setTab(b)}>B{b}</button>
        ))}
        <button className={`tab-btn ${tab === 4 ? 'tab-on' : ''}`} onClick={() => setTab(4)}>CALC</button>
      </div>
      {tab === 1 && <Block1Tab gm={gm} />}
      {tab === 2 && <Block2Tab gm={gm} />}
      {tab === 3 && <Block3Tab gm={gm} />}
      {tab === 4 && <BetrayalCalc />}
    </div>
  )
}
