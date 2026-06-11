import { useState } from 'react'
import { TEAM_IDS, TEAM_COLORS, ADVANTAGES, IMMUNE_REASONS, PLATE_EVENTS, HEX_ICON_GLYPHS } from '../lib/types'
import type { Block3State, SharedState, TeamId, HexIcon, EmberEntry } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import {
  moveTeam, setHexCleared, toggleHexIcon, setHexGlow, setPulse, immuneAdjust,
  setEmbers, claimAdvantage, gulletWave, plateAdjust,
} from '../lib/actions'
import HexMapPanel from '../wall/panels/HexMapPanel'
import { emberTier } from '../lib/rules'

type HexMode = 'move' | 'clear' | HexIcon | 'glow'

export default function Block3Tab({ gm }: { gm: string }) {
  const b3 = useGameState<Block3State>('block3')
  const shared = useGameState<SharedState>('shared')
  const [team, setTeam] = useState<TeamId>('t1')
  const [mode, setMode] = useState<HexMode>('move')
  const [blue, setBlue] = useState(''), [grey, setGrey] = useState('')
  if (!b3 || !shared) return <div className="tab-loading">…</div>

  const entries: EmberEntry[] = b3.embers[team] ?? []

  const onHexTap = (hexId: string) => {
    if (mode === 'move') moveTeam(gm, team, hexId)
    else if (mode === 'clear') setHexCleared(gm, hexId, !(b3.hexes[hexId]?.cleared))
    else if (mode === 'glow') setHexGlow(gm, hexId)
    else toggleHexIcon(gm, hexId, mode)
  }

  const editEmber = (i: number, d: number) => {
    const next = entries.map((e, j) => (j === i ? { ...e, count: Math.max(0, e.count + d) } : e))
    setEmbers(gm, team, next)
  }

  return (
    <div className="tab">
      <div className="chip-row">
        {TEAM_IDS.map((t) => (
          <button key={t} className={`chip ${t === team ? 'chip-on' : ''}`}
            style={t === team ? { borderColor: TEAM_COLORS[t] } : {}}
            onClick={() => setTeam(t)}>
            T{t.slice(1)}
          </button>
        ))}
      </div>
      <div className="chip-row">
        {(['move', 'clear', 'distress', 'lantern', 'request', 'glow'] as HexMode[]).map((m) => (
          <button key={m} className={`chip ${m === mode ? 'chip-on' : ''}`} onClick={() => setMode(m)}>
            {m === 'move' ? `MOVE T${team.slice(1)}` : m === 'clear' ? 'CLEAR' : m === 'glow' ? '✨26' : HEX_ICON_GLYPHS[m as HexIcon]}
          </button>
        ))}
      </div>
      <div className="mini-map">
        <HexMapPanel interactive onHexTap={onHexTap} />
      </div>

      <div className="panel-sub">IMMUNE RESPONSE — {b3.immune}/10</div>
      <div className="chip-row">
        {IMMUNE_REASONS.up.map((r) => (
          <button key={r} className="chip chip-bad" onClick={() => immuneAdjust(gm, 1, r)}>+1 {r}</button>
        ))}
        {IMMUNE_REASONS.down.map((r) => (
          <button key={r} className="chip chip-good" onClick={() => immuneAdjust(gm, -1, r)}>−1 {r}</button>
        ))}
      </div>

      <div className="panel-sub">THE PULSE (hex 01 reward)</div>
      <div className="field-row">
        <input className="input input-sm" placeholder={`given (${b3.pulse.blue})`} value={blue} inputMode="numeric" onChange={(e) => setBlue(e.target.value)} />
        <input className="input input-sm" placeholder={`taken (${b3.pulse.grey})`} value={grey} inputMode="numeric" onChange={(e) => setGrey(e.target.value)} />
        <button className="btn" onClick={() => { setPulse(gm, Number(blue) || b3.pulse.blue, Number(grey) || b3.pulse.grey); setBlue(''); setGrey('') }}>POST</button>
      </div>

      <div className="panel-sub">EMBER CENSUS — T{team.slice(1)}</div>
      {entries.map((e, i) => (
        <div key={i} className="ember-row">
          <span className="ember-name">{e.name}</span>
          <span className="ember-tier">{emberTier(e.count) ?? ''}</span>
          <button className="btn btn-sm" onClick={() => editEmber(i, -1)}>−</button>
          <span className="ember-count">{e.count}</span>
          <button className="btn btn-sm" onClick={() => editEmber(i, 1)}>+</button>
        </div>
      ))}
      <button className="btn" onClick={() => {
        const name = prompt('Player name?')
        if (name) setEmbers(gm, team, [...entries, { name, count: 0 }])
      }}>+ ADD PLAYER</button>

      <div className="panel-sub">TAKEN ADVANTAGES (one per player, all night)</div>
      {ADVANTAGES.map((kind) => {
        const claimed = b3.advantages.find((a) => a.kind === kind)
        return (
          <div key={kind} className="adv-row">
            <span>{kind}</span>
            {claimed ? (
              <b>{claimed.player}</b>
            ) : (
              <button className="btn btn-sm" onClick={() => {
                const player = prompt(`${kind} — claimed by which player?`)
                if (player) claimAdvantage(gm, kind, player).catch((e) => alert(e.message))
              }}>CLAIM</button>
            )}
          </div>
        )
      })}

      <div className="panel-sub">THE GULLET — wave {b3.gulletWave}</div>
      <div className="btn-row">
        <button className="btn" onClick={() => gulletWave(gm, true)}>WAVE HELD</button>
        <button className="btn btn-dark" onClick={() => gulletWave(gm, false)}>BREAKER ESCAPED (+1 PLATE)</button>
      </div>

      {shared.plate.active && (
        <>
          <div className="panel-sub">THE PLATE — {shared.plate.value}/{shared.plate.threshold}</div>
          <div className="chip-row">
            {PLATE_EVENTS.map((p) => (
              <button key={p.label} className={`chip ${p.delta > 0 ? 'chip-bad' : 'chip-good'}`}
                onClick={() => plateAdjust(gm, p.delta, p.label)}>
                {p.delta > 0 ? `+${p.delta}` : p.delta} {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
