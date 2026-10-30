# Style guide

A Y2K look: glossy candy buttons, frosted glass, bubble highlights, chrome-style headings and a rounded type pairing. It is built directly on one four-colour palette and comes in two themes that share every rule.

Mockups of both themes: `docs/mockups/bubblegum.html` and `night.html` (they use the real stylesheet, see `docs/mockups/README.md`).

## Palette

From Color Hunt: https://colorhunt.co/palette/8e1ea2c654c3ed96d7ffc0de

| Token | Hex | Role |
| --- | --- | --- |
| `--p1` | `#8E1EA2` | Deep: primary-button base, headings, text accent on light surfaces |
| `--p2` | `#C654C3` | Strong: borders, focus rings, hover, the stage frame |
| `--p3` | `#ED96D7` | Soft: highlights, night-theme accent and links |
| `--p4` | `#FFC0DE` | Pale: the page background of the light theme, glass tint, night-theme headings |

Everything else is derived from these. All values are CSS variables in `site/src/styles.css`; use them, never raw hex, in components.

## Themes

Three themes: **holo** (default), **bubblegum** (light) and **night** (dark neon). Holo is the iridescent device look, inspired by the Y2K "Glow Up" Dribbble shot: https://dribbble.com/shots/27686678-Glow-Up-Y2K-Landing-Page-for-a-Wellness-App.

Set with `data-theme` on `<html>` (`lib/theme.js`, toggled by `ThemeToggle`, remembered in localStorage).

| | **bubblegum** (default, light) | **night** (dark) |
| --- | --- | --- |
| Page | Gradient `#ffd9ec → #FFC0DE → #f4a8e0 → #e48ad6` | Gradient `#12031a → #240a33 → #3b0f4d` |
| Surfaces | White glass 58 % with a white border | Pink-tinted glass 7 % with a pink border |
| Text / muted | `#3a0f46` / `#7d3f8b` | `#fdeaf7` / `#cba3d8` |
| Links, accents | `--p1` | `--p3` / `--p4` |
| Stage (behind the map) | `#26092f` | `#14041b` |

### Holo specifics

- **Backdrop**: aurora of magenta, violet, sky blue and coral (`--page`) that drifts slowly, with soft white clouds, twinkling white sparkles and a faint film grain; the whole app sits in a frosted rounded "device window" (the `.page` element) with chrome four-point stars on its corners.
- **LCD readouts**: stat tiles, the score pills and the round clock use VT323 on a pale green-grey LCD (`--lcd`, `--lcd-ink`) with a white bezel, like a handheld pet.
- **Egg screens**: match cards show the radar in an egg-shaped screen with stacked pink / lilac / sky rings and three pink pearl buttons underneath.
- **Window halo**: the pastel ring (`--ring`) around the window, the replay HUD and the bottom bar.
- **Motion**: headings shimmer, buttons get a light sweep on hover, cards lift. All of it stops under `prefers-reduced-motion`.
- **Holographic bezels**: the replay map and the timeline use a conic gradient border (`--holo`: pink, lilac, sky, mint, peach).
- **Buttons**: pink gel for active tabs, chips and toggles; **lime** (`#d8f66e` family) is reserved for the single main action on a card (`.btn.pri`). Lime is the one colour outside the palette family; it is borrowed from the reference and is not used anywhere else.
- **Type**: Unbounded (700, 900) lowercase headings, Quicksand body, VT323 for numbers.

### Art assets

All artwork is original SVG drawn for this project, in `site/src/assets/art/`. There are no third-party images, textures or icon packs, so there is nothing to attribute. Fonts come from `@fontsource` (SIL Open Font License).

| File | Use |
| --- | --- |
| `holo-egg.svg` | The home-page hero: an iridescent handheld "map pager" with a pixel crosshair and score on its LCD, pearl buttons, gems and chrome stars. It hangs over the window's top-right edge and floats gently. |
| `chrome-star.svg` | Four-point chrome star: window corners, heading bullets. |
| `bubble.svg` | Soap bubble with an iridescent rim, scattered in the page background. |
| `pixel-heart.svg` | Empty states. |

When adding art: draw it as SVG with the palette plus the holo accents, keep each file under about 10 KB, and add it to this table.

## Data colours

These carry meaning in the game and are tuned per theme for contrast; they are *not* brand colours.

| Meaning | bubblegum | night |
| --- | --- | --- |
| Terrorist (`--T`) | `#b45f06` | `#f0b25b` |
| Counter-Terrorist (`--CT`) | `#1d5fd0` | `#6fb3ff` |
| Team A (`--A`) | `#a3157f` | `#ED96D7` |
| Team B (`--B`) | `#0b7f78` | `#6fd9cf` |
| Good / Bad / Warning | `#1e8e4e` / `#c0352d` / `#a87400` | `#4fd37a` / `#ff6b5f` / `#f0c24b` |

Side colours (T/CT) are for in-game things only (players, rounds, kill feed). Team colours (A/B) are for scoreboards and head-to-head. The canvas draws players with brighter fixed T/CT colours because it always sits on the dark stage.

## Type

- **Orbitron** (700, 900) for the logo, headings, big numbers, the round clock: the Y2K voice. Uppercase with wide tracking for h1/h2.
- **Quicksand** (500, 700) for everything else: rounded, friendly, readable at 11–14 px.
- Both are self-hosted through `@fontsource`, so the site makes no third-party requests. Orbitron's zero is slashed; for scores that must read as plain numbers (the replay HUD) use Quicksand.

## Shape and effects

- Pills for anything clickable (radius 99 px); 16–22 px radius on cards, 12 px on inner tiles.
- **Glass**: translucent fill, 2 px light border, soft purple shadow, `backdrop-filter: blur(10px)`, 1 px inner top highlight.
- **Candy buttons**: vertical gradient with a hard edge at 50 % (`--btn-top/mid/low/bot`), 1 px border, glow, white text-shadow. Primary/active buttons use the `--pri-*` set (deep purple with a pink highlight) and white text.
- **Monitors**: the replay map and the timeline sit in dark "screens" with a 3 px white bezel plus a `--p2` ring, so map colours stay readable on either theme.
- **Sparkle**: the heading star (✦) and a few tiny white bubbles and glows in the page background. Keep decoration in the background layer; never put it behind text.

## Components

- `.btn` secondary: glossy light button. `.btn.pri`: glossy purple. One primary per card.
- `.chip` outline pill; `.on` = primary gloss. `.tabs` is a pill track with a primary-gloss active tab.
- `.card`, `.stat`, `.m` (match), `.cmp`, `.vs`, `table`, `details`: all glass.
- Replay: floating glass HUD pill, glass player cards with a side-coloured left edge, health bars with a glossy fill, kill feed and tools as dark glass pills over the map.

## Replay canvas conventions

- Players: side-coloured dot, dark halo, health ring (green > 50, amber > 25, red below), view cone, white name with a black shadow.
- Focus mode: others fade to 35 % at 70 % size without cone or name; the focused player is 15 % larger with a longer trail and a white ring.
- Heatmap ramps: paths use the palette (`#8E1EA2 → #C654C3 → #ED96D7 → #FFC0DE`), deaths red → amber → cream, kills teal; transparent under 4 % intensity.
- Utility: smoke grey, fire orange, flash white ring, HE red ring. Annotation colours: `#ff4d3d`, `#ffd23f`, `#4fd37a`, `#ffffff`, `#4cc9f0`.

## Accessibility

- Text on glass is at least 4.5:1 in both themes (checked by eye on the mockups; re-check when changing a token). `--p3`-coloured text is only used in the night theme; on the light theme use `--p1`.
- Colour is never the only signal: round outcomes also use icons, deaths use an X, selected cards get an outline.
- `prefers-reduced-motion`: there is no autoplaying decoration; the only transition is a 2 px lift on hover.

When adding UI: use a token; if you need a new colour, add it here and in both themes first.
