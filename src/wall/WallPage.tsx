import { useEffect, useState } from 'react'
import { useGameState, sinceLastSync } from '../lib/useGameState'
import { remainingSec, fmt } from '../lib/time'
import Hud from './Hud'
import Sidebar from './Sidebar'
import Ticker from './Ticker'
import AudioEngine from './AudioEngine'
import BannersPanel from './panels/BannersPanel'
import BreachPanel from './panels/BreachPanel'
import HexMapPanel from './panels/HexMapPanel'
import EconomyPanel from './panels/EconomyPanel'
import MediaLayer from './panels/MediaLayer'
import type { DirectorState } from '../lib/types'

export default function WallPage() {
  const director = useGameState<DirectorState>('director')
  const [stale, setStale] = useState(false)
  const [, tick] = useState(0)

  useEffect(() => {
    document.body.classList.add('wall-mode')
    ;(navigator as any).wakeLock?.request('screen').catch(() => {})
    const iv = setInterval(() => {
      setStale(sinceLastSync() > 30)
      tick((n) => n + 1)
    }, 1000)
    return () => {
      document.body.classList.remove('wall-mode')
      clearInterval(iv)
    }
  }, [])

  const focus = director?.wallFocus ?? 'banners'
  const ann = director?.announcement

  return (
    <div className="wall">
      <MediaLayer mode="backdrop" />
      <Hud />
      <div className="wall-main">
        {focus === 'banners' && <BannersPanel />}
        {focus === 'breach' && <BreachPanel />}
        {focus === 'hexmap' && <HexMapPanel />}
        {focus === 'economy' && <EconomyPanel />}
        {focus === 'media' && (director?.mediaId ? <MediaLayer mode="fullscreen" /> : <EconomyPanel />)}
      </div>
      <Sidebar />
      <Ticker />
      <AudioEngine />
      {ann && (
        <div className="announcement">
          <div className="announcement-text">{ann.text}</div>
          {ann.countdownEndsAt && (
            <div className="announcement-count">
              {fmt(remainingSec({ endsAt: ann.countdownEndsAt, paused: false }))}
            </div>
          )}
        </div>
      )}
      {stale && <div className="stale-banner">⚠ CONNECTION LOST — showing last known state</div>}
    </div>
  )
}
