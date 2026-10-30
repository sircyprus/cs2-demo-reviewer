# Design mockups

Static pages that use the real stylesheet (`site/src/styles.css`), so they show exactly what the app looks like in each theme.

- `bubblegum.html` — light Y2K, built straight from the four palette colours
- `holo.html` — iridescent "device" look: aurora backdrop, frosted window, LCD readouts, rounded radar screens, lime call-to-action
- `night.html` — dark neon version of the same design

They load the fonts from `site/node_modules`, so run `npm install` in `site/` first, then serve the repo root with any static server (or open the files directly).
