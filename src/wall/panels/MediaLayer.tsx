import { useGameState } from '../../lib/useGameState'
import type { DirectorState, MediaState } from '../../lib/types'

export default function MediaLayer({ mode }: { mode: 'fullscreen' | 'backdrop' }) {
  const director = useGameState<DirectorState>('director')
  const media = useGameState<MediaState>('media')
  if (!director || !media) return null

  const id = mode === 'fullscreen' ? director.mediaId : director.backdropId
  if (!id) return null
  if (mode === 'fullscreen' && director.wallFocus !== 'media') return null
  if (mode === 'backdrop' && director.wallFocus === 'media') return null

  const item = media.library.find((m) => m.id === id)
  if (!item) return null

  const cls = mode === 'fullscreen' ? 'media-full' : 'media-backdrop'
  return item.kind === 'video' ? (
    <video key={item.id} className={cls} src={item.url} autoPlay loop muted playsInline />
  ) : (
    <img key={item.id} className={cls} src={item.url} alt="" />
  )
}
