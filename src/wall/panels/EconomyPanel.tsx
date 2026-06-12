import { useGameState } from '../../lib/useGameState'
import { HopeOrb, GameBar, PlateBar } from '../Hud'
import type { SharedState } from '../../lib/types'

/** The muster view — HOPE writ large for walkabouts and ceremonies. */
export default function EconomyPanel() {
  const shared = useGameState<SharedState>('shared')
  if (!shared) return null
  return (
    <div className="economy-xl">
      <HopeOrb value={shared.bowl} severed={shared.titanSevered} />
      <div className="economy-xl-bars">
        <GameBar bar="morale" value={shared.bars.morale} />
        <GameBar bar="army" value={shared.bars.army} />
        {shared.bars.enemyRetired
          ? <PlateBar value={shared.plate.value} threshold={shared.plate.threshold} />
          : <GameBar bar="enemy" value={shared.bars.enemy} />}
      </div>
    </div>
  )
}
