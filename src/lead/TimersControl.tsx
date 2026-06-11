import { useState } from 'react'
import { SCENE_LISTS } from '../lib/types'
import type { SharedState, AudioState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { timerStart, timerPause, timerResume, timerCancel, sceneSet, rearTideAnswer, dragonCall } from '../lib/actions'
import { remainingSec, fmt, serverNow } from '../lib/time'

const PRESETS = [
  { label: 'THE HOURGLASS', min: 15, repeating: false },
  { label: 'REAR TIDE', min: 15, repeating: true },
  { label: 'GULLET WAVE', min: 12, repeating: true },
  { label: 'THE DRAFT', min: 12, repeating: false },
  { label: 'BATTLE STATIONS', min: 3, repeating: false },
]

export default function TimersControl({ gm }: { gm: string }) {
  const shared = useGameState<SharedState>('shared')
  const audio = useGameState<AudioState>('audio')
  const [custom, setCustom] = useState({ label: '', min: '' })
  const [soundId, setSoundId] = useState<string>('')
  if (!shared) return <div className="tab-loading">…</div>

  const scenes = SCENE_LISTS[shared.activeBlock]
  const sceneIdx = Math.min(shared.scene.index, scenes.length - 1)
  const elapsedMin = shared.scene.startedAt
    ? Math.floor((serverNow() - new Date(shared.scene.startedAt).getTime()) / 60000)
    : 0

  const start = (label: string, min: number, repeating: boolean) =>
    timerStart(gm, { label, durationSec: min * 60, repeating, soundId: soundId || null })

  return (
    <div className="tab">
      <div className="panel-sub">SCENE CLOCK — Block {shared.activeBlock}</div>
      <div className="scene-clock">
        <div className="scene-now">{scenes[sceneIdx].label}</div>
        <div className="scene-time">{elapsedMin} / {scenes[sceneIdx].minutes} min</div>
        {sceneIdx + 1 < scenes.length && (
          <button className="btn" onClick={() => sceneSet(gm, sceneIdx + 1, scenes[sceneIdx + 1].label)}>
            NEXT → {scenes[sceneIdx + 1].label}
          </button>
        )}
      </div>

      <div className="panel-sub">COMPLETION SOUND (optional, applies to new timers)</div>
      <select className="input" value={soundId} onChange={(e) => setSoundId(e.target.value)}>
        <option value="">— none —</option>
        {(audio?.library ?? []).filter((c) => c.kind === 'oneshot').map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <div className="panel-sub">PRESETS</div>
      <div className="chip-row">
        {PRESETS.map((p) => (
          <button key={p.label} className="chip" onClick={() => start(p.label, p.min, p.repeating)}>
            {p.label} {p.min}:00{p.repeating ? ' ↻' : ''}
          </button>
        ))}
      </div>
      <div className="field-row">
        <input className="input" placeholder="custom label" value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} />
        <input className="input input-sm" placeholder="min" inputMode="numeric" value={custom.min} onChange={(e) => setCustom({ ...custom, min: e.target.value })} />
        <button className="btn" disabled={!custom.label.trim() || !Number(custom.min)}
          onClick={() => { start(custom.label.toUpperCase(), Number(custom.min), false); setCustom({ label: '', min: '' }) }}>
          START
        </button>
      </div>

      <div className="panel-sub">RUNNING</div>
      {shared.timers.length === 0 && <div className="muted">no timers running</div>}
      {shared.timers.map((t) => (
        <div key={t.id} className="timer-admin">
          <span className="timer-label">{t.label}{t.repeating ? ' ↻' : ''}</span>
          <span className="timer-value">{fmt(remainingSec(t))}</span>
          {t.paused
            ? <button className="btn btn-sm" onClick={() => timerResume(gm, t.id)}>▶</button>
            : <button className="btn btn-sm" onClick={() => timerPause(gm, t.id)}>⏸</button>}
          <button className="btn btn-sm btn-dark" onClick={() => timerCancel(gm, t.id)}>✕</button>
        </div>
      ))}

      <div className="panel-sub">REAR TIDE ANSWER</div>
      <div className="btn-row">
        <button className="btn" onClick={() => rearTideAnswer(gm, 'blood')}>
          BLOOD (rotation {shared.rearTideRotations}{shared.rearTideRotations >= 4 ? ' ✓ Vane lives' : ''})
        </button>
        <button className="btn" disabled={shared.titanSevered}
          title={shared.titanSevered ? 'The Titan is severed — no bowl spends' : ''}
          onClick={() => rearTideAnswer(gm, 'hope')}>
          HOPE (−2 dice)
        </button>
      </div>

      <div className="panel-sub">DRAGON CALL — {shared.dragonChits} remain</div>
      <button className="btn" disabled={shared.dragonChits === 0 || shared.timers.some((t) => t.label === 'THE HOURGLASS')}
        onClick={() => {
          const table = prompt('Which table calls?')
          if (table) dragonCall(gm, table).catch((e) => alert(e.message))
        }}>
        🐉 SOUND THE CALL (starts the Hourglass)
      </button>
    </div>
  )
}
