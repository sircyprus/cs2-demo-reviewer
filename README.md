# Masturbatorium

Match reports and a 2D replay for Counter-Strike 2 demos. Demos are parsed in your browser and never uploaded.

Live: https://sircyprus.github.io/cs2-demo-reviewer/

## Documentation

- [User guide](docs/USER-GUIDE.md) - what every screen and control does, and what the numbers mean
- [Architecture](docs/ARCHITECTURE.md) - parsers, data files, WASM build, publishing
- [Style guide](docs/STYLE-GUIDE.md) - bubblegum Y2K palette and UI conventions ([mockup](docs/mockups/README.md)) (agents: see [AGENTS.md](AGENTS.md))
- [Sample demos](docs/SAMPLES.md) - the public pro matches shown as test data, and how to change them
- [Roadmap](docs/ROADMAP.md) - what's shipped, what's next, known limitations

## Using it locally

1. (Optional, local only) Put demos (or folders of them) in `demos/` — `.dem`, `.dem.zst`, `.dem.bz2`, `.dem.gz`, `.zip`.
2. Double-click `review.bat`. It parses new demos, then starts the site at http://localhost:5173.

You can also skip step 1 and drop demos straight onto the page.

## Hosting on GitHub Pages

The site is plain static files; `.github/workflows/pages.yml` builds it and publishes it on every push to `main`.

**No demo data is published.** The public site contains only the app itself: visitors add their own demos, which are parsed in their browser and stay on their device, so nobody can see anyone else's demos. `site/public/data/` (what `review.js` generates for local use) and `demos/` are git-ignored and never committed or deployed.

1. Create a **public** repository (free GitHub Pages needs one) and push this folder to its `main` branch.
2. In the repo: **Settings → Pages → Source: GitHub Actions**. The site publishes at `https://<you>.github.io/<repo>/`.

## How it fits together

| Part | What it does |
| --- | --- |
| `site/src/parser/analyse.js` | The analysis (scoreboard, rounds, economy, replay frames). One implementation shared by both parsers below. |
| `review.js` | Node CLI for private, local use: native parser (`@laihoe/demoparser2`) → JSON in `site/public/data/` (git-ignored; cached; `--force` re-parses). |
| `site/src/parser/worker.js` + `wasm/` | In-browser parser: decompress (zstd/bz2/gz/zip) + WASM parser in a Web Worker → IndexedDB. See `wasm/README.md` for how the WASM was built. |
| `site/` | React + Vite app: Matches / Players / Head to Head, per-demo report, 2D replay. |
| `site/public/maps/` | Radar images and Valve overview files. |
| `legacy/` | The earlier static-HTML version. |

## Commands

```bash
node review.js            # parse demos -> site/public/data (local only, git-ignored)
cd site && npm run dev    # dev server on :5173
cd site && npm run build  # static build in site/dist
```

Browser parsing needs a desktop browser with a few GB of free memory for a 130 MB demo; each demo takes roughly 10–30 seconds. Demo files carry no match date, so the site uses a `YYYY-MM-DD` in the file path, otherwise the file's modified time.



