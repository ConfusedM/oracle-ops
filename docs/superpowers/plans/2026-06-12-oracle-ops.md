# Oracle Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shared real-time GM control panel + mirrored TV display for the three-block "Fall of Neth" D&D epic, replacing all GM-side physical bookkeeping, deployed by Saturday for a Sunday convention.

**Architecture:** Static React SPA (Vercel) with three routes — `/wall` (mirrored on 3 TVs in different rooms, includes the audio/media engine), `/gm` (per-GM phone panel), `/lead` (lead-GM panel: scene director, bars, timers, soundboard, Plate console). All state lives in two Supabase tables (`state` jsonb namespaces + `events` append-only log) synced via Supabase Realtime with a polling fallback. Uploaded audio/images/video live in Supabase Storage. No auth; GM identity is a localStorage name chip.

**Tech Stack:** Vite + React 18 + TypeScript, react-router-dom, @supabase/supabase-js v2, vitest for pure-logic tests, plain CSS (single stylesheet, CSS variables). Supabase project + Vercel deploy via their MCP tools.

**Spec:** `docs/superpowers/specs/2026-06-12-oracle-ops-design.md`

---

## File Structure

```
oracle-ops/
  index.html  package.json  vite.config.ts  tsconfig.json  .env.local
  supabase/schema.sql          -- tables, RLS, RPCs, storage buckets, seed rows
  src/
    main.tsx                   -- router: /wall /gm /lead (default → /gm)
    styles.css                 -- all styling, CSS vars for the five Horror colors etc.
    lib/supabase.ts            -- client singleton from env
    lib/types.ts               -- ALL state shapes + constants (the contract)
    lib/time.ts                -- server-clock offset, countdown helper
    lib/rules.ts               -- pure logic: bar zones, ember tiers, betrayal math, dice
    lib/useGameState.ts        -- useState(key) hook: fetch + realtime + 10s poll, mutators
    lib/useEvents.ts           -- ticker feed (last 30 events) + logEvent()
    lib/actions.ts             -- every domain action (bowlAdjust, surge, dragonCall, ...)
    wall/WallPage.tsx          -- layout: MainPanel + Sidebar + Ticker + AudioEngine
    wall/Sidebar.tsx           -- bowl, bars/Plate, chits, timers
    wall/Ticker.tsx
    wall/AudioEngine.tsx       -- loop phase-sync + one-shot broadcast playback + unlock badge
    wall/panels/BannersPanel.tsx
    wall/panels/BreachPanel.tsx
    wall/panels/HexMapPanel.tsx
    wall/panels/hexGeometry.ts -- hex id → svg center coords (the reference layout)
    wall/panels/EconomyPanel.tsx
    wall/panels/MediaLayer.tsx -- fullscreen/backdrop image+video
    gm/GmPage.tsx              -- chip select, common header, block tabs
    gm/BowlControl.tsx         -- +/- with reason + d6 roller (shared by gm/lead)
    gm/Block1Tab.tsx  gm/Block2Tab.tsx  gm/Block3Tab.tsx
    gm/BetrayalCalc.tsx
    lead/LeadPage.tsx          -- tabs: Director / Bars / Timers / Sound / Media / Plate / Admin
    lead/Director.tsx  lead/BarsControl.tsx  lead/TimersControl.tsx
    lead/Soundboard.tsx  lead/MediaLibrary.tsx  lead/PlateConsole.tsx  lead/DayAdmin.tsx
  tests/rules.test.ts  tests/time.test.ts
```

Responsibility rule: `lib/` knows nothing about React rendering beyond hooks; `actions.ts` is the ONLY place that writes state + logs events (UI components never call supabase directly); wall components are pure renderers of state.

---

### Task 1: Scaffold + routing skeleton

**Files:** Create `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles.css`, stub pages.

- [ ] **Step 1: Scaffold**

```bash
cd /c/Users/gerry/GHEPIC/oracle-ops
npm create vite@latest . -- --template react-ts   # answer "Ignore files and continue" (docs/ exists)
npm i react-router-dom @supabase/supabase-js
npm i -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Router skeleton** — `src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles.css'
const WallPage = React.lazy(() => import('./wall/WallPage'))
const GmPage = React.lazy(() => import('./gm/GmPage'))
const LeadPage = React.lazy(() => import('./lead/LeadPage'))
const router = createHashRouter([
  { path: '/wall', element: <WallPage /> },
  { path: '/gm', element: <GmPage /> },
  { path: '/lead', element: <LeadPage /> },
  { path: '*', element: <Navigate to="/gm" replace /> },
])
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.Suspense fallback={<div className="loading">ORACLE OPS</div>}>
    <RouterProvider router={router} />
  </React.Suspense>,
)
```

(Hash router: no Vercel rewrite config needed.) Create the three pages as stubs rendering their name. Delete Vite demo files (`App.tsx`, `App.css`, `assets/`).

- [ ] **Step 3: Verify** — `npm run dev`, open `/#/wall`, `/#/gm`, `/#/lead` → stubs render.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: scaffold Vite app with wall/gm/lead routes"` (add `node_modules`, `dist`, `.env.local` to `.gitignore` first).

---

### Task 2: Supabase project, schema, seed

**Files:** Create `supabase/schema.sql`, `.env.local`.

- [ ] **Step 1: Project** — via Supabase MCP: `list_organizations` → `create_project` named `oracle-ops` (confirm cost first; free tier). Then `get_project_url` + `get_publishable_keys` → write `.env.local`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

- [ ] **Step 2: Schema** — `supabase/schema.sql`, applied with MCP `apply_migration` (name `init`):

```sql
create table public.state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  gm text,
  action text not null,
  payload jsonb,
  ticker boolean not null default true
);
alter table public.state enable row level security;
alter table public.events enable row level security;
create policy state_all on public.state for all using (true) with check (true);
create policy events_read on public.events for select using (true);
create policy events_insert on public.events for insert with check (true);
alter publication supabase_realtime add table public.state;
alter publication supabase_realtime add table public.events;

-- Atomic deep-merge of a patch into a namespace
create or replace function public.state_merge(p_key text, p_patch jsonb)
returns jsonb language sql as $$
  update public.state set data = data || p_patch, updated_at = now()
  where key = p_key returning data;
$$;
-- Atomic set at a path (creates missing parents only at leaf level)
create or replace function public.state_set_path(p_key text, p_path text[], p_value jsonb)
returns void language sql as $$
  update public.state set data = jsonb_set(data, p_path, p_value, true), updated_at = now()
  where key = p_key;
$$;
-- Atomic clamped numeric increment at a path; returns new value
create or replace function public.state_increment(p_key text, p_path text[], p_delta numeric,
  p_min numeric default null, p_max numeric default null)
returns numeric language plpgsql as $$
declare v numeric;
begin
  select coalesce((data #>> p_path)::numeric, 0) + p_delta into v
    from public.state where key = p_key for update;
  if p_min is not null then v := greatest(v, p_min); end if;
  if p_max is not null then v := least(v, p_max); end if;
  update public.state set data = jsonb_set(data, p_path, to_jsonb(v), true), updated_at = now()
    where key = p_key;
  return v;
end $$;
-- Race-safe repeating-timer roll: only the client whose expected endsAt matches wins
create or replace function public.timer_roll(p_timer_id text, p_old_ends_at text, p_new_ends_at text)
returns boolean language plpgsql as $$
declare changed boolean := false;
begin
  update public.state set data = jsonb_set(data, '{timers}',
    (select jsonb_agg(case when t->>'id' = p_timer_id and t->>'endsAt' = p_old_ends_at
        then jsonb_set(t, '{endsAt}', to_jsonb(p_new_ends_at)) else t end)
     from jsonb_array_elements(data->'timers') t)), updated_at = now()
  where key = 'shared'
    and exists (select 1 from jsonb_array_elements(data->'timers') t
                where t->>'id' = p_timer_id and t->>'endsAt' = p_old_ends_at);
  get diagnostics changed = row_count;
  return changed;
end $$;
-- Server clock for client offset calc
create or replace function public.server_now() returns timestamptz language sql as $$ select now() $$;

-- Storage buckets (public read; anon upload)
insert into storage.buckets (id, name, public) values ('audio','audio',true), ('media','media',true);
create policy upload_audio on storage.objects for insert with check (bucket_id in ('audio','media'));
create policy read_objects on storage.objects for select using (bucket_id in ('audio','media'));
```

- [ ] **Step 3: Seed** — second migration `seed` (exact initial rows; shapes defined in Task 3):

```sql
insert into public.state (key, data) values
('shared', '{"bowl":60,"activeBlock":1,
  "bars":{"morale":50,"army":50,"enemy":50,"enemyRetired":false},
  "plate":{"value":0,"threshold":25,"active":false},
  "dragonChits":6,"rearTideRotations":0,"timers":[],
  "scene":{"index":0,"startedAt":null}}'),
('block1', '{"horrors":{"kaervox":"fighting","shepherd":"fighting","mournweight":"fighting","maw":"fighting","grey":"fighting"},
  "marks":{"kaervox":0,"shepherd":0,"mournweight":0,"maw":0,"grey":0}}'),
('block2', '{"sections":[
  {"id":1,"name":"THE FLINCH","state":"held","skeleton":""},
  {"id":2,"name":"THE CHOIR","state":"held","skeleton":""},
  {"id":3,"name":"THE FURNACE","state":"held","skeleton":""},
  {"id":4,"name":"THE ECHO","state":"held","skeleton":""},
  {"id":5,"name":"THE BREATH","state":"held","skeleton":""},
  {"id":6,"name":"THE ANCHOR","state":"held","skeleton":""}],
  "childrenDelivered":0,"childrenNames":[]}'),
('block3', '{"hexes":{},"teams":{"t1":null,"t2":null,"t3":null,"t4":null,"t5":null,"t6":null},
  "pulse":{"blue":0,"grey":0},"immune":0,"advantages":[],"embers":{},"gulletWave":1}'),
('director', '{"wallFocus":"banners","mediaId":null,"mediaMode":"fullscreen","backdropId":null,"announcement":null}'),
('audio', '{"library":[],"playing":[],"masterGain":0.8}'),
('media', '{"library":[]}');
```

- [ ] **Step 4: Verify** — MCP `execute_sql`: `select key from state;` → 7 rows. `select state_increment('shared','{bowl}',-2,0,null);` → 58; set it back to 60.
- [ ] **Step 5: Commit schema file.**

---

### Task 3: lib — types, supabase client, time, rules (+ tests)

**Files:** Create `src/lib/supabase.ts`, `src/lib/types.ts`, `src/lib/time.ts`, `src/lib/rules.ts`, `tests/rules.test.ts`, `tests/time.test.ts`.

- [ ] **Step 1: `supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY,
  { realtime: { params: { eventsPerSecond: 20 } } })
```

- [ ] **Step 2: `types.ts`** — the whole contract. Key contents:

```ts
export const GM_NAMES = ['Gerry','Bela','Bernard','Jonathan','Wilson','Ali'] as const
export type HorrorId = 'kaervox'|'shepherd'|'mournweight'|'maw'|'grey'
export const HORRORS: Record<HorrorId,{name:string;emotion:string;color:string;gm:string}> = {
  kaervox:{name:'KAERVOX, THE FIRST FLAME',emotion:'Wrath',color:'#e0432d',gm:'Gerry'},
  shepherd:{name:'THE PALE SHEPHERD',emotion:'Fear',color:'#e8e3d5',gm:'Bela'},
  mournweight:{name:'MOURNWEIGHT',emotion:'Despair',color:'#3d6fa8',gm:'Bernard'},
  maw:{name:'THE GILDED MAW',emotion:'Desire',color:'#d8a531',gm:'Jonathan'},
  grey:{name:'THE GREY',emotion:'Apathy',color:'#6e6e6e',gm:'Wilson'},
}
export type HorrorState = 'fighting'|'bloodied'|'slain'|'broken'
export type SectionState = 'held'|'magicDown'|'willBroken'|'breached'
export const SECTION_STATES: SectionState[] = ['held','magicDown','willBroken','breached']
export type BarId = 'morale'|'army'|'enemy'
export type Zone = 'green'|'amber'|'red'
export const ZONE_EFFECTS: Record<BarId, Record<Zone,string>> = {
  morale:{green:'+1 on checks vs the wall',amber:'—',red:'enemy minions +1 to hit'},
  army:{green:'cohorts full effect; escorts free',amber:'escorts cost a PC action',red:'corridor capacity halves'},
  enemy:{green:'final defenses arrive thin',amber:'as written',red:'Gatekeepers +1 action'},
}
export type HexIcon = 'distress'|'lantern'|'request'
export type TeamId = 't1'|'t2'|'t3'|'t4'|'t5'|'t6'
export const TEAM_COLORS: Record<TeamId,string> = { t1:'#e0432d',t2:'#3d6fa8',t3:'#4caf6e',
  t4:'#d8a531',t5:'#9b59b6',t6:'#e87fb0' }
export const ADVANTAGES = ['Banked Answer','Unfiling','Borrowed Certainty','Stolen Bearing','Memory Shield'] as const
export type Timer = { id:string; label:string; endsAt:string; durationSec:number;
  repeating:boolean; paused:boolean; remainingSec?:number; soundId?:string|null; meta?:any }
export type WallFocus = 'banners'|'breach'|'hexmap'|'economy'|'media'
// ...SharedState, Block1State, Block2State, Block3State, DirectorState, AudioState, MediaState
// interfaces matching the Task 2 seed exactly (write them out in full).
export type Section = { id:number; name:string; state:SectionState; skeleton:string }
export type Clip = { id:string; name:string; url:string; kind:'loop'|'oneshot'; gain:number }
export type MediaItem = { id:string; name:string; url:string; kind:'image'|'video' }
export type EmberEntry = { name:string; count:number }
```

Also `IMMUNE_REASONS = { up: ['combat/destruction','theft succeeded','Pulse read','horn','Mouth fed','stuck 12+ min'], down: ['regret accepted','generous solve','Scar retold'] }` and `PLATE_EVENTS` (label+delta list straight from the spec §6: PC to 0 +1, breaker escapes +1, PC death +2, succumb to 9 +1, toll lands on table +1, 5th+ slot cast +1, Aspect destroyed −2, Master freed −1, Orsovath lands −3, grey returned −1, Plate drunk −3).

- [ ] **Step 3: `time.ts`**

```ts
import { supabase } from './supabase'
let offsetMs = 0
export async function syncServerClock() {
  const t0 = Date.now()
  const { data } = await supabase.rpc('server_now')
  if (data) offsetMs = new Date(data).getTime() - (t0 + (Date.now() - t0) / 2)
}
export const serverNow = () => Date.now() + offsetMs
export function remainingSec(t: { endsAt:string; paused:boolean; remainingSec?:number }) {
  if (t.paused) return t.remainingSec ?? 0
  return Math.max(0, Math.round((new Date(t.endsAt).getTime() - serverNow()) / 1000))
}
export const fmt = (s:number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
export const loopOffsetSec = (startedAt:string, durationSec:number) =>
  ((serverNow() - new Date(startedAt).getTime()) / 1000) % durationSec
```

- [ ] **Step 4: `rules.ts`** (pure, no imports from supabase):

```ts
import type { BarId, Zone } from './types'
export function zoneFor(bar: BarId, value: number): Zone {
  const hi = value >= 67, lo = value <= 33
  if (bar === 'enemy') return hi ? 'red' : lo ? 'green' : 'amber'
  return hi ? 'green' : lo ? 'red' : 'amber'
}
export function emberTier(count: number): string | null {
  if (count >= 7) return 'BEARER'
  if (count >= 5) return 'LODESTAR'
  if (count >= 3) return 'KINDLED'
  return null
}
export function betrayalStats(units: number) {
  return { d20: 2*units, saveDC: units, damage: 5*units, hp: 30*units }
}
export const rollD6 = (n = 1) =>
  Array.from({length:n}, () => 1 + Math.floor(Math.random()*6))
```

- [ ] **Step 5: tests** — `tests/rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { zoneFor, emberTier, betrayalStats } from '../src/lib/rules'
describe('zoneFor', () => {
  it('morale high is green, enemy high is red', () => {
    expect(zoneFor('morale', 80)).toBe('green')
    expect(zoneFor('enemy', 80)).toBe('red')
    expect(zoneFor('army', 20)).toBe('red')
    expect(zoneFor('enemy', 20)).toBe('green')
    expect(zoneFor('morale', 50)).toBe('amber')
  })
})
describe('emberTier', () => {
  it('tiers at 3/5/7', () => {
    expect(emberTier(2)).toBeNull()
    expect(emberTier(3)).toBe('KINDLED')
    expect(emberTier(5)).toBe('LODESTAR')
    expect(emberTier(7)).toBe('BEARER')
  })
})
describe('betrayalStats', () => {
  it('lodestar with 5 units', () => {
    expect(betrayalStats(5)).toEqual({ d20: 10, saveDC: 5, damage: 25, hp: 150 })
  })
})
```

`tests/time.test.ts`: test `fmt(95) === '1:35'` and `remainingSec` of a paused timer returns `remainingSec` field.

- [ ] **Step 6: Run** — `npm test` → all pass.
- [ ] **Step 7: Commit** — `feat: core lib (types, time, rules) with tests`.

---

### Task 4: Sync layer — useGameState, useEvents, actions

**Files:** Create `src/lib/useGameState.ts`, `src/lib/useEvents.ts`, `src/lib/actions.ts`.

- [ ] **Step 1: `useGameState.ts`**

```ts
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
const cache = new Map<string, any>()
const listeners = new Map<string, Set<(d:any)=>void>>()
let channelStarted = false
function startChannel() {
  if (channelStarted) return; channelStarted = true
  supabase.channel('state-sync')
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'state' }, (p) => {
      const row = p.new as { key:string; data:any }
      cache.set(row.key, row.data)
      listeners.get(row.key)?.forEach(fn => fn(row.data))
    }).subscribe()
  setInterval(async () => {  // polling fallback
    const { data } = await supabase.from('state').select('key,data')
    data?.forEach(r => { cache.set(r.key, r.data); listeners.get(r.key)?.forEach(fn => fn(r.data)) })
  }, 10000)
}
export function useGameState<T = any>(key: string): T | null {
  const [data, setData] = useState<T|null>(cache.get(key) ?? null)
  useEffect(() => {
    startChannel()
    if (!listeners.has(key)) listeners.set(key, new Set())
    listeners.get(key)!.add(setData)
    supabase.from('state').select('data').eq('key', key).single()
      .then(({ data: r }) => r && (cache.set(key, r.data), setData(r.data)))
    return () => { listeners.get(key)!.delete(setData) }
  }, [key])
  return data
}
```

- [ ] **Step 2: `useEvents.ts`** — fetch last 30 (`order id desc, limit 30`), subscribe to INSERT on `events`, expose `events` array; export `logEvent(gm, action, payload, ticker=true)` doing a plain insert.

- [ ] **Step 3: `actions.ts`** — every mutation in the app, each = state RPC + logEvent. Complete list (signatures; bodies are 2–4 lines each calling `supabase.rpc('state_merge'|'state_set_path'|'state_increment')` + `logEvent`):

```ts
// shared
bowlAdjust(gm, delta, reason, opts?: { silent?: boolean })       // state_increment shared/{bowl} clamp 0..; ticker unless silent
bowlAwardD6(gm, n, reason)        // rolls n d6 client-side, calls bowlAdjust with sum, reason `+${n}d6 ${reason} (rolled ${sum})`
barAdjust(gm, bar, delta, reason) // increment clamp 0..100; afterwards compare zoneFor old/new, extra ticker event on crossing
plateAdjust(gm, delta, label)     // increment plate.value clamp 0..; event 'plate.adjust'
plateConfig(gm, value, threshold, active)
retireEnemyBar(gm)                // merge bars.enemyRetired=true, plate.active=true; event 'plate.retired'
setActiveBlock(gm, block)         // merge activeBlock; event
dragonCall(gm, tableLabel)        // guard: chits>0 && no running hourglass; chits-1, timer add hourglass 15:00, events 'dragon.call'
rearTideAnswer(gm, kind: 'blood'|'hope')  // rotations+1 if blood; hope also bowlAdjust(-2,silent? no: announced)
// timers
timerStart(gm, t: Omit<Timer,'endsAt'> & { durationSec:number })  // endsAt = serverNow()+duration
timerPause(gm, id) / timerResume(gm, id) / timerCancel(gm, id)
timerRollRepeating(id, oldEndsAt, durationSec)   // rpc timer_roll; returns won:boolean
sceneSet(gm, index)
// block1
setHorrorState(gm, horror, hs)    // merge into block1.horrors; auto bowl: bloodied → bowlAwardD6(1), slain → bowlAwardD6(3); ticker with death-line prompt
fireSurge(gm, horror)             // event 'block1.surge' (ticker: "X SURGES — whole room +1 EMOTION")
markDealt(gm, horror)             // increment marks
// block2
advanceSection(gm, id)            // set next SectionState; breached → bowlAwardD6(2) + event 'block2.breach'
postSkeleton(gm, id, text)
childDelivered(gm, name?)         // childrenDelivered+1, push name, bowlAdjust(+2, `child delivered${name?`: ${name}`:''}`)
bloodKey(gm)                      // bowlAdjust(-1, 'blood-key', {silent:true}) + event ticker:false
coupletCompleted(gm, carriedBy, spokenAt)  // bowlAwardD6(1) + three-table announcement
// block3
moveTeam(gm, team, hexId) / setHexCleared(gm, hexId, cleared) / toggleHexIcon(gm, hexId, icon)
setHexGlow(gm, hexId)             // hex 26 scar moment
setPulse(gm, blue, grey)
immuneAdjust(gm, delta, reason)   // clamp 0..10
setEmbers(gm, team, entries: EmberEntry[])   // lodestar/bearer tier announcements on crossings
claimAdvantage(gm, kind, player)  // guard kind unclaimed; merge into advantages[]
gulletWave(gm, resolved: boolean) // wave+1; breaker escaped → plateAdjust(+1,'breaker escaped')
// director / audio / media
setWallFocus(gm, focus) / setAnnouncement(gm, text|null, countdownSec?)
setMedia(gm, mediaId|null, mode) / setBackdrop(gm, mediaId|null)
audioPlay(gm, clipId) / audioStop(gm, clipId) / audioOneShot(gm, clipId)  // oneshot = broadcast on channel 'audio-bus'
setMasterGain(gm, v)
uploadClip(file, kind) / uploadMedia(file)   // storage upload → public URL → merge into library
// admin
resetBlock(key) / resetDay()      // re-write seed JSON (constants in types.ts), double-confirm in UI
```

Implementation note: array-bearing namespaces (`timers`, `advantages`, `sections`, libraries) use read-modify-write via `state_set_path` on the array — acceptable because each array has a single natural writer (lead for timers, one GM per section, etc.).

- [ ] **Step 4: Wire a temporary test button** on `/gm` stub calling `bowlAdjust('Gerry', -1, 'test')`; open `/wall` stub showing `useGameState('shared').bowl` in two browser tabs → tap → both update <1s. Remove button after.
- [ ] **Step 5: Commit** — `feat: realtime sync layer and domain actions`.

---

### Task 5: Wall shell — layout, Sidebar, Ticker

**Files:** Create `wall/WallPage.tsx`, `wall/Sidebar.tsx`, `wall/Ticker.tsx`; flesh out `styles.css`.

- [ ] **Step 1: WallPage layout** — CSS grid: `main-panel | sidebar (320px)` over `ticker (72px)`. Dark theme (`#0c0c10` bg). Renders the panel chosen by `director.wallFocus` (Task 6 panels; until then a placeholder), `<Sidebar/>`, `<Ticker/>`, `<MediaLayer/>` + `<AudioEngine/>` (Task 9 stubs). Full-bleed, `cursor:none` after 5s idle.
- [ ] **Step 2: Sidebar** — reads `shared`:
  - Bowl: huge number (96px font), label "THE HOPE TITAN", thin bar 0–60, pulse animation on change (keyed by value).
  - Bars: three horizontal bars with zone coloring (`zoneFor`), zone effect text under each (from `ZONE_EFFECTS`); when `enemyRetired`, render the Plate in the enemy slot: big black panel `value / threshold`, red glow as value/threshold > 0.8.
  - Dragon chits: 6 dragon glyphs (🐉 or SVG), dimmed when spent.
  - Timers: each active timer as `label + mm:ss` (uses `remainingSec` + 500ms interval tick), hourglass styled prominently.
- [ ] **Step 3: Ticker** — last 8 `ticker=true` events, newest first, fading by age; surge/breach/plate events styled big + colored. New-event slide-in animation.
- [ ] **Step 4: Verify in browser** (Claude Preview or Chrome): seed data renders; fire `bowlAdjust` from a second tab → number pulses, ticker scrolls.
- [ ] **Step 5: Commit** — `feat: wall shell with sidebar and ticker`.

---

### Task 6: Wall main panels (banners, breach, hex map, economy)

**Files:** Create the four panels + `hexGeometry.ts`.

- [ ] **Step 1: `hexGeometry.ts`** — flat constant from the reference layout (rows A–E, offsets: B/D start at col 0; A/C/E at col 0.5):

```ts
export type HexDef = { id:string; col:number; row:number; star?:boolean; rally?:boolean; start?:string }
const row = (ids:number[], r:number, off:number, extra:Partial<Record<number,Partial<HexDef>>> = {}) =>
  ids.map((n,i) => ({ id:String(n).padStart(2,'0'), col:off+i, row:r, ...extra[n] }))
export const HEXES: HexDef[] = [
  ...row([1,2,3,4,5], 0, 0.5, { 5:{star:true}, 2:{start:'T1'} }),
  ...row([6,7,8,9,10,11], 1, 0, { 9:{rally:true}, 8:{start:'T2'}, 11:{start:'T3'} }),
  ...row([12,13,14,15,16], 2, 0.5, { 13:{start:'T4'} }),
  ...row([17,18,19,20,21,22], 3, 0, { 19:{rally:true}, 20:{start:'T5'} }),
  ...row([23,24,25,26], 4, 0.5, { 23:{star:true}, 25:{start:'T6'} }),
]
export const HEX_R = 52
export const hexCenter = (h:HexDef) => ({ x: 80 + h.col * HEX_R * 1.9, y: 70 + h.row * HEX_R * 1.65 })
export const hexPoints = (cx:number, cy:number, r:number) =>
  Array.from({length:6}, (_,i) => { const a = Math.PI/180 * (60*i - 30)
    return `${cx + r*Math.cos(a)},${cy + r*Math.sin(a)}` }).join(' ')
```

- [ ] **Step 2: `BannersPanel`** — five large cards (HORRORS constant): name, emotion, GM, state badge. fighting = horror color border; bloodied = cracked overlay + desaturate; slain = dark + "ALL [EMOTION] IS LIFTED"; broken = red "COMPANY BROKEN". The Grey's card is intentionally colorless/flat. Marks count small at bottom.
- [ ] **Step 3: `BreachPanel`** — six section columns, each a 4-step vertical track HELD → MAGIC DOWN → WILL BROKEN → BREACHED with current step lit; breached = warm gold fill + glow animation (CSS keyframe, runs once via key on state). Skeleton margin: right rail listing posted skeletons (`§3 — "…meter text…"`). Children counter `x/22` top-right.
- [ ] **Step 4: `HexMapPanel`** — SVG ~1100×620 viewBox: polygons per `HEXES`. Uncleared = dark fill, faint id; cleared = lighter fill, full id. ★ gold stroke on exits, ⬡ dashed stroke on rallies. Icons as emoji text (🆘 distress, 🏮 lantern, 🤝 request) at hex top. Team markers: colored circles with T1–T6 at hex bottom, arranged side-by-side when co-located (collision = the doc's trade window — make it visible). Right rail: Pulse `BLUE n / GREY n` (ward-blue vs grey), Immune Response dial (0–10 arc, color ramps green→red, antibody warnings at 4/7/10 labeled), Lodestar/Bearer flags from ember census. Hex 26 with `glow` = animated green-gold radial.
- [ ] **Step 5: `EconomyPanel`** — the sidebar's content writ large (bowl giant, bars full-width, plate huge when active) for walkabout/muster scenes when no board is needed.
- [ ] **Step 6: Verify** — set `director.wallFocus` via SQL/console to each value; check all four render with seed + hand-poked state (e.g. set a team on hex 08, clear hex 02, breach section 3).
- [ ] **Step 7: Commit** — `feat: wall main panels (banners, breach board, hex map, economy)`.

---### Task 7: GM panel (chip select, bowl control, three block tabs, Betrayal calc)

**Files:** Create `gm/GmPage.tsx`, `gm/BowlControl.tsx`, `gm/Block1Tab.tsx`, `gm/Block2Tab.tsx`, `gm/Block3Tab.tsx`, `gm/BetrayalCalc.tsx`.

- [ ] **Step 1: `GmPage`** — if no `localStorage.gmName`: full-screen chip grid of `GM_NAMES` (+ tap-to-change later via header). Header: name, active block indicator, `<BowlControl/>` collapsed behind a "BOWL" button, mini-ticker (last 3 events). Tabs: B1 / B2 / B3 / CALC (default tab = `shared.activeBlock`). All buttons ≥56px tall — phone-first, big targets.
- [ ] **Step 2: `BowlControl`** — current value; buttons −3 −1 +1 / `+1d6` `+2d6` `+3d6` (rolls shown); required reason text field (button disabled until non-empty); recent-reason chips ('civilian saved','escort home','defiance','succumbed to 9','PC death').
- [ ] **Step 3: `Block1Tab`** — "MY HORROR" selector (defaults by GM name from HORRORS.gm); state buttons Fighting/Bloodied/Slain/Broken (confirm dialog on slain: shows the death-line reminder text); SURGE button (huge, horror-colored); MARK DEALT; quick-award buttons: "civilian saved +1d6", "Marked cleansed +2d6 (named)" with name prompt.
- [ ] **Step 4: `Block2Tab`** — "MY SECTION" selector (1–6 with names); ADVANCE STATE button showing current → next with confirm (on BREACH: fires `advanceSection`, reminds "+1d8 adjacent tables 1 round"); skeleton textarea + POST; CHILD DELIVERED (+ name field, shows x/22); BLOOD-KEY DEATH (dark button, confirm, silent); COUPLET COMPLETED (3 dropdowns: carried-by ×2 + spoken-at tables); DRAGON CALL (disabled when chits=0 or hourglass running — shows why).
- [ ] **Step 5: `Block3Tab`** — team selector (T1–T6); mini hex map (same SVG, tap hex = move my team; long-press/second-tap menu: cleared toggle, icons, glow-26); Pulse two number inputs + SET; Immune +/- with reason chips (`IMMUNE_REASONS`); ember census editor for my team (rows: player name + count stepper; tier badge auto via `emberTier`); ADVANTAGES list (five kinds, claimed shows player, unclaimed = claim with player-name prompt); GULLET: "WAVE HELD" / "BREAKER ESCAPED (+1 Plate)"; PLATE event buttons (from `PLATE_EVENTS`, visible only when plate active).
- [ ] **Step 6: `BetrayalCalc`** — units stepper → big stat readout (`betrayalStats`); reference text: stack-burn rule (save vs own DC, once per ally), come-home (burn all, half max HP), 0 HP = expelled stable stripped; pure client-side, no state writes.
- [ ] **Step 7: Verify on phone-sized viewport** — every action lands on wall in a second tab.
- [ ] **Step 8: Commit** — `feat: GM control panel (all three blocks + betrayal calculator)`.

---

### Task 8: Lead panel (director, bars, Plate console, day admin)

**Files:** Create `lead/LeadPage.tsx`, `lead/Director.tsx`, `lead/BarsControl.tsx`, `lead/PlateConsole.tsx`, `lead/DayAdmin.tsx`.

- [ ] **Step 1: `LeadPage`** — tab bar: DIRECTOR / BARS / TIMERS / SOUND / MEDIA / PLATE / ADMIN (+ link "open GM panel"). Same chip identity as /gm.
- [ ] **Step 2: `Director`** — wall-focus buttons (banners/breach/hexmap/economy/media) with live indicator; ACTIVE BLOCK switcher (1/2/3, confirm: "carries bowl, switches default tabs"); announcement composer: text + optional countdown (e.g. "THE DRAFT" + 12:00) → full-screen overlay on walls until cleared; backdrop picker (media library thumbnails + none).
- [ ] **Step 3: `BarsControl`** — three rows (morale/army/enemy): −10 −5 +5 +10, current value + zone chip; reason chips per bar per the runbooks (morale: 'BREACH','child delivered','couplet completed','PC death','swallowed soldier','section guttered'; army: 'rear rotation','clean hold','escaped breaker','soldier eaten','dragon lost'; enemy: 'section held at horn','gatekeeper drops PC','section state-change','arch-mage released'); zone-crossing announcement automatic (in `barAdjust`); RETIRE ENEMY BAR button (double confirm — plays Plate replacement on walls).
- [ ] **Step 4: `PlateConsole`** — set opening value + threshold inputs; ACTIVATE; all `PLATE_EVENTS` buttons large; history list (plate events from log).
- [ ] **Step 5: `DayAdmin`** — reset block (per key, double confirm), RESET DAY (type "RESET" to confirm); export event log → fetch all events → download .csv (`at,gm,action,payload`) — the end-of-day Tally readout.
- [ ] **Step 6: Verify + commit** — `feat: lead panel (director, bars, plate console, admin)`.

---

### Task 9: Timers + Dragon Call wiring + scene clock

**Files:** Create `lead/TimersControl.tsx`; extend `wall/Sidebar.tsx` (already renders timers), `lib/actions.ts` (already has timer actions); add `SCENE_LISTS` to `types.ts`.

- [ ] **Step 1: `SCENE_LISTS`** in types.ts — per block, `{ label, minutes }[]` straight from the three runbooks (B1: Muster 10 / Blessings 25 / Vigil+Draft 45 / Domains 30 / Battle 45 / March 15; B2: Same Morning 10 / Blessings 20 / March+Runes+Trap 50 / Breaching 80 / Gate Stands Open 15; B3: Vigil 10 / Last Stations 20 / Dive 10 / B9 Hex Crawl 35 / Descent+Unveiling 10 / Battle+Sixth Fire 70 / Endings+Tally 25).
- [ ] **Step 2: `TimersControl`** — preset buttons: HOURGLASS 15:00 (one-shot), REAR TIDE 15:00 (repeating), GULLET WAVE 12:00 (repeating, meta alternates "Table 5"/"Table 6" each roll), DRAFT 12:00, BATTLE STATIONS 3:00, custom (label+minutes). Per-timer: pause/resume/cancel, optional completion sound (clip picker). Scene clock: current scene + elapsed vs budget, ADVANCE SCENE button.
- [ ] **Step 3: Repeating roll + expiry behavior** — in WallPage, a 1s effect watches timers: on expiry of a repeating timer, call `timerRollRepeating(id, endsAt, durationSec)`; the single RPC winner logs the event ('REAR TIDE — the host moves. Blood or Hope?' / 'GULLET WAVE n — Table X') and fires its completion sound locally via the audio bus (Task 10). Non-repeating expiry: event + sound, timer auto-removed after 60s display at 0:00.
- [ ] **Step 4: Dragon Call already wired** in actions (chit−1 + hourglass start + announcement); add the REAR TIDE answer buttons (Blood / Hope) to lead Timers tab; Hope disabled with reason until Titan reach restored (lead toggles "Titan severed" flag — add `titanSevered: boolean` to shared, set by director block-2 controls, displayed as a pounding-fist badge on the wall sidebar).
- [ ] **Step 5: Test** — vitest: gullet alternation logic (pure helper `nextGulletMeta`); manual: start rear tide at 0:05 duration in two wall tabs → exactly one 'tide' event logged per cycle (race safety).
- [ ] **Step 6: Commit** — `feat: timers, scene clock, dragon call + rear tide + gullet wiring`.

---

### Task 10: Audio engine + soundboard + media

**Files:** Create `wall/AudioEngine.tsx`, `wall/panels/MediaLayer.tsx`, `lead/Soundboard.tsx`, `lead/MediaLibrary.tsx`.

- [ ] **Step 1: `AudioEngine`** (mounted on wall only) —

```tsx
// Core behavior:
// - one shared AudioContext + GainNode (masterGain from state.audio)
// - "ENABLE AUDIO" badge until first user tap (ctx.resume()); persist unlocked flag per session
// - loops: for each state.audio.playing entry, fetch+decode clip (cache decoded buffers),
//   create ABSN with loop=true, start(0, loopOffsetSec(startedAt, buffer.duration)) so every
//   TV is in phase; stop+disconnect when entry removed; re-sync drift every 60s (restart at offset)
// - one-shots: supabase.channel('audio-bus').on('broadcast', {event:'oneshot'}, ({payload}) => playOnce(payload.clipId))
// - per-clip gain * masterGain
```

- [ ] **Step 2: `Soundboard`** — upload (file input → `uploadClip`, tag loop/oneshot at upload, name editable); library list: loops with PLAY/STOP (and "playing" badge driven by state), one-shots with FIRE; per-clip gain slider; master volume slider; suggested starter set note (short horn, two horns, long horn, low horn, dragon, drumbeat, marching loop).
- [ ] **Step 3: `MediaLayer`** (wall) — when `director.wallFocus==='media'` and `mediaId`: fullscreen `<img>` or `<video autoplay loop muted playsInline>`; when `backdropId` set and focus ≠ media: same element absolutely positioned behind main panel at 25% opacity. Preload current + backdrop.
- [ ] **Step 4: `MediaLibrary`** (lead) — upload images/videos, thumbnail grid, SHOW FULLSCREEN / SET BACKDROP / CLEAR buttons.
- [ ] **Step 5: Verify** — upload a test mp3 loop + a horn + an image + a short mp4; two wall tabs: loop audibly in phase (start one tab 30s late → still in phase); one-shot fires on both; video loops muted fullscreen.
- [ ] **Step 6: Commit** — `feat: synchronized audio engine, soundboard, media scenes`.

---

### Task 11: Polish pass

**Files:** Modify `styles.css`, panels.

- [ ] **Step 1: Ceremony animations** — BREACH: section column flashes warm gold, room-wide 2s vignette; Plate retirement: enemy bar slides out / black plate slides in with temperature-drop color shift; hex 26 glow: slow green-gold radial pulse; bowl changes: scale-pulse + floating ±n; surge: full-ticker takeover banner in horror color for 4s; announcement overlay: huge serif text + countdown.
- [ ] **Step 2: TV legibility audit** — view wall at 1920×1080 from-across-the-room squint test: bowl number, bar zones, timer digits, hex ids, team markers all readable. Bump anything under ~24px effective.
- [ ] **Step 3: Wall idle styling** — hide cursor, `wake lock` via `navigator.wakeLock?.request('screen')` (TVs must not sleep), reconnect banner when realtime stale >30s (compare last poll time).
- [ ] **Step 4: Commit** — `feat: polish (ceremony animations, legibility, wake lock)`.

---

### Task 12: Deploy + end-to-end dry run

- [ ] **Step 1: Build clean** — `npm run build` → no TS errors. `npm test` → green.
- [ ] **Step 2: Deploy** — Vercel MCP `deploy_to_vercel` (project `oracle-ops`); set env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` on the project; redeploy; verify production URL.
- [ ] **Step 3: Multi-device smoke** — production URL: one laptop tab as `/wall`, phone as `/gm`, second phone/tab as `/lead`. Run the script: pick GM → bowl −1d6 → surge Kaervox → bloodied → advance section to BREACH → child delivered → dragon call (hourglass appears everywhere, chit 6→5) → switch block 3 → move team T2 to hex 08 → clear hex → immune +1 → plate activate → plate +1 → play loop → fire horn → media fullscreen → announcement with countdown → export log CSV.
- [ ] **Step 4: Reset day** for Sunday; hand the user the three URLs + a one-page setup note (TV setup: open URL, fullscreen F11, tap ENABLE AUDIO; phones: open /gm, pick name).
- [ ] **Step 5: Commit + tag** — `chore: deploy config` · `git tag sunday-v1`.

---

## Self-review notes

- **Spec coverage:** wall (§5) → Tasks 5–6, 10–11; GM panel (§6) → Task 7; lead (§6) → Tasks 8–10; data model (§4) → Tasks 2–4; audio/media (§7) → Task 10; timer wiring (§8) → Task 9; failure handling (§9) → Tasks 4 (poll fallback), 11 (stale banner, wake lock); deploy (§10) → Task 12. Cut items (secret tally, grey ledger) absent by design.
- **Known simplifications (accepted):** array fields use read-modify-write (single natural writer per array); per-scene-per-table Dragon Call limit is GM-honor-system (hourglass lock enforces the hard rule); TV audio-status heartbeat dropped (walls show their own unlock badge; rooms have humans).
- **Type consistency:** action names in Task 4 match consumers in Tasks 7–9; `Timer`, `Section`, `Clip`, `MediaItem` defined once in Task 3.
