import { useEffect, useState } from 'react'
import { useGameState } from '../lib/useGameState'
import { remainingSec, fmt, serverNow } from '../lib/time'
import { SCENE_LISTS } from '../lib/types'
import type { SharedState } from '../lib/types'

export default function Sidebar() {
  const shared = useGameState<SharedState>('shared')
  const [, tick] = useState(0)
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(i)
  }, [])
  if (!shared) return <div className="sidebar" />

  const scenes = SCENE_LISTS[shared.activeBlock]
  const scene = scenes[Math.min(shared.scene.index, scenes.length - 1)]
  const elapsedMin = shared.scene.startedAt
    ? Math.floor((serverNow() - new Date(shared.scene.startedAt).getTime()) / 60000)
    : null

  return (
    <div className="sidebar">
      <div className="scene-banner">
        <div className="scene-banner-block">BLOCK {shared.activeBlock}</div>
        <div className="scene-banner-name">{scene.label}</div>
        {elapsedMin !== null && <div className="scene-banner-time">{elapsedMin} / {scene.minutes} min</div>}
      </div>

      <div className="chits">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={`chit ${i < shared.dragonChits ? '' : 'chit-spent'}`}>🐉</span>
        ))}
        <div className="chits-label">DRAGON CALLS</div>
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
