# Horror TCG Cards — Wall Display Design

Date: 2026-06-12
Status: Approved (Approach A — layered render)

## Goal

Replace the five Horror banners on the wall display (`BannersPanel`) with trading
cards built from the GraphicRiver "Trading Card Game Creator Vol 11 — Horror"
PSD assets, keeping all live game state (horror state, marks) as HTML overlays.

## Source assets

- `graphicriver-k9saayBI-trading-card-game-creator-vol-11-horror/Card-front.psd`
  (750×1050, layered: background, art window 133,155–618,683, wooden name plate
  with teeth, description area, card class line, skull rarity pips, stat orbs,
  lanterns/sparks/fog foreground)
- Licensed via Envato subscription (license sidecar to be kept alongside
  extracted assets, consistent with `assets-envato/` convention).

## Approach

A Python build script (`tcg-extract/build_cards.py`, repo-adjacent) renders the
PSD with psd-tools in two passes:

1. **`card-bg.png`** — BACKGROUND group only (full-bleed card background
   including the art-window area).
2. **`card-frame.png`** — everything above the artwork with the background and
   all placeholder text hidden (name plate wood + teeth + vines, description
   parchment, lanterns, sparks, fog) composited on transparency.
3. **`skull.png`** — single skull pip extracted from the CARD RARITY group.

Stat orb groups (STAT HOLDER LEFT/RIGHT) are hidden — cards stay clean.
Placeholder text layers (CARD NAME, description, CARD CLASS, stat numbers,
skulls) are hidden.

Per-horror color theming is applied in the script (hue-preserving tint of the
*background* toward each horror's color; frame overlay stays original) producing
`card-bg-<id>.png` for each of kaervox/shepherd/mournweight/maw/grey. The PSD's
own gradient-map theme layers are not used (psd-tools can't composite
adjustment layers).

Outputs land in `oracle-ops/public/tcg/`.

## Browser composition (HorrorCard.tsx)

A card is a fixed-aspect (5:7) stack, all positions in % of the 750×1050 frame:

| Layer | Content |
|---|---|
| background | `tcg/card-bg-<id>.png` |
| art | `<img src="horrors/<id>.png">` clipped to the art window; hidden on 404 (user supplies art later) |
| frame | `tcg/card-frame.png` |
| name plate | horror **emotion** (WRATH …) in Cinzel, horror color |
| description | full horror name + GM; when slain → death line ("ALL X IS LIFTED") |
| class line | GM name |
| pips | one `skull.png` per mark, max 5 shown then "×N" |

### State treatments (CSS)

- `fighting` — normal
- `bloodied` — red vignette + BLOODIED stamp
- `slain` — darkened + desaturated, death-line banner
- `broken` — heavy grey desaturation + COMPANY BROKEN stamp

## Code changes

- `src/wall/HorrorCard.tsx` (new)
- `src/wall/panels/BannersPanel.tsx` — render five `HorrorCard`s instead of banners
- `src/styles.css` — `.tcg-*` styles; old `.banner-*` styles removed if unused
- `public/tcg/` — rendered assets; `public/horrors/` — user-supplied art drop folder

## Error handling

- Missing horror art: art `<img>` hides itself (`onError`), dark window shows — card still valid.
- Assets are static; no runtime failure modes beyond 404s.

## Testing

- `npm run build` passes.
- Visual check on dev server: five cards render, state changes from GM panel
  reflect on cards (fighting → bloodied → slain → broken), marks add skulls.
