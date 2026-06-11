import { useGameState } from '../../lib/useGameState'
import { HORROR_IDS, HORRORS } from '../../lib/types'
import type { Block1State } from '../../lib/types'

const STATE_LABEL: Record<string, string> = {
  fighting: 'FIGHTING', bloodied: 'BLOODIED', slain: 'SLAIN', broken: 'COMPANY BROKEN',
}

export default function BannersPanel() {
  const b1 = useGameState<Block1State>('block1')
  if (!b1) return null
  return (
    <div className="banners">
      {HORROR_IDS.map((id) => {
        const h = HORRORS[id]
        const st = b1.horrors[id]
        return (
          <div key={id} className={`banner banner-${st} ${id === 'grey' ? 'banner-grey' : ''}`}
            style={{ ['--horror' as any]: h.color }}>
            <div className="banner-emotion">{h.emotion}</div>
            <div className="banner-name">{h.name}</div>
            <div className={`banner-state banner-state-${st}`}>{STATE_LABEL[st]}</div>
            {st === 'slain' && <div className="banner-lifted">ALL {h.emotion} IS LIFTED</div>}
            <div className="banner-marks">{b1.marks[id] > 0 ? `${b1.marks[id]} marked` : ''}</div>
          </div>
        )
      })}
    </div>
  )
}
