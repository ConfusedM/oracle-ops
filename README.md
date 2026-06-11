# 🔮 Oracle Ops

Shared real-time GM control panel for **The Fall of Neth** — a three-block, 36-player, 6-GM D&D convention epic. Replaces the physical bookkeeping kit (status banners, the Hope Titan bowl, the three bars, the Breach Board, the Plate, the hex map, the Hourglass, horns) with synchronized screens in every room.

**Live:** https://confusedm.github.io/oracle-ops/

| Route | Who | What |
| --- | --- | --- |
| [`/#/wall`](https://confusedm.github.io/oracle-ops/#/wall) | The TVs (all rooms, mirrored) | Banners / Breach Board / Hex Map / Economy + bowl, bars, Plate, chits, timers, ticker, audio |
| [`/#/gm`](https://confusedm.github.io/oracle-ops/#/gm) | Every GM's phone | Block-tabbed controls + Betrayal calculator |
| [`/#/lead`](https://confusedm.github.io/oracle-ops/#/lead) | Lead GM | Scene director, bars, timers, soundboard, media, Plate console, day admin |

## Game-day setup (5 minutes)

1. **Each TV**: open the wall URL in a browser → `F11` fullscreen → tap **ENABLE AUDIO** once. Done — it's remote-controlled from here on.
2. **Each GM**: open the GM URL on your phone → tap your name. (Wrong name? Tap it in the header to re-pick.)
3. **Lead GM**: open the lead URL. Upload your horn sounds + ambience in SOUND, scene images/video in MEDIA, before doors.
4. Before the muster: lead → **ADMIN → RESET THE ENTIRE DAY** (clears rehearsal data, bowl back to 60).

No passwords anywhere. The only rule: don't put the `/#/gm` or `/#/lead` URL on a TV.

## How the day flows

- **Bowl** carries across blocks automatically. Every change requires a reason and announces itself on the ticker in every room.
- **Dragon Call** (GM B2 tab or lead TIMERS): consumes a chit, fires the announcement, auto-starts the 15:00 Hourglass on every wall, and locks further calls until it runs out. Chits never refill — what's left at night is the flight for 6:30.
- **Rear Tide / Gullet** are repeating timers (lead → TIMERS); each cycle announces itself, exactly once, on every screen.
- **6:30**: lead → BARS → **RETIRE ENEMY BAR**, then PLATE → set the opening count from your paper tally and activate. Every Plate movement is announced — dread you can calculate breeds heroism.
- **Audio**: loops (marching, drumbeat) stay in phase across rooms even if a TV reloads mid-loop; one-shots (horns) fire everywhere within a second.
- **If the internet dies**: walls freeze on the last known state with a red banner; play continues on paper; everything resumes on reconnect. Any phone/TV can die and rejoin — state lives in the database.

## Stack

Vite + React + TypeScript on GitHub Pages · Supabase (Postgres + Realtime + Storage) for state, events, and uploads. Supabase project `oracle-ops` (shared — everything here is prefixed `oo_`). `npm run dev` to develop, `npm test` for the rules tests, deploy = build + push `dist` to `gh-pages`.
