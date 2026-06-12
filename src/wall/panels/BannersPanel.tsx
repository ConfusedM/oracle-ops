import { useGameState } from '../../lib/useGameState'
import { HORROR_IDS } from '../../lib/types'
import type { Block1State } from '../../lib/types'
import HorrorCard from '../HorrorCard'

export default function BannersPanel() {
  const b1 = useGameState<Block1State>('block1')
  if (!b1) return null
  return (
    <div className="banners">
      {HORROR_IDS.map((id) => (
        <HorrorCard key={id} id={id} state={b1.horrors[id]} marks={b1.marks[id]} />
      ))}
    </div>
  )
}
