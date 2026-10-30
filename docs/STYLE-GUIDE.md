# Style guide

One look: **bubblegum Y2K**. Glossy candy buttons, frosted glass, bubble highlights, chrome-style headings and a rounded type pairing, built directly on one four-colour palette. There are no other themes and no theme switch.

Mockup: `docs/mockups/bubblegum.html` (it uses the real stylesheet, see `docs/mockups/README.md`).

## Palette

From Color Hunt: https://colorhunt.co/palette/8e1ea2c654c3ed96d7ffc0de

| Token | Hex | Role |
| --- | --- | --- |
| `--p1` | `#8E1EA2` | Deep: primary-button base, headings, text accent |
| `--p2` | `#C654C3` | Strong: borders, focus rings, hover, the stage frame |
| `--p3` | `#ED96D7` | Soft: highlights and the page gradient |
| `--p4` | `#FFC0DE` | Pale: the page background, glass tint |

Everything else is derived from these. All values are CSS variables in `site/src/styles.css`; use them, never raw hex, in components.

## Surfaces and text

| Token | Value | Role |
| --- | --- | --- |
| `--page` | Soft gradient `#fff3f9 → #ffe0f0 → #ffcde8 → #f9c4ec` (kept pale on purpose; deeper pinks looked heavy) | Page background |
| `--glass` / `--glass2` | White at 58 % / 82 % | Cards, bars, inputs |
| `--glass-line` | White at 90 % | Card borders |
| `--line` | `rgba(142,30,162,.28)` | Dividers |
| `--ink` / `--mut` | `#3a0f46` / `#7d3f8b` | Text / secondary text |
| `--stage` / `--tlbg` | `#c7a0e3` / `#d2b0ea` | Behind the replay map and timeline: light lilac, so the map pops without a dark slab |

## Data colours

These carry meaning in the game and are tuned for contrast on the light glass; they are *not* brand colours.

| Meaning | Value |
| --- | --- |
| Terrorist (`--T`) | `#b45f06` |
| Counter-Terrorist (`--CT`) | `#1d5fd0` |
| Team A (`--A`) | `#a3157f` |
| Team B (`--B`) | `#0b7f78` |
| Good / Bad / Warning | `#1e8e4e` / `#c0352d` / `#a87400` |

Side colours (T/CT) are for in-game things only (players, rounds, kill feed). Team colours (A/B) are for scoreboards and head-to-head. The replay canvas draws players with fixed T/CT colours that read on the lilac stage.

## Type

- **Orbitron** (700, 900) for the logo, headings, big numbers and the round clock: the Y2K voice. Uppercase with wide tracking for h1/h2.
- **Quicksand** (500, 700) for everything else: rounded and readable at 11-14 px.
- Both are self-hosted through `@fontsource`, so the site makes no third-party requests. Orbitron's zero is slashed; for scores that must read as plain numbers (the replay HUD) use Quicksand.

## Shape and effects

- Pills for anything clickable (radius 99 px); 16-22 px radius on cards, 12 px on inner tiles.
- **Glass**: translucent fill, 2 px light border, soft purple shadow, `backdrop-filter: blur(10px)`, 1 px inner top highlight.
- **Candy buttons**: vertical gradient with a hard edge at 50 % (`--btn-*`), 1 px border, glow, white text-shadow. Primary and active buttons use the `--pri-*` set (deep purple with a pink highlight) and white text.
- **Monitors**: the replay map and the timeline sit in lilac screens with a 3 px white bezel plus a `--p2` ring. Canvas text and lines on them are dark plum (`#2b0a3f`) with a white halo; smoke is slate, flash rings are gold.
- **Sparkle**: the heading star (✦) and a few tiny white bubbles and glows in the page background. Keep decoration in the background layer; never put it behind text.

## Components

- `.btn` secondary: glossy light button. `.btn.pri`: glossy purple. One primary per card.
- `.chip` outline pill; `.on` = primary gloss. `.tabs` is a pill track with a primary-gloss active tab.
- `.card`, `.stat`, `.m` (match), `.cmp`, `.vs`, `table`, `details`: all glass.
- Replay: floating glass HUD pill, glass player cards with a side-coloured left edge, health bars with a glossy fill, kill feed, tools, heatmap and drawing panels as white glass over the map.

## Replay canvas conventions

- Players: side-coloured dot, dark halo, health ring (green > 50, amber > 25, red below), view cone, white name with a black shadow.
- Focus mode: others fade to 35 % at 70 % size without cone or name; the focused player is 15 % larger with a longer trail and a white ring.
- Heatmap ramps: paths use the palette (`#8E1EA2 → #C654C3 → #ED96D7 → #FFC0DE`), deaths red to amber to cream, kills teal; transparent under 4 % intensity.
- Utility: smoke grey, fire orange, flash white ring, HE red ring. Annotation colours: `#ff4d3d`, `#ffd23f`, `#4fd37a`, `#ffffff`, `#4cc9f0`.

## Accessibility

- Text on glass is at least 4.5:1 (checked by eye on the mockup; re-check when changing a token). `--p3` is for fills and highlights, not small text.
- Colour is never the only signal: round outcomes also use icons, deaths use an X, selected cards get an outline.
- There is no autoplaying decoration; the only transition is a 2 px lift on hover.

## Art

Original SVG drawn for this project, in `site/src/assets/art/` (no third-party images; nothing to attribute).

| File | Use |
| --- | --- |
| `c4.svg` | Home-page hero: a candy-coloured **C4** with a pixel "0:40" LCD, a pearl keypad, chrome straps, coloured wires and a chrome star. Sits beside the title on screens 1000 px and wider and floats gently. |

## History

Earlier iterations (a dark "night" theme and an iridescent "holo" look with LCD readouts and a theme toggle) were removed in favour of this single look; the C4 hero from that work was kept and restyled for it. They are recoverable from git history (commit `bc04323`) if needed.

When adding UI: use a token; if you need a new colour, add it here first.
