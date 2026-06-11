import { useGameState } from '../../lib/useGameState'
import { SECTION_STATES, SECTION_STATE_LABELS } from '../../lib/types'
import type { Block2State } from '../../lib/types'

export default function BreachPanel() {
  const b2 = useGameState<Block2State>('block2')
  if (!b2) return null
  const skeletons = b2.sections.filter((s) => s.skeleton)
  return (
    <div className="breach-wrap">
      <div className="breach-head">
        <div className="breach-title">THE BREACH BOARD</div>
        <div className="children-count">CHILDREN: {b2.childrenDelivered} / 22</div>
      </div>
      <div className="breach-board">
        {b2.sections.map((s) => {
          const stepIdx = SECTION_STATES.indexOf(s.state)
          return (
            <div key={s.id} className={`section ${s.state === 'breached' ? 'section-breached' : ''}`}>
              <div className="section-id">S{s.id}</div>
              <div className="section-name">{s.name}</div>
              <div className="section-track">
                {SECTION_STATES.map((st, i) => (
                  <div key={st} className={`section-step ${i < stepIdx ? 'step-past' : ''} ${i === stepIdx ? `step-now step-${st}` : ''}`}>
                    {SECTION_STATE_LABELS[st]}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      {skeletons.length > 0 && (
        <div className="skeleton-margin">
          <div className="skeleton-title">THE SKELETON MARGIN — keyholes uncovered</div>
          {skeletons.map((s) => (
            <div key={s.id} className="skeleton-line"><b>S{s.id} {s.name}:</b> {s.skeleton}</div>
          ))}
        </div>
      )}
    </div>
  )
}
