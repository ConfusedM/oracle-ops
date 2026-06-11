import { supabase, T_STATE, BUCKET_AUDIO, BUCKET_MEDIA } from './supabase'
import { logEvent } from './useEvents'
import { rollD6, sum, zoneFor, emberTier, nextGulletTable } from './rules'
import { serverNow } from './time'
import {
  SEED, HORRORS, DEATH_LINES, SECTION_STATES, SECTION_STATE_LABELS, BAR_LABELS, ZONE_EFFECTS,
} from './types'
import type {
  BarId, HorrorId, HorrorState, SectionState, TeamId, HexIcon, AdvantageKind, EmberEntry,
  Timer, WallFocus, SharedState, Block2State, Block3State, Clip, MediaItem, AudioState, MediaState, DirectorState,
} from './types'

// ---------- low-level helpers ----------
const merge = (key: string, patch: Record<string, any>) =>
  supabase.rpc('oo_state_merge', { p_key: key, p_patch: patch })

const setPath = (key: string, path: string[], value: any) =>
  supabase.rpc('oo_state_set_path', { p_key: key, p_path: path, p_value: value })

const increment = (key: string, path: string[], delta: number, min: number | null = null, max: number | null = null) =>
  supabase.rpc('oo_state_increment', { p_key: key, p_path: path, p_delta: delta, p_min: min, p_max: max })

const fetchState = async <T,>(key: string): Promise<T> => {
  const { data } = await supabase.from(T_STATE).select('data').eq('key', key).single()
  return data!.data as T
}

const uid = () => Math.random().toString(36).slice(2, 9)

// ---------- bowl ----------
export async function bowlAdjust(gm: string, delta: number, reason: string, opts: { silent?: boolean } = {}) {
  const v = await increment('shared', ['bowl'], delta, 0)
  await logEvent(gm, 'bowl.adjust', {
    delta, reason, value: v.data,
    text: `${delta > 0 ? '+' : ''}${delta} HOPE — ${reason} (bowl: ${v.data})`,
  }, !opts.silent)
  return v.data as number
}

export async function bowlAwardD6(gm: string, n: number, reason: string) {
  const rolls = rollD6(n)
  return bowlAdjust(gm, sum(rolls), `${reason} (rolled ${n}d6: ${rolls.join('+')})`)
}

// ---------- bars ----------
export async function barAdjust(gm: string, bar: BarId, delta: number, reason: string) {
  const shared = await fetchState<SharedState>('shared')
  const oldZone = zoneFor(bar, shared.bars[bar])
  const { data: v } = await increment('shared', ['bars', bar], delta, 0, 100)
  const newZone = zoneFor(bar, Number(v))
  await logEvent(gm, 'bar.adjust', {
    bar, delta, reason, value: v,
    text: `${BAR_LABELS[bar]} ${delta > 0 ? '+' : ''}${delta} — ${reason}`,
  })
  if (newZone !== oldZone) {
    await logEvent(gm, 'bar.zone', {
      bar, zone: newZone,
      text: `${BAR_LABELS[bar]} ${delta > 0 ? 'rises' : 'falls'} to ${newZone.toUpperCase()} — ${ZONE_EFFECTS[bar][newZone]}`,
    })
  }
}

// ---------- plate ----------
export async function plateAdjust(gm: string, delta: number, label: string) {
  const { data: v } = await increment('shared', ['plate', 'value'], delta, 0)
  await logEvent(gm, 'plate.adjust', {
    delta, label, value: v,
    text: `THE PLATE ${delta > 0 ? '+' : ''}${delta} — ${label} (${v} / threshold)`,
  })
  return Number(v)
}

export async function plateConfig(gm: string, value: number, threshold: number, active: boolean) {
  await merge('shared', { plate: { value, threshold, active } })
  await logEvent(gm, 'plate.config', { value, threshold, active, text: active ? `THE PLATE stands at ${value}. It fires at ${threshold}.` : 'Plate configured' }, active)
}

export async function retireEnemyBar(gm: string) {
  const shared = await fetchState<SharedState>('shared')
  await merge('shared', { bars: { ...shared.bars, enemyRetired: true }, plate: { ...shared.plate, active: true } })
  await logEvent(gm, 'plate.retired', { text: 'The ENEMY bar is ceremonially retired. THE PLATE takes its place.' })
}

// ---------- block / scene ----------
export async function setActiveBlock(gm: string, block: 1 | 2 | 3) {
  await merge('shared', { activeBlock: block, scene: { index: 0, startedAt: new Date(serverNow()).toISOString() } })
  await logEvent(gm, 'block.set', { block, text: `BLOCK ${block} BEGINS` })
}

export async function sceneSet(gm: string, index: number, label: string) {
  await merge('shared', { scene: { index, startedAt: new Date(serverNow()).toISOString() } })
  await logEvent(gm, 'scene.set', { index, text: `SCENE: ${label}` })
}

// ---------- timers ----------
export async function timersWrite(timers: Timer[]) {
  await setPath('shared', ['timers'], timers)
}

export async function timerStart(
  gm: string,
  t: { id?: string; label: string; durationSec: number; repeating: boolean; soundId?: string | null; meta?: Record<string, unknown> },
  announce = true,
) {
  const shared = await fetchState<SharedState>('shared')
  const timer: Timer = {
    id: t.id ?? uid(), label: t.label, durationSec: t.durationSec, repeating: t.repeating,
    paused: false, soundId: t.soundId ?? null, meta: t.meta ?? {},
    endsAt: new Date(serverNow() + t.durationSec * 1000).toISOString(),
  }
  await timersWrite([...shared.timers.filter((x) => x.label !== t.label), timer])
  if (announce) await logEvent(gm, 'timer.start', { label: t.label, text: `⏳ ${t.label} — ${Math.round(t.durationSec / 60)} min` })
  return timer
}

export async function timerPause(gm: string, id: string) {
  const shared = await fetchState<SharedState>('shared')
  await timersWrite(shared.timers.map((t) =>
    t.id === id ? { ...t, paused: true, remainingSec: Math.max(0, Math.round((new Date(t.endsAt).getTime() - serverNow()) / 1000)) } : t))
}

export async function timerResume(gm: string, id: string) {
  const shared = await fetchState<SharedState>('shared')
  await timersWrite(shared.timers.map((t) =>
    t.id === id ? { ...t, paused: false, endsAt: new Date(serverNow() + (t.remainingSec ?? 0) * 1000).toISOString() } : t))
}

export async function timerCancel(gm: string, id: string) {
  const shared = await fetchState<SharedState>('shared')
  await timersWrite(shared.timers.filter((t) => t.id !== id))
}

/** Race-safe repeating-timer roll. Returns true for exactly one caller per cycle. */
export async function timerRollRepeating(t: Timer): Promise<boolean> {
  const newEndsAt = new Date(serverNow() + t.durationSec * 1000).toISOString()
  const { data } = await supabase.rpc('oo_timer_roll', {
    p_timer_id: t.id, p_old_ends_at: t.endsAt, p_new_ends_at: newEndsAt,
  })
  return data === true
}

export async function timerExpireOnce(t: Timer): Promise<boolean> {
  // Non-repeating: remove it; the remove-winner announces. Uses the same CAS via oo_timer_roll into the past, then filters.
  const shared = await fetchState<SharedState>('shared')
  const exists = shared.timers.find((x) => x.id === t.id && x.endsAt === t.endsAt)
  if (!exists) return false
  await timersWrite(shared.timers.filter((x) => x.id !== t.id))
  return true
}

// ---------- dragon call & rear tide ----------
export async function dragonCall(gm: string, tableLabel: string) {
  const shared = await fetchState<SharedState>('shared')
  if (shared.dragonChits <= 0) throw new Error('No Dragon Call chits remain.')
  if (shared.timers.some((t) => t.label === 'THE HOURGLASS')) throw new Error('The Hourglass is running — the sky is spent.')
  await increment('shared', ['dragonChits'], -1, 0)
  await logEvent(gm, 'dragon.call', {
    table: tableLabel,
    text: `🐉 DRAGON STRIKE — ${tableLabel} sounds the Dragon Call. ${shared.dragonChits - 1} remain. The Hourglass turns.`,
  })
  await timerStart(gm, { label: 'THE HOURGLASS', durationSec: 15 * 60, repeating: false }, false)
}

export async function rearTideAnswer(gm: string, kind: 'blood' | 'hope') {
  if (kind === 'blood') {
    await increment('shared', ['rearTideRotations'], 1)
    const shared = await fetchState<SharedState>('shared')
    await logEvent(gm, 'tide.answer', {
      kind, rotations: shared.rearTideRotations,
      text: `REAR TIDE answered with BLOOD — rotation ${shared.rearTideRotations} (4+ and Vane survives the day)`,
    })
  } else {
    await bowlAdjust(gm, -2, 'Rear Tide answered with HOPE', { silent: true })
    await logEvent(gm, 'tide.answer', { kind, text: 'REAR TIDE answered with HOPE — 2 dice from the bowl' })
  }
}

export async function setTitanSevered(gm: string, severed: boolean) {
  await merge('shared', { titanSevered: severed })
  await logEvent(gm, 'titan.severed', {
    severed,
    text: severed ? 'THE TITAN IS SEVERED — no calls, no bowl spends. It pounds.' : 'THE TITAN\'S REACH IS RESTORED.',
  })
}

// ---------- block 1 ----------
export async function setHorrorState(gm: string, horror: HorrorId, hs: HorrorState) {
  await setPath('block1', ['horrors', horror], hs)
  const h = HORRORS[horror]
  if (hs === 'bloodied') {
    await logEvent(gm, 'block1.bloodied', { horror, text: `${h.name} IS BLOODIED — ${h.emotion}'s table is cleansed of foreign points!` })
    await bowlAwardD6(gm, 1, `${h.name} bloodied`)
  } else if (hs === 'slain') {
    await logEvent(gm, 'block1.slain', { horror, text: `${DEATH_LINES[horror]}` })
    await bowlAwardD6(gm, 3, `${h.name} slain`)
  } else if (hs === 'broken') {
    await logEvent(gm, 'block1.broken', { horror, text: `${h.emotion}'s company is BROKEN.` })
  } else {
    await logEvent(gm, 'block1.state', { horror, hs }, false)
  }
}

export async function fireSurge(gm: string, horror: HorrorId) {
  const h = HORRORS[horror]
  await logEvent(gm, 'block1.surge', { horror, text: `⚡ ${h.name.split(',')[0]} SURGES — whole room +1 ${h.emotion}` })
}

export async function markDealt(gm: string, horror: HorrorId) {
  await increment('block1', ['marks', horror], 1)
  await logEvent(gm, 'block1.mark', { horror }, false)
}

// ---------- block 2 ----------
export async function advanceSection(gm: string, id: number) {
  const b2 = await fetchState<Block2State>('block2')
  const idx = b2.sections.findIndex((s) => s.id === id)
  const s = b2.sections[idx]
  const next = SECTION_STATES[Math.min(SECTION_STATES.indexOf(s.state) + 1, SECTION_STATES.length - 1)]
  if (next === s.state) return
  await setPath('block2', ['sections', String(idx), 'state'], next)
  if (next === 'breached') {
    await logEvent(gm, 'block2.breach', { id, text: `🔶 BREACH! Section ${id} — ${s.name} — FALLS. Adjacent tables +1d8 damage for one round!` })
    await bowlAwardD6(gm, 2, `Section ${id} ${s.name} breached`)
  } else {
    await logEvent(gm, 'block2.section', { id, state: next, text: `Section ${id} ${s.name}: ${SECTION_STATE_LABELS[next]}` })
  }
}

export async function postSkeleton(gm: string, id: number, text: string) {
  const b2 = await fetchState<Block2State>('block2')
  const idx = b2.sections.findIndex((s) => s.id === id)
  await setPath('block2', ['sections', String(idx), 'skeleton'], text)
  await logEvent(gm, 'block2.skeleton', { id, text: `Keyhole posted — Section ${id}: "${text}"` })
}

export async function childDelivered(gm: string, name?: string) {
  const { data: n } = await increment('block2', ['childrenDelivered'], 1, 0, 22)
  if (name) {
    const b2 = await fetchState<Block2State>('block2')
    await setPath('block2', ['childrenNames'], [...b2.childrenNames, name])
  }
  await bowlAdjust(gm, 2, `child delivered${name ? ` — ${name}` : ''} (${n}/22)`)
}

export async function bloodKey(gm: string) {
  await bowlAdjust(gm, -1, 'blood-key — the runes drink', { silent: true })
  await logEvent(gm, 'block2.bloodkey', {}, false)
}

export async function coupletCompleted(gm: string, spokenAt: number, carriedFrom: string) {
  await bowlAwardD6(gm, 1, `couplet completed at Section ${spokenAt}`)
  await logEvent(gm, 'block2.couplet', {
    text: `A COUPLET COMPLETES at Section ${spokenAt} — halves carried by ${carriedFrom}. A mile apart, two voices go quiet together, released as a pair.`,
  })
}

// ---------- block 3 ----------
export async function moveTeam(gm: string, team: TeamId, hexId: string | null) {
  await setPath('block3', ['teams', team], hexId)
  await logEvent(gm, 'block3.move', { team, hexId }, false)
}

export async function setHexCleared(gm: string, hexId: string, cleared: boolean) {
  const b3 = await fetchState<Block3State>('block3')
  await setPath('block3', ['hexes', hexId], { ...(b3.hexes[hexId] ?? {}), cleared })
  if (cleared) await logEvent(gm, 'block3.hex', { hexId, text: `Hex ${hexId} cleared — the tile pulls from the wall.` })
}

export async function toggleHexIcon(gm: string, hexId: string, icon: HexIcon) {
  const b3 = await fetchState<Block3State>('block3')
  const h = b3.hexes[hexId] ?? {}
  const icons = h.icons?.includes(icon) ? h.icons.filter((i) => i !== icon) : [...(h.icons ?? []), icon]
  await setPath('block3', ['hexes', hexId], { ...h, icons })
  if (icons.includes(icon)) {
    const labels = { distress: `🆘 DISTRESS at hex ${hexId} — a team needs given light walked to them`, lantern: `🏮 A guttered lantern marks hex ${hexId}`, request: `🤝 Hex ${hexId} requests another team — come gift light` }
    await logEvent(gm, 'block3.icon', { hexId, icon, text: labels[icon] })
  }
}

export async function setHexGlow(gm: string, hexId: string) {
  const b3 = await fetchState<Block3State>('block3')
  await setPath('block3', ['hexes', hexId], { ...(b3.hexes[hexId] ?? {}), glow: true, cleared: true })
  await logEvent(gm, 'block3.scar', { hexId, text: 'The map glows green-gold at 26 — the only warm light it shows all night.' })
}

export async function setPulse(gm: string, blue: number, grey: number) {
  await merge('block3', { pulse: { blue, grey } })
  await logEvent(gm, 'block3.pulse', { blue, grey, text: `THE PULSE — GIVEN tonight: ${blue} · TAKEN: ${grey}` })
}

export async function immuneAdjust(gm: string, delta: number, reason: string) {
  const { data: v } = await increment('block3', ['immune'], delta, 0, 10)
  const n = Number(v)
  let warn = ''
  if (n >= 10) warn = ' — ANTIBODIES ATTACK THE LOUDEST TEAM'
  else if (n >= 7) warn = ' — his voice, everywhere, polite about it'
  else if (n >= 4) warn = ' — pale cells shadow the noisiest teams'
  await logEvent(gm, 'block3.immune', { value: n, reason, text: `IMMUNE RESPONSE ${delta > 0 ? '+' : ''}${delta} → ${n}/10 (${reason})${warn}` })
}

export async function setEmbers(gm: string, team: TeamId, entries: EmberEntry[]) {
  const b3 = await fetchState<Block3State>('block3')
  const oldEntries = b3.embers[team] ?? []
  await setPath('block3', ['embers', team], entries)
  for (const e of entries) {
    const oldCount = oldEntries.find((o) => o.name === e.name)?.count ?? 0
    const oldTier = emberTier(oldCount)
    const newTier = emberTier(e.count)
    if (newTier && newTier !== oldTier) {
      const lines = {
        KINDLED: `${e.name} is KINDLED — darkness immunity, self + adjacent`,
        LODESTAR: `🌟 ${e.name} is a LODESTAR — a living rally point; all bright embers lean toward them`,
        BEARER: `✨ ${e.name} is THE BEARER — light-locked doors open for them alone. He will address them first.`,
      }
      await logEvent(gm, 'block3.ember', { team, name: e.name, tier: newTier, text: lines[newTier] })
    }
  }
}

export async function claimAdvantage(gm: string, kind: AdvantageKind, player: string) {
  const b3 = await fetchState<Block3State>('block3')
  if (b3.advantages.some((a) => a.kind === kind)) throw new Error(`${kind} is already claimed.`)
  await setPath('block3', ['advantages'], [...b3.advantages, { kind, player }])
  await logEvent(gm, 'block3.advantage', { kind, player, text: `TAKEN ADVANTAGE — ${player} takes ${kind}` })
}

export async function gulletWave(gm: string, held: boolean) {
  const b3 = await fetchState<Block3State>('block3')
  const table = nextGulletTable(b3.gulletWave)
  await increment('block3', ['gulletWave'], 1)
  if (held) {
    await logEvent(gm, 'block3.gullet', { wave: b3.gulletWave, text: `GULLET WAVE ${b3.gulletWave} BROKEN — ${table} holds the stair.` })
  } else {
    await logEvent(gm, 'block3.gullet', { wave: b3.gulletWave, text: `A BREAKER ESCAPES wave ${b3.gulletWave} (${table}) — it reaches an Aspect table.` })
    await plateAdjust(gm, 1, 'Tide breaker escaped')
  }
}

// ---------- director ----------
export async function setWallFocus(gm: string, focus: WallFocus) {
  await merge('director', { wallFocus: focus })
}

export async function setAnnouncement(gm: string, text: string | null, countdownSec?: number) {
  const announcement = text
    ? { text, ...(countdownSec ? { countdownEndsAt: new Date(serverNow() + countdownSec * 1000).toISOString() } : {}) }
    : null
  await merge('director', { announcement })
  if (text) await logEvent(gm, 'announce', { text })
}

export async function setMedia(gm: string, mediaId: string | null, mode: 'fullscreen' | 'backdrop') {
  if (mode === 'fullscreen') await merge('director', { mediaId, wallFocus: mediaId ? 'media' : 'banners' })
  else await merge('director', { backdropId: mediaId })
}

// ---------- audio ----------
export async function audioPlay(gm: string, clipId: string) {
  const a = await fetchState<AudioState>('audio')
  if (a.playing.some((p) => p.id === clipId)) return
  await setPath('audio', ['playing'], [...a.playing, { id: clipId, startedAt: new Date(serverNow()).toISOString() }])
}

export async function audioStop(gm: string, clipId: string) {
  const a = await fetchState<AudioState>('audio')
  await setPath('audio', ['playing'], a.playing.filter((p) => p.id !== clipId))
}

export async function audioStopAll(gm: string) {
  await setPath('audio', ['playing'], [])
}

export async function audioOneShot(gm: string, clipId: string) {
  await supabase.channel('oo-audio-bus').send({ type: 'broadcast', event: 'oneshot', payload: { clipId } })
}

export async function setMasterGain(gm: string, v: number) {
  await merge('audio', { masterGain: v })
}

export async function setClipGain(gm: string, clipId: string, gain: number) {
  const a = await fetchState<AudioState>('audio')
  await setPath('audio', ['library'], a.library.map((c) => (c.id === clipId ? { ...c, gain } : c)))
}

export async function uploadClip(gm: string, file: File, kind: 'loop' | 'oneshot'): Promise<Clip> {
  const id = uid()
  const path = `${id}-${file.name.replace(/[^\w.\-]/g, '_')}`
  const { error } = await supabase.storage.from(BUCKET_AUDIO).upload(path, file)
  if (error) throw error
  const url = supabase.storage.from(BUCKET_AUDIO).getPublicUrl(path).data.publicUrl
  const clip: Clip = { id, name: file.name.replace(/\.\w+$/, ''), url, kind, gain: 1 }
  const a = await fetchState<AudioState>('audio')
  await setPath('audio', ['library'], [...a.library, clip])
  return clip
}

export async function deleteClip(gm: string, clipId: string) {
  const a = await fetchState<AudioState>('audio')
  await setPath('audio', ['library'], a.library.filter((c) => c.id !== clipId))
  await setPath('audio', ['playing'], a.playing.filter((p) => p.id !== clipId))
}

// ---------- media ----------
export async function uploadMedia(gm: string, file: File): Promise<MediaItem> {
  const id = uid()
  const path = `${id}-${file.name.replace(/[^\w.\-]/g, '_')}`
  const { error } = await supabase.storage.from(BUCKET_MEDIA).upload(path, file)
  if (error) throw error
  const url = supabase.storage.from(BUCKET_MEDIA).getPublicUrl(path).data.publicUrl
  const item: MediaItem = { id, name: file.name.replace(/\.\w+$/, ''), url, kind: file.type.startsWith('video') ? 'video' : 'image' }
  const m = await fetchState<MediaState>('media')
  await setPath('media', ['library'], [...m.library, item])
  return item
}

export async function deleteMedia(gm: string, mediaId: string) {
  const m = await fetchState<MediaState>('media')
  await setPath('media', ['library'], m.library.filter((i) => i.id !== mediaId))
  const d = await fetchState<DirectorState>('director')
  if (d.mediaId === mediaId) await merge('director', { mediaId: null, wallFocus: 'banners' })
  if (d.backdropId === mediaId) await merge('director', { backdropId: null })
}

// ---------- admin ----------
export async function resetNamespace(gm: string, key: keyof typeof SEED) {
  await supabase.from(T_STATE).update({ data: SEED[key], updated_at: new Date().toISOString() }).eq('key', key)
  await logEvent(gm, 'admin.reset', { key, text: `${String(key).toUpperCase()} RESET` })
}

export async function resetDay(gm: string) {
  for (const key of Object.keys(SEED)) {
    await supabase.from(T_STATE).update({ data: SEED[key], updated_at: new Date().toISOString() }).eq('key', key)
  }
  await logEvent(gm, 'admin.resetday', { text: 'THE DAY IS RESET — the bowl stands at 60.' })
}

export async function exportLogCsv(): Promise<string> {
  const { data } = await supabase.from('oo_events').select('*').order('id', { ascending: true })
  const rows = (data ?? []).map((e) =>
    [e.at, e.gm ?? '', e.action, JSON.stringify(e.payload ?? {}).replace(/"/g, '""')].map((c) => `"${c}"`).join(','))
  return ['"at","gm","action","payload"', ...rows].join('\n')
}
