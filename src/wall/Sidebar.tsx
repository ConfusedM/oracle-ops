import { useEffect, useState } from 'react'
import { useGameState } from '../lib/useGameState'
import { remainingSec, fmt } from '../lib/time'
import { zoneFor } from '../lib/rules'
import { BAR_LABELS, BAR_COLORS, ZONE_EFFECTS } from '../lib/types'
import type { SharedState, BarId } from '../lib/types'

function Bar({ bar, value }: { bar: BarId; value: number }) {
  const zone = zoneFor(bar, value)
  return (
    <div className="bar-row">
      <div className="bar-head">
        <span className="bar-label" style={{ color: BAR_COLORS[bar] }}>{BAR_LABELS[bar]}</span>
        <span className={`zone-chip zone-${zone}`}>{zone.toUpperCase()}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value}%`, background: BAR_COLORS[bar] }} />
      </div>
      <div className="bar-effect">{ZONE_EFFECTS[bar][zone]}</div>
    </div>
  )
}

export default function Sidebar() {
  const shared = useGameState<SharedState>('shared')
  const [, tick] = useState(0)
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(i)
  }, [])
  if (!shared) return <div className="sidebar" />

  const plateHot = shared.plate.active && shared.plate.value / shared.plate.threshold > 0.8

  return (
    <div className="sidebar">
      <div className="bowl" key={shared.bowl}>
        <div className="bowl-label">THE HOPE TITAN</div>
        <div className="bowl-value">{shared.bowl}</div>
        <div className="bar-track bowl-track">
          <div className="bar-fill" style={{ width: `${Math.min(100, (shared.bowl / 60) * 100)}%`, background: 'var(--ward-blue)' }} />
        </div>
        {shared.titanSevered && <div className="titan-severed">⛓ SEVERED — IT POUNDS</div>}
      </div>

      <div className="bars">
        <Bar bar="morale" value={shared.bars.morale} />
        <Bar bar="army" value={shared.bars.army} />
        {!shared.bars.enemyRetired ? (
          <Bar bar="enemy" value={shared.bars.enemy} />
        ) : (
          <div className={`plate ${plateHot ? 'plate-hot' : ''}`} key={shared.plate.value}>
            <div className="plate-label">THE PLATE</div>
            <div className="plate-value">
              {shared.plate.value}<span className="plate-threshold"> / {shared.plate.threshold}</span>
            </div>
          </div>
        )}
      </div>

      <div className="chits">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`chit ${i < shared.dragonChits ? '' : 'chit-spent'}`}>🐉</span>
        ))}
      </div>

      <div className="timers">
        {shared.timers.map((t) => {
          const r = remainingSec(t)
          return (
            <div key={t.id} className={`timer ${t.label === 'THE HOURGLASS' ? 'timer-hourglass' : ''} ${r === 0 ? 'timer-done' : ''}`}>
              <span className="timer-label">{t.label}</span>
              <span className="timer-value">{t.paused ? `⏸ ${fmt(r)}` : fmt(r)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
