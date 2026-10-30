# Style guide

The look is a dark, violet-tinted UI built around one four-colour palette, with a few fixed "data" colours that carry meaning in the game. All values live as CSS variables in `site/src/styles.css` (`:root`); use the variables, never raw hex, in components.

## Brand palette

From Color Hunt: https://colorhunt.co/palette/8e1ea2c654c3ed96d7ffc0de

| Token | Hex | Use |
| --- | --- | --- |
| `--acc-deep` | `#8E1EA2` | Fills behind white text: primary buttons. Too dark for text on the dark background. |
| `--acc-strong` | `#C654C3` | Borders of active/primary controls, focus rings, hover emphasis. |
| `--acc` | `#ED96D7` | Links, active tab underline, highlighted text, the Team A colour. |
| `--acc-soft` | `#FFC0DE` | Rare highlights: badges, hover text. Never as a large fill. |

## Surfaces and text (derived from the palette hue)

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#130a17` | Page background |
| `--stage` | `#0e0812` | Behind the replay canvas |
| `--panel` | `#1c1122` | Cards, side panels, bars |
| `--panel2` | `#27192f` | Inputs, buttons, inset rows |
| `--line` | `#3d2a48` | Borders and dividers |
| `--sel` | `#3b1745` | Selected chip / drag-over background |
| `--fg` | `#f7eaf4` | Primary text |
| `--mut` | `#a98fb5` | Secondary text, labels |

## Data colours (do not re-theme)

These mean something in the game, so they stay fixed and are *not* part of the brand palette.

| Meaning | Token / hex |
| --- | --- |
| Terrorist side | `--T` `#e8a94b` (orange) |
| Counter-Terrorist side | `--CT` `#5da9ff` (blue) |
| Team A / Team B | `--A` `#ED96D7` (pink) / `--B` `#6fd3c9` (teal) |
| Good / health high | `#4fd37a` |
| Warning / health medium | `#e8c14b` |
| Bad / health low / bomb | `#e5534b`, `#ff4d3d` |

Rule: side colours (T/CT) are used for in-game things (players, rounds, kill feed); team colours (A/B) for the scoreboard and head-to-head. Never use T/CT colours for generic UI.

## Typography and spacing

- System font stack (`system-ui, Segoe UI, sans-serif`); base 14 px, line-height 1.45. Numbers that change use `font-variant-numeric: tabular-nums`.
- Headings: h1 24 px, h2 16 px semibold. Small labels 11–12 px in `--mut`.
- Spacing in multiples of 4 px (gaps mostly 6, 8, 12, 16). Pages are max 1280 px wide with 32 px side padding (16 px on phones).
- Radius: 6 px controls, 8–10 px cards, 99 px chips.

## Components

- **Primary action** (`.btn.pri`): `--acc-deep` fill, `--acc-strong` border, white text. One per card.
- **Secondary** (`.btn`): `--panel2` fill, `--line` border; border turns `--acc` on hover.
- **Chip** (`.chip`): outline pill; `.on` uses `--sel` fill and `--acc-strong` border.
- **Card**: `--panel` fill, 1 px `--line` border. A dashed border means a drop target.
- **Tabs**: text in `--mut`; the active tab is `--fg` with a `--acc` underline.
- **Replay HUD**: panels on `--panel`, canvas on `--stage`; overlays use `rgba(19,10,23,.85)` so the map stays visible.

## Replay canvas conventions

- Players: side-coloured dot, dark 2 px halo, health ring (green > 50, amber > 25, red below), view cone at 20 % opacity, name in white with a black shadow.
- Focus mode: everyone but the selected player drops to 35 % opacity at 70 % size, with no cone or name; the focused player is 15 % larger with a longer trail and a white ring.
- Utility: smoke grey, fire orange, flash white ring, HE red ring; grenade badges are dark discs with a coloured rim.
- Heatmap ramps: paths use the brand palette (`#8E1EA2` → `#C654C3` → `#ED96D7` → `#FFC0DE`), deaths use red to amber to cream (`#8b1e1e` → `#e5534b` → `#ffd23f` → `#fff6c8`), kills use teal. Transparent below 4 % intensity so the radar stays readable.
- Annotation colours: `#ff4d3d`, `#ffd23f`, `#4fd37a`, `#ffffff`, `#4cc9f0` (chosen to read on every radar).

## Accessibility

- Body text on `--bg`/`--panel` is at least 7:1; `--acc` text is about 8:1; `--acc-strong` text is around 4.5:1, so use it for borders and icons, not for small text.
- Never rely on colour alone: round outcomes also use icons (💣 ✂ ☠ ⏱), deaths use an X marker, selected cards get an outline.
- Everything in the replay has a keyboard shortcut (see the user guide).

When adding UI: reuse a token above; if you need a new colour, add it here first.
