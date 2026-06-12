# Horror TCG Cards — Wall Display Design

Date: 2026-06-12
Status: Approved (Approach A — layered render)

## Goal

Replace the five Horror banners on the wall display (`BannersPanel`) with trading
cards built from the GraphicRiver "Trading Card Game Creator Vol 11 — Horror"
PSD assets, keeping all live game state (horror state, marks) as HTML overlays.

## Source assets

- `chosencardgame/Card-front.psd` (750×1050, layered: stone background, circular
  art window 67,94–684,706, ornate gold ring frame with rarity gem, name banner,
  parchment description block, stat triangles/circles, stat icons). Chosen over
  the "Vol 11 — Horror" pack after comparing renders.
- Licensed via Envato subscription (license readme retained in the source folder).

## Approach

A Python build script (`tcg-extract/build_cards.py`, repo-adjacent) renders the
PSD with psd-tools in two passes:

1. **`card-bg.png`** — Background group only (full-bleed stone background
   including the dark art-window area).
2. **`card-frame.png`** — everything above the artwork with the background and
   all placeholder text hidden (ring frame + ornament, art-window inner shadow,
   parchment, name banner, left stat circle, rarity gem) composited on
   transparency. The originally-hidden LEFT/RIGHT side color overrides stay
   hidden to preserve the gold finish.

Hidden entirely: STAT TRIANGLE, STAT TRIANGLE WITH GEM, STAT ROUNDED RIGHT,
STAT ICONS, and all placeholder text (UPLOAD YOUR ART, CARD NAME, stat VALUEs,
DESCRIPTION, CLASS/RACE).

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
| art | `<img src="horrors/<id>.png">` clipped circular to the art window; hidden on 404 (user supplies art later) |
| frame | `tcg/card-frame.png` |
| name banner | horror **emotion** (WRATH …) in Cinzel, horror color |
| parchment | full horror name; when slain → death line ("ALL X IS LIFTED") |
| class line | GM name |
| marks | marks count in the left stat circle |

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
