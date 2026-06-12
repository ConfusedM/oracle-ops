# Oracle Ops — Handover Document

*Last updated: 2026-06-13 (the Friday before the event). Event: "The Fall of Neth" D&D convention epic, **Sunday 2026-06-14** at GuildHall.*

---

## 1. What this is

Oracle Ops is the shared digital control panel for a three-block, 36-player, 6-GM, all-day D&D epic. It replaces the physical GM kit — status banners, the Hope Titan dice bowl, the three morale bars, the Breach Board, the Plate doom-counter, the 26-hex wall map, the Hourglass, and all horns/timers — with synchronized screens. Three TVs in three different rooms mirror one wall display; GMs drive everything from their phones. There are **no logins** — access control is "don't put the GM URL on a TV."

The game content lives in four Word docs in `C:\Users\gerry\GHEPIC\` (Epic 1030AM / 230PM / 630PM Game.docx + Hex Map Reference.docx). The app models those documents' mechanics exactly.

## 2. URLs

| What | URL |
| --- | --- |
| **Live app** | https://confusedm.github.io/oracle-ops/ |
| TV wall (all rooms, mirrored) | https://confusedm.github.io/oracle-ops/#/wall |
| GM phones | https://confusedm.github.io/oracle-ops/#/gm |
| Lead GM panel | https://confusedm.github.io/oracle-ops/#/lead |
| GitHub repo (public) | https://github.com/ConfusedM/oracle-ops |
| Supabase project | `oracle-ops`, ref `ouiqyobfxevjxydapeyt`, region ap-southeast-1 |

**GitHub Pages caches `index.html` for ~10 min.** After any deploy, hard-refresh (Ctrl+F5) every open screen or you'll see the previous build.

## 3. Game-day runbook (Sunday)

**Before doors (~20 min):**
1. Each TV: open the wall URL in a browser → `F11` fullscreen → **tap "ENABLE AUDIO" once** (browser rule; after that it's remote-controlled). The page requests a screen wake-lock, but ALSO disable the TV/PC's own sleep timer.
2. Each GM: open the GM URL on their phone → tap their name (Gerry / Bela / Bernard / Jonathan / Wilson / Ali). Wrong name? Tap it in the header to re-pick.
3. Lead GM: open `/#/lead`. Upload horn sounds + ambience loops in **SOUND** (tag one-shot vs loop at upload), scene images/looping videos in **MEDIA**. Suggested kit: short horn, two horns, long horn, low horn, dragon shriek, Titan drumbeat (loop), marching soldiers (loop).
4. **ADMIN → ⚠ RESET THE ENTIRE DAY** (type `RESET`). This clears all rehearsal data and sets HOPE to 60. *Do this last, after everyone's connected.*

**During play, the per-block cheat sheet:**
- **Always:** HOPE +/− lives behind the HOPE button on every GM's header. A reason is required — it announces on the ticker in every room ("announce what bought it" is enforced by software). `+1d6/+2d6/+3d6` buttons roll for you.
- **Block 1 (10:30):** each Horror GM sets their banner state (Bloodied/Slain auto-award 1d6/3d6 HOPE and play the ceremony), fires SURGE for room-wide contagion, counts Marks. Lead switches the wall between BANNERS and ECONOMY.
- **Block 2 (2:30):** section GMs advance HELD → MAGIC DOWN → WILL BROKEN → BREACHED (breach = gold flash + 2d6), post keyhole skeletons to the margin, log children (x/22), blood-key deaths (silent −1), couplets (+1d6). **Dragon Call** consumes a chit and auto-starts the 15:00 Hourglass everywhere; further calls lock until it expires. Lead runs the repeating REAR TIDE (15 min) and answers Blood/Hope; mark **TITAN SEVERED** when the rear wall rises (blocks Hope-spends until restored). Bars are on the lead panel with reason chips; zone crossings self-announce with their rule.
- **Block 3 (6:30):** lead: BARS → **RETIRE ENEMY BAR**, then PLATE → set opening count (from your paper tally — the app deliberately doesn't track the secret tally) and threshold (default 25, calibration rule in the runbook doc). GMs: move teams on the hex map (tap mode chips: MOVE / CLEAR / icons / ✨26), ember census per player (Kindled/Lodestar/Bearer auto-flagged on the wall), Immune Response with reason chips, Taken Advantages (one per kind, enforced), Gullet waves, Plate event buttons. **CALC tab** = Betrayal stack math for the Standing.
- **End of day:** ADMIN → EXPORT EVENT LOG (CSV) = the Tally readout.

**If the internet dies:** walls freeze with a red banner and keep their last state; run on paper; everything resumes on reconnect. Any phone/TV can die and rejoin — state lives in the database, nothing lives on devices.

## 4. Architecture

- **Frontend:** Vite + React 19 + TypeScript SPA, hash-routed (`/#/wall`, `/#/gm`, `/#/lead`). Hosted as static files on **GitHub Pages** (gh-pages branch). *Vercel was the original plan but its MCP can't deploy and the CLI wasn't logged in; switching later is trivial — it's a static build.*
- **Backend:** Supabase — Postgres + Realtime + Storage. **The Supabase project is SHARED with an unrelated app** (an agent-board system, ~80 tables). Everything Oracle Ops owns is prefixed **`oo_`**: tables `oo_state`, `oo_events`; RPCs `oo_state_merge`, `oo_state_set_path`, `oo_state_increment`, `oo_timer_roll`, `oo_server_now`; storage buckets `oo-audio`, `oo-media`. Don't touch anything un-prefixed.
- **Data model:** `oo_state` holds 7 jsonb rows (`shared`, `block1`, `block2`, `block3`, `director`, `audio`, `media`); `oo_events` is the append-only log that powers the ticker and the Tally export. All client mutations go through `src/lib/actions.ts` — UI components never call Supabase directly.
- **Sync:** Supabase Realtime (postgres_changes) with a 10-second polling fallback; wall shows a stale banner after 30 s without sync. Timers store server timestamps (`endsAt`); clients render countdowns against a server-clock offset (`oo_server_now`), so all rooms agree to the second. Repeating timers and expiries use a compare-and-swap RPC (`oo_timer_roll`) so exactly **one** client per cycle announces/plays the horn — no duplicates with 3 TVs.
- **Audio:** wall pages run a WebAudio engine. Loops are phase-locked via their `startedAt` timestamp (a TV that reloads mid-loop rejoins in phase). One-shots ride a realtime broadcast channel (`oo-audio-bus`). Per-clip gain + master gain in state.
- **Auth/keys:** none. The anon publishable key is in `.env.local` (gitignored) and baked into the build — it's public by design:
  - `VITE_SUPABASE_URL=https://ouiqyobfxevjxydapeyt.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=sb_publishable_NIKqKst9qIr_0HdtHjQNoQ_eInRT-Vi`

## 5. Codebase map

```
oracle-ops/
  src/lib/        types.ts (ALL state shapes + game constants: horrors, sections,
                  scene lists, plate events, immune reasons), rules.ts (pure logic,
                  tested), time.ts (server clock), useGameState/useEvents (sync),
                  actions.ts (every mutation + ticker text — the only DB writer)
  src/wall/       WallPage (layout), Hud.tsx (HOPE orb + game bars), Sidebar
                  (scene/chits/timers), Ticker, AudioEngine (loops/one-shots/timer
                  expiry), panels/ (Banners, Breach, HexMap + hexGeometry, Economy,
                  MediaLayer)
  src/gm/         GmPage (name chips + tabs), BowlControl (HOPE), Block1/2/3 tabs,
                  BetrayalCalc
  src/lead/       LeadPage tabs: Director, BarsControl, TimersControl, Soundboard,
                  MediaLibrary, PlateConsole, DayAdmin
  src/assets/     sliced Envato art (frame-gold-l/m/r.png, orb-frame.png, scene-frame.png)
  assets-envato/  (GITIGNORED, local only) raw licensed Envato packs + .json license
                  sidecars + the slicing scripts: process.py (trim/slice), punch.py
                  (remove baked-in shine), contact.py / preview.py (contact sheets)
  tests/          vitest: rules + time (npm test — 12 tests)
  supabase/       README (schema lives in applied migrations: oracle_ops_init,
                  oracle_ops_seed, oracle_ops_grants)
  docs/superpowers/  the original design spec + implementation plan
```

## 6. Develop & deploy

```bash
cd C:\Users\gerry\GHEPIC\oracle-ops
npm run dev        # http://localhost:5173  (needs .env.local — see §4 for values)
npm test           # vitest (12 tests)
npm run build      # tsc --noEmit && vite build → dist/

# Deploy (GitHub Pages = push built dist to gh-pages):
cd dist && git init -b gh-pages && git add -A && git commit -m deploy \
  && git push -f https://github.com/ConfusedM/oracle-ops.git gh-pages \
  && cd .. && rm -rf dist/.git
git push origin main   # keep source in sync
```

DB changes go through the Supabase MCP (`apply_migration` on project `ouiqyobfxevjxydapeyt`) — keep the `oo_` prefix and remember new tables need explicit `GRANT` to `anon` (this project has non-default privileges; that bit me once already).

## 7. Design system (the current look)

Dark-fantasy game HUD, iterated from "engineer dashboard" after Gerry's feedback:
- **Fonts:** Cinzel (titles/numbers), IM Fell English italic (flavor text), via Google Fonts `<link>` in index.html.
- **HUD band** (always visible, every wall view): the **HOPE orb** — golden winged ring (Envato *UI Game Frames* #40) around a ward-blue liquid orb that visibly drains/refills with the count, never call it "the bowl" in UI copy — plus three **classic HP-style bars** in ornate gold frames (Envato *UI Game Elements* #27, 3-sliced: caps + stretchable middle, baked-in shine removed by `punch.py`). MORALE gold / ARMY blue / ENEMY red fills, segment ticks, value centered, zone gem + zone rule on the right. At 6:30 ENEMY is replaced by THE PLATE (red ember fill, throbs above 80%).
- The frame art's mouth sits at **32.5% top / 19% bottom** of its height — `.gb-well`'s inset matches; if you swap frame art, re-measure (script pattern in `assets-envato/punch.py`).
- A silver "iron" frame variant was tried for ENEMY/Plate and **rejected** (its ribbon flourishes smear into pale streaks at bar height — `gb-iron` now intentionally reuses the gold art, only fill colors differ).
- More frames available: contact sheets at `assets-envato/previews/SHEET-*.jpg` (40 frames, 30 banners).

## 8. Known quirks & gotchas

1. **Pages cache:** ~10 min of stale `index.html` after deploys. Ctrl+F5.
2. **Old event texts** in the DB from before renames say "bowl" — cosmetic, history only; the day reset doesn't clear `oo_events` (by design, it's the permanent log). If you want a clean ticker for Sunday, truncate it: `delete from oo_events;` via SQL.
3. **Audio is functionally untested with real files** — the engine, upload, and sync are verified, but no one has *listened* yet. Upload a horn and test on a real TV before Sunday.
4. **Storage deletes:** anon can upload but not delete bucket objects (no delete policy, intentional). Deleting a clip in the UI removes it from the library; the file stays in the bucket (harmless orphan). There's one orphan `policy-test.txt` in `oo-audio` from testing.
5. **Director MEDIA focus with nothing selected** falls back to the Economy view (a blank-wall bug fixed by guard, not by preventing the selection).
6. **Dragon Call "once per scene per table"** is honor-system; the hard rule (locked while the Hourglass runs, 6 chits/day) is enforced.
7. **The shared Supabase project's OTHER app has RLS disabled on its 80 tables** — pre-existing, not ours, but anyone with the project's anon key can read that app's data. Worth fixing someday, unrelated to the epic.
8. **Plate opening count is manual** — the Warmaster's secret tally and the Grey Ledger were deliberately cut (Gerry's call); keep those on paper.
9. Local dev preview config lives at `GHEPIC/.claude/launch.json` (`npm --prefix oracle-ops run dev`, port 5173).
10. The state currently in the DB is **rehearsal data** from testing/exploration. RESET THE ENTIRE DAY before the muster.

## 9. Possible next steps (none blocking Sunday)

- Matching Envato frame treatment for the Breach Board / hex map rail / sidebar panels (assets already downloaded).
- Real horn/ambience files uploaded + a full one-block dry run with two phones and a TV.
- `oo_events` truncate before doors for a clean ticker.
- Move hosting to Vercel if Pages caching annoys (requires `vercel login`, then it's one command).
- Per-Horror surge sounds (the soundboard supports per-timer completion sounds already; surges currently announce text-only).
