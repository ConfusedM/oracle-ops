// ---------- identity ----------
export const GM_NAMES = ['Gerry', 'Bela', 'Bernard', 'Jonathan', 'Wilson', 'Ali'] as const
export type GmName = (typeof GM_NAMES)[number]

// ---------- block 1: the five horrors ----------
export type HorrorId = 'kaervox' | 'shepherd' | 'mournweight' | 'maw' | 'grey'
export const HORROR_IDS: HorrorId[] = ['kaervox', 'shepherd', 'mournweight', 'maw', 'grey']
export const HORRORS: Record<HorrorId, { name: string; emotion: string; color: string; gm: string }> = {
  kaervox: { name: 'KAERVOX, THE FIRST FLAME', emotion: 'WRATH', color: '#e0432d', gm: 'Gerry' },
  shepherd: { name: 'THE PALE SHEPHERD', emotion: 'FEAR', color: '#e8e3d5', gm: 'Bela' },
  mournweight: { name: 'MOURNWEIGHT', emotion: 'DESPAIR', color: '#3d6fa8', gm: 'Bernard' },
  maw: { name: 'THE GILDED MAW', emotion: 'DESIRE', color: '#d8a531', gm: 'Jonathan' },
  grey: { name: 'THE GREY', emotion: 'APATHY', color: '#6e6e6e', gm: 'Wilson' },
}
export type HorrorState = 'fighting' | 'bloodied' | 'slain' | 'broken'
export const HORROR_STATES: HorrorState[] = ['fighting', 'bloodied', 'slain', 'broken']
export const DEATH_LINES: Record<HorrorId, string> = {
  kaervox: 'The First Flame falls to its knees — an argument finally ending. ALL WRATH IS LIFTED.',
  shepherd: 'The lantern gutters. The flock walks out of the fog. ALL FEAR IS LIFTED.',
  mournweight: 'The weight sets down what it carried. ALL DESPAIR IS LIFTED.',
  maw: 'The gilding peels. The contracts burn unpaid. ALL DESIRE IS LIFTED.',
  grey: 'Color returns to a mile of the Verge. ALL APATHY IS LIFTED.',
}

export interface Block1State {
  horrors: Record<HorrorId, HorrorState>
  marks: Record<HorrorId, number>
}

// ---------- block 2: the wall ----------
export type SectionState = 'held' | 'magicDown' | 'willBroken' | 'breached'
export const SECTION_STATES: SectionState[] = ['held', 'magicDown', 'willBroken', 'breached']
export const SECTION_STATE_LABELS: Record<SectionState, string> = {
  held: 'HELD', magicDown: 'MAGIC DOWN', willBroken: 'WILL BROKEN', breached: 'BREACHED',
}
export interface Section { id: number; name: string; state: SectionState; skeleton: string }

export interface Block2State {
  sections: Section[]
  childrenDelivered: number
  childrenNames: string[]
}

// ---------- block 3: hex crawl + finale ----------
export type HexIcon = 'distress' | 'lantern' | 'request'
export const HEX_ICON_GLYPHS: Record<HexIcon, string> = { distress: '🆘', lantern: '🏮', request: '🤝' }
export type TeamId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6'
export const TEAM_IDS: TeamId[] = ['t1', 't2', 't3', 't4', 't5', 't6']
export const TEAM_COLORS: Record<TeamId, string> = {
  t1: '#e0432d', t2: '#3d6fa8', t3: '#4caf6e', t4: '#d8a531', t5: '#9b59b6', t6: '#e87fb0',
}
export const ADVANTAGES = ['Banked Answer', 'Unfiling', 'Borrowed Certainty', 'Stolen Bearing', 'Memory Shield'] as const
export type AdvantageKind = (typeof ADVANTAGES)[number]
export interface EmberEntry { name: string; count: number }
export interface HexState { cleared?: boolean; icons?: HexIcon[]; glow?: boolean }

export interface Block3State {
  hexes: Record<string, HexState>
  teams: Record<TeamId, string | null>
  pulse: { blue: number; grey: number }
  immune: number
  advantages: { kind: AdvantageKind; player: string }[]
  embers: Partial<Record<TeamId, EmberEntry[]>>
  gulletWave: number
}

export const IMMUNE_REASONS = {
  up: ['combat/destruction', 'theft succeeded', 'Pulse read', 'horn sounded', 'Mouth fed', 'stuck 12+ min'],
  down: ['regret accepted', 'generous solve', 'Scar retold'],
}

// ---------- bars & plate ----------
export type BarId = 'morale' | 'army' | 'enemy'
export const BAR_LABELS: Record<BarId, string> = { morale: 'MORALE', army: 'ARMY', enemy: 'ENEMY' }
export const BAR_COLORS: Record<BarId, string> = { morale: '#d8a531', army: '#4d8fd1', enemy: '#777' }
export type Zone = 'green' | 'amber' | 'red'
export const ZONE_EFFECTS: Record<BarId, Record<Zone, string>> = {
  morale: { green: '+1 on checks vs the wall', amber: '—', red: 'enemy minions +1 to hit' },
  army: { green: 'cohorts full effect; escorts free', amber: 'escorts cost a PC action', red: 'corridor capacity halves' },
  enemy: { green: 'final defenses arrive thin', amber: 'as written', red: 'Gatekeepers +1 action' },
}
export const BAR_REASONS: Record<BarId, string[]> = {
  morale: ['BREACH', 'child delivered', 'couplet completed', 'Titan cracks the wall', 'PC death', 'swallowed soldier returns wrong', 'section guttered'],
  army: ['rear rotation', 'clean hold', 'Vanguard Token forged', 'escaped breaker', 'soldier eaten', 'dragon lost'],
  enemy: ['section held at horn', 'Gatekeeper drops a PC', 'section state-change', 'arch-mage released'],
}

export const PLATE_EVENTS: { label: string; delta: number }[] = [
  { label: 'PC dropped to 0 HP', delta: 1 },
  { label: 'Tide breaker escaped', delta: 1 },
  { label: 'PC death', delta: 2 },
  { label: 'Player succumbed to a 9', delta: 1 },
  { label: 'Architecture toll lands on a table', delta: 1 },
  { label: '5th+ level slot cast in the Wound', delta: 1 },
  { label: 'Aspect destroyed', delta: -2 },
  { label: 'Master freed / mercied', delta: -1 },
  { label: 'Orsovath lands for the army', delta: -3 },
  { label: 'Grey returned at the Standing', delta: -1 },
  { label: 'Turncoat drinks the Plate', delta: -3 },
]

// ---------- timers & scenes ----------
export interface Timer {
  id: string
  label: string
  endsAt: string
  durationSec: number
  repeating: boolean
  paused: boolean
  remainingSec?: number
  soundId?: string | null
  meta?: Record<string, unknown>
}

export const SCENE_LISTS: Record<1 | 2 | 3, { label: string; minutes: number }[]> = {
  1: [
    { label: 'The Muster', minutes: 10 },
    { label: 'The Five Blessings', minutes: 25 },
    { label: 'The Vigil & the Draft', minutes: 45 },
    { label: 'The Domains', minutes: 30 },
    { label: 'The Battle of the Five Flames', minutes: 45 },
    { label: 'The Army Marches', minutes: 15 },
  ],
  2: [
    { label: 'The Same Morning', minutes: 10 },
    { label: 'The Five Blessings, Again', minutes: 20 },
    { label: 'The March, the Runes, the Trap', minutes: 50 },
    { label: 'The Breaching', minutes: 80 },
    { label: 'The Gate Stands Open', minutes: 15 },
  ],
  3: [
    { label: 'The Vigil Before', minutes: 10 },
    { label: 'The Last Stations', minutes: 20 },
    { label: 'The Dive', minutes: 10 },
    { label: 'B9 — The Folded Flesh', minutes: 35 },
    { label: 'The Descent & the Unveiling', minutes: 10 },
    { label: 'The Battle & the Sixth Fire', minutes: 70 },
    { label: 'Endings & the Tally', minutes: 25 },
  ],
}

// ---------- shared ----------
export interface SharedState {
  bowl: number
  activeBlock: 1 | 2 | 3
  bars: { morale: number; army: number; enemy: number; enemyRetired: boolean }
  plate: { value: number; threshold: number; active: boolean }
  dragonChits: number
  rearTideRotations: number
  titanSevered: boolean
  timers: Timer[]
  scene: { index: number; startedAt: string | null }
}

// ---------- director / audio / media ----------
export type WallFocus = 'banners' | 'breach' | 'hexmap' | 'economy' | 'media'
export interface DirectorState {
  wallFocus: WallFocus
  mediaId: string | null
  mediaMode: 'fullscreen' | 'backdrop'
  backdropId: string | null
  announcement: { text: string; countdownEndsAt?: string } | null
}
export interface Clip { id: string; name: string; url: string; kind: 'loop' | 'oneshot'; gain: number }
export interface AudioState {
  library: Clip[]
  playing: { id: string; startedAt: string }[]
  masterGain: number
}
export interface MediaItem { id: string; name: string; url: string; kind: 'image' | 'video' }
export interface MediaState { library: MediaItem[] }

// ---------- events ----------
export interface GameEvent {
  id: number
  at: string
  gm: string | null
  action: string
  payload: Record<string, any> | null
  ticker: boolean
}

// ---------- seed (for resets) ----------
export const SEED: Record<string, any> = {
  shared: {
    bowl: 60, activeBlock: 1,
    bars: { morale: 50, army: 50, enemy: 50, enemyRetired: false },
    plate: { value: 0, threshold: 25, active: false },
    dragonChits: 6, rearTideRotations: 0, titanSevered: false, timers: [],
    scene: { index: 0, startedAt: null },
  },
  block1: {
    horrors: { kaervox: 'fighting', shepherd: 'fighting', mournweight: 'fighting', maw: 'fighting', grey: 'fighting' },
    marks: { kaervox: 0, shepherd: 0, mournweight: 0, maw: 0, grey: 0 },
  },
  block2: {
    sections: [
      { id: 1, name: 'THE FLINCH', state: 'held', skeleton: '' },
      { id: 2, name: 'THE CHOIR', state: 'held', skeleton: '' },
      { id: 3, name: 'THE FURNACE', state: 'held', skeleton: '' },
      { id: 4, name: 'THE ECHO', state: 'held', skeleton: '' },
      { id: 5, name: 'THE BREATH', state: 'held', skeleton: '' },
      { id: 6, name: 'THE ANCHOR', state: 'held', skeleton: '' },
    ],
    childrenDelivered: 0, childrenNames: [],
  },
  block3: {
    hexes: {}, teams: { t1: null, t2: null, t3: null, t4: null, t5: null, t6: null },
    pulse: { blue: 0, grey: 0 }, immune: 0, advantages: [], embers: {}, gulletWave: 1,
  },
  director: { wallFocus: 'banners', mediaId: null, mediaMode: 'fullscreen', backdropId: null, announcement: null },
}
