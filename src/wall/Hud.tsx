import { useGameState } from '../lib/useGameState'
import { zoneFor } from '../lib/rules'
import { ZONE_EFFECTS } from '../lib/types'
import type { SharedState, BarId } from '../lib/types'
import goldL from '../assets/frame-gold-l.png'
import goldM from '../assets/frame-gold-m.png'
import goldR from '../assets/frame-gold-r.png'
import orbFrame from '../assets/orb-frame.png'

const BAR_THEME: Record<BarId, { label: string; cls: string; skin: 'gold' | 'iron' }> = {
  morale: { label: 'MORALE', cls: 'gb-gold', skin: 'gold' },
  army: { label: 'ARMY', cls: 'gb-blue', skin: 'gold' },
  enemy: { label: 'ENEMY', cls: 'gb-red', skin: 'gold' },
}
const SKINS = {
  gold: { l: goldL, m: goldM, r: goldR },
  iron: { l: goldL, m: goldM, r: goldR },
}

function FrameArt({ skin }: { skin: 'gold' | 'iron' }) {
  const s = SKINS[skin]
  return (
    <div className="gb-art">
      <img src={s.l} alt="" />
      <img className="gb-art-m" src={s.m} alt="" />
      <img src={s.r} alt="" />
    </div>
  )
}

export function GameBar({ bar, value, max = 100 }: { bar: BarId; value: number; max?: number }) {
  const t = BAR_THEME[bar]
  const zone = zoneFor(bar, value)
  return (
    <div className="gb-row">
      <div className="gb-plate">{t.label}</div>
      <div className={`gb-frame ${t.cls}`}>
        <div className="gb-well">
          <div className="gb-fill" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
          <div className="gb-ticks" />
        </div>
        <FrameArt skin={t.skin} />
        <div className="gb-value">{value} / {max}</div>
      </div>
      <div className={`gb-gem gem-${zone}`} title={zone} />
      <div className="gb-effect">
        <b className={`gb-zone-word zw-${zone}`}>{zone.toUpperCase()}</b>
        {ZONE_EFFECTS[bar][zone] !== '—' && <span> · {ZONE_EFFECTS[bar][zone]}</span>}
      </div>
    </div>
  )
}

export function PlateBar({ value, threshold }: { value: number; threshold: number }) {
  const hot = value / threshold > 0.8
  return (
    <div className="gb-row">
      <div className="gb-plate gb-plate-dark">THE PLATE</div>
      <div className={`gb-frame gb-iron ${hot ? 'gb-hot' : ''}`}>
        <div className="gb-well">
          <div className="gb-fill" style={{ width: `${Math.max(0, Math.min(100, (value / threshold) * 100))}%` }} />
          <div className="gb-ticks" style={{ backgroundSize: `${100 / threshold}% 100%` }} />
        </div>
        <FrameArt skin="iron" />
        <div className="gb-value">{value} / {threshold}</div>
      </div>
      <div className="gb-gem gem-plate" />
      <div className="gb-effect">the Working fires at {threshold}</div>
    </div>
  )
}

export function HopeOrb({ value, max = 60, severed }: { value: number; max?: number; severed?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="orb-wrap" key={value}>
      <div className="orb-rig">
        <div className={`orb ${severed ? 'orb-severed' : ''}`}>
          <div className="orb-liquid" style={{ height: `${pct}%` }} />
          <div className="orb-shine" />
        </div>
        <img className="orb-art" src={orbFrame} alt="" />
        <div className="orb-num">{value}</div>
      </div>
      <div className="orb-label">HOPE</div>
      {severed && <div className="orb-chains">⛓ SEVERED</div>}
    </div>
  )
}

export default function Hud() {
  const shared = useGameState<SharedState>('shared')
  if (!shared) return <div className="hud" />
  return (
    <div className="hud">
      <HopeOrb value={shared.bowl} severed={shared.titanSevered} />
      <div className="hud-bars">
        <GameBar bar="morale" value={shared.bars.morale} />
        <GameBar bar="army" value={shared.bars.army} />
        {shared.bars.enemyRetired
          ? <PlateBar value={shared.plate.value} threshold={shared.plate.threshold} />
          : <GameBar bar="enemy" value={shared.bars.enemy} />}
      </div>
    </div>
  )
}
