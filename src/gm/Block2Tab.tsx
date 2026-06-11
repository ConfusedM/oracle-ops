import { useState } from 'react'
import { SECTION_STATES, SECTION_STATE_LABELS } from '../lib/types'
import type { Block2State, SharedState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { advanceSection, postSkeleton, childDelivered, bloodKey, coupletCompleted, dragonCall } from '../lib/actions'

export default function Block2Tab({ gm }: { gm: string }) {
  const b2 = useGameState<Block2State>('block2')
  const shared = useGameState<SharedState>('shared')
  const [sectionId, setSectionId] = useState(1)
  const [skeleton, setSkeleton] = useState('')
  const [childName, setChildName] = useState('')
  if (!b2 || !shared) return <div className="tab-loading">…</div>
  const s = b2.sections.find((x) => x.id === sectionId)!
  const nextIdx = SECTION_STATES.indexOf(s.state) + 1
  const next = nextIdx < SECTION_STATES.length ? SECTION_STATES[nextIdx] : null
  const hourglassRunning = shared.timers.some((t) => t.label === 'THE HOURGLASS')

  return (
    <div className="tab">
      <div className="chip-row">
        {b2.sections.map((x) => (
          <button key={x.id} className={`chip ${x.id === sectionId ? 'chip-on' : ''}`} onClick={() => setSectionId(x.id)}>
            S{x.id}
          </button>
        ))}
      </div>
      <div className="my-charge">
        <div className="my-charge-name">S{s.id} — {s.name}</div>
        <div className="my-charge-state">{SECTION_STATE_LABELS[s.state]}</div>
      </div>
      {next && (
        <button className="btn btn-huge" onClick={() => {
          const warn = next === 'breached' ? '\n\n🔶 BREACH — gold light, +2d6 Titan, adjacent tables +1d8 for one round.' : ''
          if (confirm(`Section ${s.id}: ${SECTION_STATE_LABELS[s.state]} → ${SECTION_STATE_LABELS[next]}?${warn}`)) advanceSection(gm, s.id)
        }}>
          ADVANCE → {SECTION_STATE_LABELS[next]}
        </button>
      )}
      <div className="field-row">
        <input className="input" placeholder="keyhole skeleton — the couplet's visible shape"
          value={skeleton} onChange={(e) => setSkeleton(e.target.value)} />
        <button className="btn" disabled={!skeleton.trim()} onClick={() => { postSkeleton(gm, s.id, skeleton); setSkeleton('') }}>POST</button>
      </div>
      <button className="btn" onClick={() => {
        const from = prompt('Couplet completed — which tables carried the halves? (e.g. "S2 + S4")') ?? 'two tables'
        coupletCompleted(gm, s.id, from)
      }}>
        COUPLET COMPLETED (+1d6)
      </button>
      <div className="field-row">
        <input className="input" placeholder="child's name (optional)"
          value={childName} onChange={(e) => setChildName(e.target.value)} />
        <button className="btn btn-gold" onClick={() => { childDelivered(gm, childName.trim() || undefined); setChildName('') }}>
          CHILD DELIVERED ({b2.childrenDelivered}/22)
        </button>
      </div>
      <div className="btn-row">
        <button className="btn btn-dark" onClick={() => {
          if (confirm('A creature died on open runeground — the runes drink. (silent, −1 die)')) bloodKey(gm)
        }}>
          BLOOD-KEY DEATH
        </button>
        <button className="btn" disabled={shared.dragonChits === 0 || hourglassRunning}
          title={hourglassRunning ? 'The Hourglass is running' : ''}
          onClick={() => {
            const table = prompt('Which table sounds the Dragon Call?', `Table ${sectionId}`)
            if (table) dragonCall(gm, table).catch((e) => alert(e.message))
          }}>
          🐉 DRAGON CALL ({shared.dragonChits}){hourglassRunning ? ' ⏳' : ''}
        </button>
      </div>
    </div>
  )
}
