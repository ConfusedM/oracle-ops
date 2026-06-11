import { useState } from 'react'
import type { DirectorState, SharedState, WallFocus } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { setWallFocus, setAnnouncement, setActiveBlock, setTitanSevered } from '../lib/actions'

const FOCI: { id: WallFocus; label: string }[] = [
  { id: 'banners', label: 'BANNERS (B1)' },
  { id: 'breach', label: 'BREACH BOARD (B2)' },
  { id: 'hexmap', label: 'HEX MAP (B3)' },
  { id: 'economy', label: 'ECONOMY' },
  { id: 'media', label: 'MEDIA' },
]

export default function Director({ gm }: { gm: string }) {
  const director = useGameState<DirectorState>('director')
  const shared = useGameState<SharedState>('shared')
  const [annText, setAnnText] = useState('')
  const [annMin, setAnnMin] = useState('')
  if (!director || !shared) return <div className="tab-loading">…</div>

  return (
    <div className="tab">
      <div className="panel-sub">ALL TVS SHOW</div>
      <div className="btn-col">
        {FOCI.map((f) => (
          <button key={f.id} className={`btn ${director.wallFocus === f.id ? 'btn-on' : ''}`}
            onClick={() => setWallFocus(gm, f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="panel-sub">ACTIVE BLOCK</div>
      <div className="btn-row">
        {([1, 2, 3] as const).map((b) => (
          <button key={b} className={`btn ${shared.activeBlock === b ? 'btn-on' : ''}`}
            onClick={() => {
              if (shared.activeBlock !== b && confirm(`Begin BLOCK ${b}? The bowl carries (${shared.bowl}).`)) setActiveBlock(gm, b)
            }}>
            BLOCK {b}
          </button>
        ))}
      </div>

      <div className="panel-sub">ANNOUNCEMENT (full-screen, all rooms)</div>
      <div className="field-row">
        <input className="input" placeholder="e.g. THE DRAFT — stand at your banners" value={annText} onChange={(e) => setAnnText(e.target.value)} />
        <input className="input input-sm" placeholder="min" inputMode="numeric" value={annMin} onChange={(e) => setAnnMin(e.target.value)} />
      </div>
      <div className="btn-row">
        <button className="btn" disabled={!annText.trim()}
          onClick={() => { setAnnouncement(gm, annText, annMin ? Number(annMin) * 60 : undefined); setAnnText(''); setAnnMin('') }}>
          ANNOUNCE
        </button>
        <button className="btn btn-dark" disabled={!director.announcement} onClick={() => setAnnouncement(gm, null)}>CLEAR</button>
      </div>
      <div className="chip-row">
        <button className="chip" onClick={() => setAnnouncement(gm, 'THE DRAFT — choose your companies. Stand at your banners.', 12 * 60)}>THE DRAFT 12:00</button>
        <button className="chip" onClick={() => setAnnouncement(gm, 'BATTLE STATIONS', 3 * 60)}>BATTLE STATIONS 3:00</button>
      </div>

      <div className="panel-sub">THE TITAN (Block 2)</div>
      <button className={`btn ${shared.titanSevered ? 'btn-on' : ''}`}
        onClick={() => setTitanSevered(gm, !shared.titanSevered)}>
        {shared.titanSevered ? '⛓ SEVERED — tap when reach is restored' : 'MARK TITAN SEVERED (rear wall rises)'}
      </button>
    </div>
  )
}
