import { useRef, useState } from 'react'
import type { AudioState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { uploadClip, deleteClip, audioPlay, audioStop, audioStopAll, audioOneShot, setMasterGain, setClipGain } from '../lib/actions'

export default function Soundboard({ gm }: { gm: string }) {
  const audio = useGameState<AudioState>('audio')
  const fileRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<'loop' | 'oneshot'>('oneshot')
  const [uploading, setUploading] = useState(false)
  if (!audio) return <div className="tab-loading">…</div>

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setUploading(true)
    try {
      for (const f of Array.from(files)) await uploadClip(gm, f, kind)
    } catch (e: any) {
      alert(`Upload failed: ${e.message}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const loops = audio.library.filter((c) => c.kind === 'loop')
  const shots = audio.library.filter((c) => c.kind === 'oneshot')
  const isPlaying = (id: string) => audio.playing.some((p) => p.id === id)

  return (
    <div className="tab">
      <div className="panel-sub">UPLOAD ({uploading ? 'uploading…' : 'mp3 / ogg / wav'})</div>
      <div className="btn-row">
        <button className={`btn ${kind === 'oneshot' ? 'btn-on' : ''}`} onClick={() => setKind('oneshot')}>ONE-SHOT (horn)</button>
        <button className={`btn ${kind === 'loop' ? 'btn-on' : ''}`} onClick={() => setKind('loop')}>LOOP (ambience)</button>
      </div>
      <input ref={fileRef} type="file" accept="audio/*" multiple className="input" onChange={(e) => onFiles(e.target.files)} />
      <div className="muted">suggested kit: short horn · two horns · long horn · low horn · dragon shriek · Titan drumbeat (loop) · marching soldiers (loop)</div>

      <div className="panel-sub">MASTER VOLUME — {Math.round(audio.masterGain * 100)}%</div>
      <input type="range" min={0} max={1} step={0.05} value={audio.masterGain}
        onChange={(e) => setMasterGain(gm, Number(e.target.value))} className="slider" />

      <div className="panel-sub">AMBIENCE LOOPS {audio.playing.length > 0 && <button className="btn btn-sm btn-dark" onClick={() => audioStopAll(gm)}>STOP ALL</button>}</div>
      {loops.length === 0 && <div className="muted">none uploaded yet</div>}
      {loops.map((c) => (
        <div key={c.id} className="clip-row">
          <span className="clip-name">{isPlaying(c.id) ? '🔊 ' : ''}{c.name}</span>
          <input type="range" min={0} max={1.5} step={0.1} value={c.gain} className="slider slider-sm"
            onChange={(e) => setClipGain(gm, c.id, Number(e.target.value))} />
          {isPlaying(c.id)
            ? <button className="btn btn-sm btn-on" onClick={() => audioStop(gm, c.id)}>STOP</button>
            : <button className="btn btn-sm" onClick={() => audioPlay(gm, c.id)}>PLAY</button>}
          <button className="btn btn-sm btn-dark" onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteClip(gm, c.id) }}>✕</button>
        </div>
      ))}

      <div className="panel-sub">ONE-SHOTS</div>
      {shots.length === 0 && <div className="muted">none uploaded yet</div>}
      {shots.map((c) => (
        <div key={c.id} className="clip-row">
          <span className="clip-name">{c.name}</span>
          <input type="range" min={0} max={1.5} step={0.1} value={c.gain} className="slider slider-sm"
            onChange={(e) => setClipGain(gm, c.id, Number(e.target.value))} />
          <button className="btn btn-sm btn-gold" onClick={() => audioOneShot(gm, c.id)}>FIRE</button>
          <button className="btn btn-sm btn-dark" onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteClip(gm, c.id) }}>✕</button>
        </div>
      ))}
    </div>
  )
}
