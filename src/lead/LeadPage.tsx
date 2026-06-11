import { useState } from 'react'
import { GM_NAMES } from '../lib/types'
import Director from './Director'
import BarsControl from './BarsControl'
import TimersControl from './TimersControl'
import Soundboard from './Soundboard'
import MediaLibrary from './MediaLibrary'
import PlateConsole from './PlateConsole'
import DayAdmin from './DayAdmin'

const TABS = ['DIRECTOR', 'BARS', 'TIMERS', 'SOUND', 'MEDIA', 'PLATE', 'ADMIN'] as const
type Tab = (typeof TABS)[number]

export default function LeadPage() {
  const [gm, setGm] = useState<string | null>(localStorage.getItem('gmName'))
  const [tab, setTab] = useState<Tab>('DIRECTOR')

  if (!gm) {
    return (
      <div className="chip-select">
        <div className="chip-select-title">WHO LEADS?</div>
        <div className="chip-select-grid">
          {GM_NAMES.map((n) => (
            <button key={n} className="btn btn-huge" onClick={() => { localStorage.setItem('gmName', n); setGm(n) }}>{n}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="gm">
      <div className="gm-header">
        <button className="gm-name" onClick={() => { localStorage.removeItem('gmName'); setGm(null) }}>{gm} · LEAD</button>
        <a className="btn btn-sm" href="#/gm">GM PANEL →</a>
      </div>
      <div className="tab-bar tab-bar-wrap">
        {TABS.map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'tab-on' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'DIRECTOR' && <Director gm={gm} />}
      {tab === 'BARS' && <BarsControl gm={gm} />}
      {tab === 'TIMERS' && <TimersControl gm={gm} />}
      {tab === 'SOUND' && <Soundboard gm={gm} />}
      {tab === 'MEDIA' && <MediaLibrary gm={gm} />}
      {tab === 'PLATE' && <PlateConsole gm={gm} />}
      {tab === 'ADMIN' && <DayAdmin gm={gm} />}
    </div>
  )
}
