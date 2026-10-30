# Notes for AI coding agents

Guidance for Claude Code, Codex and similar tools working in this repo.

## What this is

A static React site (Vite) that reviews Counter-Strike 2 demos: match reports and a 2D replay. Demos are parsed **in the visitor's browser** with a WebAssembly build of demoparser2. A Node CLI (`review.js`) does the same parsing locally for the site owner. Hosted on GitHub Pages. Read `docs/ARCHITECTURE.md` first, then `docs/ROADMAP.md` for what is planned.

## Non-negotiable rule: never publish anyone's demos

- `demos/`, `site/public/data/` and `legacy/` are git-ignored. **Never** commit or deploy raw demos or parsed demo data, and never add a step that uploads them anywhere.
- The deployed site must contain only the app. Visitors' demos stay in their own browser (IndexedDB). Do not add features that send demo data to a server.
- Git history was rewritten once to remove earlier data; do not reintroduce it.

## Commands

```bash
node review.js                  # parse ./demos -> site/public/data (local use only)
cd site && npm install
cd site && npm run dev          # http://localhost:5173
cd site && npm run build        # static build in site/dist (Pages workflow does the same)
```

`build.bat` / `review.bat` wrap these on Windows. Node 22+ is needed for `.zst` in the CLI.

## Where things are

- `site/src/parser/analyse.js` — the one analysis implementation, shared by the CLI and the browser. It must stay free of Node- and DOM-specific APIs. Changes to its output shape must be reflected in `docs/ARCHITECTURE.md` (Data files).
- `site/src/parser/worker.js` + `wasm/` — browser parsing. The WASM is a locally patched upstream build; see `wasm/README.md` before touching it.
- `site/src/replay/engine.js` — canvas, camera, playback, drawing, heatmaps, timeline (imperative). `Viewer.jsx` is the React shell and receives a `hud` snapshot. Keep per-frame work out of React state.
- `site/src/pages/` — Home (Matches / Players / Head to Head), Report, Replay.

## Conventions

- Plain JavaScript (ESM) and React function components; no TypeScript yet. Follow the surrounding style (2-space indent, single quotes, semicolons).
- **Styling follows `docs/STYLE-GUIDE.md`**: use the CSS variables, not raw hex; side colours (T orange / CT blue) are reserved for in-game meaning.
- Routing is hash-based and `base` is `./`: keep URLs relative (use `asset()` from `lib/data.js`) so the site works from a sub-path.
- Player ids in data are hashed (`anon()`); never write raw SteamIDs into any output.

## Verifying changes

1. `cd site && npm run build` must pass.
2. For parser/analysis changes, re-run `node review.js --force` on a sample demo and diff the JSON against the previous output (replay and analysis files should be identical unless you intended a change). The native and WASM parsers must give identical results.
3. For UI changes, load a demo in a browser (drop one onto the page) and exercise the feature, including the replay keyboard shortcuts.

## Windows gotchas

- Windows PowerShell 5.1 reads/writes files in the system codepage by default; edit text files with a UTF-8 aware tool or Node, or you will corrupt characters such as "→" and "—".
- Git may print LF/CRLF warnings; they are harmless.
- The `.bat` scripts are Windows only (cross-platform `npm` scripts are on the roadmap).

## Git

`main` deploys on every push (`.github/workflows/pages.yml`). Keep commits small and messages descriptive. Do not force-push unless explicitly asked.
