import { useGameState } from '../../lib/useGameState'
import { zoneFor } from '../../lib/rules'
import { BAR_LABELS, BAR_COLORS, ZONE_EFFECTS } from '../../lib/types'
import type { SharedState, BarId } from '../../lib/types'

export default function EconomyPanel() {
  const shared = useGameState<SharedState>('shared')
  if (!shared) return null
  const bars: BarId[] = shared.bars.enemyRetired ? ['morale', 'army'] : ['morale', 'army', 'enemy']
  return (
    <div className="economy">
      <div className="economy-bowl" key={shared.bowl}>
        <div className="bowl-label">THE HOPE TITAN</div>
        <div className="economy-bowl-value">{shared.bowl}</div>
      </div>
      <div className="economy-bars">
        {bars.map((b) => {
          const v = shared.bars[b]
          const zone = zoneFor(b, v)
          return (
            <div key={b} className="economy-bar">
              <div className="bar-head">
                <span className="bar-label-big" style={{ color: BAR_COLORS[b] }}>{BAR_LABELS[b]}</span>
                <span className={`zone-chip zone-${zone}`}>{zone.toUpperCase()}</span>
              </div>
              <div className="bar-track bar-track-big">
                <div className="bar-fill" style={{ width: `${v}%`, background: BAR_COLORS[b] }} />
              </div>
              <div className="bar-effect-big">{ZONE_EFFECTS[b][zone]}</div>
            </div>
          )
        })}
        {shared.plate.active && (
          <div className={`plate plate-big ${shared.plate.value / shared.plate.threshold > 0.8 ? 'plate-hot' : ''}`}>
            <div className="plate-label">THE PLATE</div>
            <div className="plate-value-big">
              {shared.plate.value}<span className="plate-threshold"> / {shared.plate.threshold}</span>
            </div>
            <div className="bar-effect-big">it fires at {shared.plate.threshold}</div>
          </div>
        )}
      </div>
    </div>
  )
}
