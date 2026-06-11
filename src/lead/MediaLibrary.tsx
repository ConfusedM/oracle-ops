import { useRef, useState } from 'react'
import type { MediaState, DirectorState } from '../lib/types'
import { useGameState } from '../lib/useGameState'
import { uploadMedia, deleteMedia, setMedia } from '../lib/actions'

export default function MediaLibrary({ gm }: { gm: string }) {
  const media = useGameState<MediaState>('media')
  const director = useGameState<DirectorState>('director')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  if (!media || !director) return <div className="tab-loading">…</div>

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setUploading(true)
    try {
      for (const f of Array.from(files)) await uploadMedia(gm, f)
    } catch (e: any) {
      alert(`Upload failed: ${e.message}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="tab">
      <div className="panel-sub">UPLOAD SCENES ({uploading ? 'uploading…' : 'images & video — video loops muted'})</div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="input" onChange={(e) => onFiles(e.target.files)} />
      <div className="btn-row">
        <button className="btn btn-dark" disabled={!director.mediaId} onClick={() => setMedia(gm, null, 'fullscreen')}>CLEAR FULLSCREEN</button>
        <button className="btn btn-dark" disabled={!director.backdropId} onClick={() => setMedia(gm, null, 'backdrop')}>CLEAR BACKDROP</button>
      </div>
      <div className="media-grid">
        {media.library.map((m) => (
          <div key={m.id} className={`media-card ${director.mediaId === m.id ? 'media-live' : ''} ${director.backdropId === m.id ? 'media-backdrop-on' : ''}`}>
            {m.kind === 'video'
              ? <video src={m.url} muted loop autoPlay playsInline className="media-thumb" />
              : <img src={m.url} alt={m.name} className="media-thumb" />}
            <div className="media-name">{m.name}</div>
            <div className="btn-row">
              <button className="btn btn-sm" onClick={() => setMedia(gm, m.id, 'fullscreen')}>FULL</button>
              <button className="btn btn-sm" onClick={() => setMedia(gm, m.id, 'backdrop')}>BACKDROP</button>
              <button className="btn btn-sm btn-dark" onClick={() => { if (confirm(`Delete "${m.name}"?`)) deleteMedia(gm, m.id) }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
