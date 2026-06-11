import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGameState } from '../lib/useGameState'
import { loopOffsetSec, remainingSec } from '../lib/time'
import { logEvent } from '../lib/useEvents'
import { timerRollRepeating, timerExpireOnce } from '../lib/actions'
import type { AudioState, SharedState, Timer } from '../lib/types'

const EXPIRY_LINES: Record<string, string> = {
  'THE HOURGLASS': 'THE HOURGLASS RUNS OUT — the sky may be called again.',
  'REAR TIDE': '🌊 REAR TIDE — one low horn. The host moves. Answer with Blood or Hope.',
  'GULLET WAVE': 'THE GULLET SENDS A WAVE up the dragon-bone stair.',
}

export default function AudioEngine() {
  const audio = useGameState<AudioState>('audio')
  const shared = useGameState<SharedState>('shared')
  const [unlocked, setUnlocked] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const buffers = useRef(new Map<string, AudioBuffer>())
  const loops = useRef(new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>())
  const firedTimers = useRef(new Set<string>())

  async function getBuffer(url: string, id: string): Promise<AudioBuffer | null> {
    if (buffers.current.has(id)) return buffers.current.get(id)!
    try {
      const res = await fetch(url)
      const buf = await ctxRef.current!.decodeAudioData(await res.arrayBuffer())
      buffers.current.set(id, buf)
      return buf
    } catch {
      return null
    }
  }

  function playOnce(clipId: string) {
    const ctx = ctxRef.current
    const clip = audio?.library.find((c) => c.id === clipId)
    if (!ctx || !clip || ctx.state !== 'running') return
    getBuffer(clip.url, clip.id).then((buf) => {
      if (!buf) return
      const src = ctx.createBufferSource()
      const g = ctx.createGain()
      g.gain.value = clip.gain
      src.buffer = buf
      src.connect(g).connect(masterRef.current!)
      src.start()
    })
  }

  function unlock() {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
      masterRef.current = ctxRef.current.createGain()
      masterRef.current.connect(ctxRef.current.destination)
    }
    ctxRef.current.resume().then(() => setUnlocked(true))
  }

  // master gain follows state
  useEffect(() => {
    if (masterRef.current && audio) masterRef.current.gain.value = audio.masterGain
  }, [audio?.masterGain, unlocked])

  // reconcile loops with state.audio.playing (phase-locked via startedAt)
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx || !audio || !unlocked) return
    const wanted = new Map(audio.playing.map((p) => [p.id, p]))
    // stop loops no longer wanted
    for (const [id, node] of loops.current) {
      if (!wanted.has(id)) {
        try { node.src.stop() } catch { /* already stopped */ }
        loops.current.delete(id)
      }
    }
    // start missing loops at the synced offset
    for (const [id, p] of wanted) {
      if (loops.current.has(id)) continue
      const clip = audio.library.find((c) => c.id === id)
      if (!clip) continue
      getBuffer(clip.url, clip.id).then((buf) => {
        if (!buf || loops.current.has(id)) return
        const src = ctx.createBufferSource()
        const g = ctx.createGain()
        g.gain.value = clip.gain
        src.buffer = buf
        src.loop = true
        src.connect(g).connect(masterRef.current!)
        src.start(0, loopOffsetSec(p.startedAt, buf.duration))
        loops.current.set(id, { src, gain: g })
      })
    }
  }, [audio?.playing, audio?.library, unlocked])

  // one-shot bus
  useEffect(() => {
    const ch = supabase
      .channel('oo-audio-bus')
      .on('broadcast', { event: 'oneshot' }, ({ payload }) => playOnce(payload.clipId))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  })

  // timer expiry: announce + sound + roll repeating / remove finished (race-safe, one winner)
  useEffect(() => {
    if (!shared) return
    const iv = setInterval(() => {
      shared.timers.forEach(async (t: Timer) => {
        if (t.paused || remainingSec(t) > 0) return
        const fireKey = `${t.id}:${t.endsAt}`
        if (firedTimers.current.has(fireKey)) return
        firedTimers.current.add(fireKey)
        if (t.soundId) playOnce(t.soundId)
        const line = EXPIRY_LINES[t.label] ?? (t.repeating ? `⏳ ${t.label} — the horn sounds.` : `⏳ ${t.label} ENDS.`)
        if (t.repeating) {
          const won = await timerRollRepeating(t)
          if (won) await logEvent('—', 'timer.cycle', { label: t.label, text: line })
        } else {
          const won = await timerExpireOnce(t) // CAS: exactly one wall wins and announces
          if (won) await logEvent('—', 'timer.expire', { label: t.label, text: line })
        }
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [shared?.timers])

  if (unlocked) return null
  return (
    <button className="audio-unlock" onClick={unlock}>🔇 TAP TO ENABLE AUDIO</button>
  )
}
