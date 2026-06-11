# Oracle Ops — Design Spec

**Date:** 2026-06-12 · **Event:** "The Fall of Neth" D&D convention epic, Sunday 2026-06-14
**Goal:** Replace the GM-side physical bookkeeping of a three-block, 36-player, 6-GM epic with a shared real-time control panel and synchronized TV displays across multiple rooms.

## 1. Context

The epic runs three blocks in one day (10:30 AM "Battle of the Five Flames", 2:30 PM "Walls of Flesh", 6:30 PM "Neth the Undying" including the Folded Flesh hex crawl). The source documents define a heavy physical kit: status banners, a 60-die Hope Titan bowl, three zoned progress bars, a six-section Breach Board, an Hourglass, Dragon Call chits, a 26-hex wall map, the Plate (0–25 doom counter), an Immune Response dial, and a battery of timers and horn calls.

Three TVs sit in **different rooms**. All TVs show the **same synchronized view** — the display IS the sync mechanism between rooms. Six GMs control shared state simultaneously from their phones.

## 2. Goals / Non-Goals

**Goals**

- Single source of truth for all shared game state, updated live by any GM, visible in every room.
- Replace: status banners, bowl, bars, Breach Board + skeleton margin, Plate, hex map, Immune Response dial, Dragon Call chits, children count, all timers.
- Synchronized audio: uploaded ambience loops and one-shot horns/stingers playing through all TVs simultaneously, triggered remotely.
- Zero authentication. Access control = nobody projects the GM URL.
- Survives refresh, crash, dead phone, dropped Wi-Fi (state in DB, clients reconnect).
- Bowl count carries across blocks automatically.

**Non-Goals (explicitly cut)**

- Warmaster's secret tally (cut by user). The Plate's 6:30 opening count is set manually.
- Grey Ledger / theft-slip resolver (cut by user — handled on paper/silently as written).
- Player-facing interactivity. Players only ever look at TVs.
- Replacing player-held props: score sheets, Mark cards, embers, letters, child tokens, rumor cards, consent cards stay physical.
- Per-TV channel assignment (all TVs mirror one view).

## 3. Architecture

- **Frontend:** React + Vite + TypeScript, static build deployed to **Vercel**. One app, three routes.
- **Backend:** **Supabase** — Postgres for state, Realtime (postgres_changes + broadcast) for sync, Storage for uploaded audio files.
- **No auth.** Supabase anon key with RLS policies allowing read/write on the two game tables and the audio bucket. URLs are unlisted.
- **Identity:** on first load of `/gm` or `/lead`, the GM picks a name chip (Gerry, Bela, Bernard, Jonathan, Wilson, Ali). Stored in localStorage. Used only to label the event log.

### Routes

| Route | Device | Purpose |
| --- | --- | --- |
| `/wall` | All 3 TVs (browser fullscreen) | Mirrored spectacle/status display + audio playback |
| `/gm` | Each GM's phone | Block-tabbed control panel |
| `/lead` | Lead GM's phone/tablet | Everything in `/gm` + scene director, timers/horns, soundboard, Plate console, day admin |

## 4. Data Model

Two tables + one storage bucket.

```sql
-- Singleton-ish state rows, one per namespace
create table state (
  key text primary key,        -- 'shared' | 'block1' | 'block2' | 'block3' | 'director' | 'audio'
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Append-only log; powers the ticker and the end-of-day tally
create table events (
  id bigint generated always as identity primary key,
  at timestamptz default now(),
  gm text,
  action text not null,        -- machine tag, e.g. 'bowl.add', 'breach.advance', 'hex.clear'
  payload jsonb,               -- delta, reason, names
  ticker boolean default true  -- false = silent log entry (e.g. blood-key)
);
```

Storage bucket `audio`: uploaded files, public read. Metadata (name, type loop/oneshot, gain) lives in `state.audio`.

### State shapes (abridged)

- `shared`: `{ bowl: number, activeBlock: 1|2|3, bars: { morale, army, enemy|null }, plate: { value, threshold, retiredEnemyBar } , dragonChits: number, timers: { hourglass, rearTide, gullet, scene }[] }`
- `block1`: `{ horrors: { kaervox|shepherd|mournweight|maw|grey: 'fighting'|'bloodied'|'slain'|'broken' }, surgesFired: [...] }`
- `block2`: `{ sections: [{ id: 1..6, name, state: 'held'|'magicDown'|'willBroken'|'breached', skeletonPosted: bool, skeletonText }], children: { delivered: number, named: string[] } }`
- `block3`: `{ hexes: { '01'..'26': { cleared, icons: ['distress'|'lantern'|'request'], glow } }, teams: { t1..t6: hexId }, pulse: { blue, grey }, immune: 0..10, advantagesTaken: { bankedAnswer?: player, ... }, lodestars: [...] }`
- `director`: `{ wallFocus: 'banners'|'breach'|'hexmap'|'economy'|'media', media: { activeId: string|null, mode: 'fullscreen'|'backdrop' }, announcement: string|null }`
- `audio`: `{ library: [{ id, name, url, kind: 'loop'|'oneshot', gain }], playing: [{ id, startedAt, loop }], masterGain }`
- `media` (in `state.audio`-style namespace or its own row): `{ library: [{ id, name, url, kind: 'image'|'video' }] }` — videos always loop, muted (audio comes from the soundboard)

Timers are stored as `{ id, label, endsAt | startedAt+duration, repeating?, paused? }` — clients render countdowns from server timestamps, so all rooms agree to the second.

## 5. The Wall (`/wall`)

One layout, mirrored on all TVs, designed for across-the-room legibility:

- **Main panel** (~70% of screen) — set by scene director:
  - **Banners** (Block 1): five Horror cards with state (Fighting / Bloodied / Slain / Broken) in their colors (the Grey's card deliberately colorless).
  - **Breach Board** (Block 2): six sections × HELD → MAGIC DOWN → WILL BROKEN → BREACHED, plus the skeleton margin listing each posted keyhole couplet (text entered by GMs). A BREACH flips that section warm gold with a room-wide flash + horn.
  - **Media scene**: an uploaded image or looping video, fullscreen. Any other focus may optionally layer over a media **backdrop** (dimmed behind the panel).
  - **Hex map** (Block 3): SVG hex grid in the reference layout (rows A 01–05★ / B 06–11 / C 12–16 / D 17–22 / E 23★–26), fog tiles that pull away when cleared, six colored team markers, distress / guttered-lantern / request icons, ⬡ rally and ★ exit marks, blue/grey Pulse totals, Immune Response dial, hex 26 green-gold glow effect when witnessed.
- **Sidebar** (always visible, every block): Hope Titan bowl level (large number + bar), the three bars with zone colors (Morale gold / Army ward-blue / Enemy black), Dragon Call chits remaining, active timers (Hourglass, Rear Tide, Gullet wave, scene clock).
  - At 6:30 the ENEMY bar plays a retirement animation and is replaced by **the Plate** (current / threshold, large, black).
- **Ticker** (bottom strip): scrolling/stacking announcements from the event log ("KAERVOX SURGES — whole room +1 Wrath", "BREACH — Section 3: THE FURNACE", "+1d6 → Titan: civilian saved (rolled 4)").
- **Audio engine**: the wall page plays the synchronized soundboard (see §7). One manual tap on each TV at setup ("Enable audio") to satisfy browser autoplay policy; thereafter fully remote.

## 6. Control Panels

### `/gm` — every GM

Common header: bowl +/− (with d6 roller for "+1d6" awards; a one-line reason required, feeding the ticker), event ticker preview, block tabs.

- **Block 1 tab:** set my Horror's banner state; SURGE button (ticker + horn + room contagion text); Bloodied (+1d6 bowl, two-horn sound) and Slain (+3d6 bowl, long horn + death-line prompt); Mark dealt counter; civilian saved (+1d6); Marked-player-cleansed (+2d6, named).
- **Block 2 tab:** advance my section's state (confirm step; BREACH triggers gold flash + adjacency buff reminder "+1d8 adjacent tables, 1 round"); post/edit my skeleton text to the margin; child extracted/delivered (+2 bowl, name field, x/22 counter); blood-key death (bowl −1, **silent** log, no ticker); couplet completed (+1d6, three-table announcement template); Dragon Call (see §8).
- **Block 3 tab:** move my team marker (tap destination hex); toggle hex cleared / icons; Pulse blue/grey set (Hex 01 reward); Immune Response +/− with reason chips (combat, theft, horn, Mouth fed, stuck / regret accepted, generous solve, Scar retold) — auto-posts the dial; ember census per team (player count → auto-flags Kindled 3+/Lodestar 5+/Bearer 7+, Lodestars shown on wall as rally points); Taken Advantages claim list (enforces one-per-player, five types); Gullet wave resolved / breaker escaped (Plate +1); Plate event buttons (PC to 0 / death / succumb / toll lands / 5th+ slot / Aspect down / Master freed / Orsovath / grey returned / Plate drunk −3).
- **Betrayal calculator** (Block 3): input units held → outputs +2×u to d20s, +1×u save DC, +5×u damage, +30×u HP; stack-burn and come-home math shown.

### `/lead` — lead GM (Voice / Warmaster / Deep Voice)

Everything above, plus:

- **Scene director:** set wall main-panel focus; switch active block (carries bowl, retires/restores bars); push a full-screen announcement (e.g. THE DRAFT — 12:00 countdown, BATTLE STATIONS — 3:00); **media scenes** — upload images/videos (drag/drop → Supabase storage), push any one fullscreen or as a dimmed backdrop behind the current panel; videos loop muted (sound comes from the soundboard).
- **The bars:** Morale / Army / Enemy +/− controls with each block's rise/fall reasons as quick chips (e.g. Morale: "BREACH", "child delivered", "PC death"; Army: "clean hold", "escaped breaker", "dragon lost"). Zone boundaries per the runbooks; every zone-crossing auto-announces on the ticker ("ARMY falls to RED — corridor capacity halves") and the wall shows the active zone's mechanical effect beside each bar. At 6:30 the ENEMY bar's retirement is a director button (plays the replacement animation, brings in the Plate).
- **Timers & horns:** start/pause/reset Hourglass, Rear Tide (repeating 15 min, fires low-horn + ticker each cycle), Gullet wave (~12 min, alternating table label), scene clock with each block's runbook scene list and budgets. Each timer can fire a sound on completion.
- **Soundboard:** upload audio (drag/drop → Supabase storage); tag loop/one-shot; set per-clip gain; play/stop loops (marching, Titan drumbeat, flesh ambience); fire one-shots (short horn, two horns, long horn, dragon shriek); master volume. All playback synchronized across TVs via realtime broadcast.
- **Plate console (6:30):** set opening count + threshold (default 25); all rise/fall buttons; the Plate's every move is announced ("dread you can calculate breeds heroism").
- **Day admin:** reset block / reset day (double-confirm); export event log (the end-of-day Tally readout).

## 7. Audio System

- Files upload to Supabase Storage; library metadata in `state.audio`.
- **Loops** (ambience): play/stop commands written to `state.audio.playing` with `startedAt` server timestamp; wall clients compute offset (`(now - startedAt) % duration`) so even a TV that reloads mid-loop rejoins in phase. Multiple loops may layer.
- **One-shots**: realtime broadcast event; each wall plays immediately (sub-second skew across rooms is acceptable for horns).
- Wall page shows a small "🔇 tap to enable audio" badge until unlocked; lead panel shows each TV's audio status (walls heartbeat their state).

## 8. Timer Wiring (the linkages)

- **Dragon Call** (any GM, once per scene per table, while chits remain): decrements chit count, fires dragon one-shot + ticker ("DRAGON STRIKE — Table 4 calls the Blue"), and **auto-starts the Hourglass (15:00)** on every wall. While the Hourglass runs, Dragon Call buttons are locked (the Hourglass is "the only judge"). Chits never replenish; remaining chits at day's end are the dragons left for 6:30.
- **Rear Tide** (Block 2): repeating 15:00; each expiry fires the low horn + ticker prompting the Blood-or-Hope answer; lead taps which answer was made (logs rotation count toward "4+ = Vane survives").
- **Gullet waves** (Block 3): repeating ~12:00, alternating "Table 5" / "Table 6" labels, wave-number escalation displayed.
- **Scene clock:** per-block scene list from the runbooks with target durations; lead advances scenes; wall shows current scene + elapsed.

## 9. Failure Handling

- All state in Postgres; clients are stateless renderers. Reconnect = re-fetch + resubscribe.
- Supabase Realtime drop: clients poll `state` every 10s as fallback; banner on wall if stale >30s.
- Two GMs tapping at once: all mutations are server-side via Supabase RPC functions (`bowl_adjust`, `advance_section`, …) doing atomic jsonb updates — last-write race limited to single fields, increments are atomic.
- Phone dies: any other phone picks the same GM chip and continues.
- Internet dies mid-block: walls keep last state + local countdowns; play continues on paper as the docs already allow; state resumes on reconnect.

## 10. Build & Deploy Plan

1. Scaffold Vite + React + TS; Supabase project, tables, RLS, RPCs, storage bucket.
2. Core sync layer (state hook + events + realtime).
3. Wall: sidebar (bowl/bars/Plate/timers/chits) + ticker.
4. Wall main panels: banners → Breach Board → hex map.
5. GM panel tabs (1, 2, 3) + Betrayal calculator.
6. Lead panel: director, timers, Plate console, day admin.
7. Audio + media: uploads, library, loop sync, one-shots, image/video scenes.
8. Polish pass: animations (BREACH gold, Plate retirement, hex 26 glow), legibility at TV distance.
9. Deploy to Vercel; load-test with 6 phones; dry-run script of one block.

Testing: Playwright smoke of all three routes; manual multi-tab sync test (two browsers + one wall); timer-skew check across two machines.
