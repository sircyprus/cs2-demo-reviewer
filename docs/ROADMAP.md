# Roadmap

Status as of 2026-10-31. Effort: **S** = an evening, **M** = a few evenings, **L** = a week or more. Items are ordered by value within each section, not promised dates.

## Shipped

- [x] Parse CS2 demos (`.dem`, `.zst`, `.bz2`, `.gz`, `.zip`) with a native Node parser
- [x] Match reports: scoreboards, rating, ADR, KAST, HS%, opening duels, multi-kills, per-round kill log
- [x] 2D replay on the real radar: smooth movement, utility, bomb, kill lines, economy, round clock, round timeline
- [x] Round insights revealed as they happen: entry kill, 3K/4K/ACE, clutches
- [x] Drawing tools on a paused frame, grenade icons, PNG export
- [x] Matches / Players / Head to Head, date filter
- [x] React static site, hosted on GitHub Pages
- [x] In-browser parsing through a CS2-capable WASM parser; results kept on the visitor's device
- [x] Death, kill and movement heatmaps in the replay (filter by side, player, rounds)
- [x] Focus mode in the replay (click a player or press F; everyone else fades)
- [x] Style guide and palette (`docs/STYLE-GUIDE.md`) and agent notes (`AGENTS.md`)
- [x] No demo data is published: the public site is the app only, and demos stay in each visitor's browser

## Next (highest value)

| # | Item | Why | Effort |
| --- | --- | --- | --- |
| 1 | **Trade tracking, then proper KAST and a closer HLTV-2.0 rating** | Numbers currently read low and "rating" is an approximation. Trades are the missing piece. | M |
| 2 | **Real team names and match format** (read them from the demo / convars; detect MR12 vs MR15, overtime sides) | Half-time and overtime logic assumes MR12; teams are just "A" and "B". | M |
| 3 | **Player profile page** (history across demos, per-map splits, trend, best/worst rounds) | The Players tab is a flat table; profiles are the natural next step once there are several demos. | M |
| 4 | **Shareable replay links** (`…/replay?round=7&t=34s`) and saved annotations you can export/import | Reviews are usually shared with a team. Drawings are lost on navigation today. | S–M |
| 5 | **Parse progress and resilience in the browser** (percent bar, cancel, clear error when memory runs out, retry) | Large demos take 10–30 s with only a text status. | S |
| 6 | **Regression tests** (golden JSON for a small sample demo, run in CI) | The native and WASM parsers were compared by hand once; this should be automatic. | S–M |
| 7 | **Smaller data**: pre-compress replay data, move to typed/binary arrays, load replay data per round | Replays are 3–7 MB each, which makes browser storage and load times heavier than they need to be. | M |

## Requested features (added 2026-10-31)

| Feature | What it needs | Effort |
| --- | --- | --- |
| ~~Death heatmap and movement-path heatmap~~ | **Shipped** per demo. Still open: heatmaps across several demos on the same map (needs a per-map aggregate), and exact death positions from the event instead of the nearest tracked frame. | M |
| **Economy screen**: how both teams' money and equipment shift across the match | The per-round equipment value and bank already exist. Needs spend per round, buy-type per round, and a chart (stacked area + round markers) on the Report page. | S–M |
| **Gunfight analysis**: isolate each gunfight into a record and measure spray and aim | New parse data: `weapon_fire` events and per-tick view angles around each duel. Per fight: shots fired and hit, time to first damage, crosshair offset when the enemy became visible, flick distance and speed, spray length. Then classify: *mechanical* (spray, crosshair placement) vs *positioning / game sense* (looking where the enemy was not). | L |
| **Trade and crossfire check**: when a player dies, could a teammate have seen the killer? | Compare each teammate's view direction and distance to the killer's position at the death tick, within a trade window. Without map geometry this is approximate (no line-of-sight), so label it as such; real visibility needs per-map data. | L |
| **Map control overlay**: shaded areas held by each team, shifting through the round | Needs walkable-area data per map (derive a mask from the radar image or use a nav mesh) and a distance-based influence per living player, recomputed every frame. Highest effort and the most uncertain. | L |

Suggested order: heatmaps → economy screen → gunfight data structure → trades/crossfire → map control. Gunfight analysis and trades share the same prerequisite (per-duel view-angle data), so build that once.

## Later

- **Grenade analysis**: real trajectories (the parser can list grenades), smoke/molly durations from expiry events, lineup library, utility damage and flash-assist stats. (M–L)
- **Follow-player camera** and a player-only view in the replay (L)
- **Heatmaps and kill maps** per player, side and map; bomb-site execution patterns (M–L)
- **Round economy chart** across the match and buy-type per team per round (S–M)
- **Mobile-friendly replay** (touch pan/zoom, compact panels) (M)
- **Cross-platform scripts**: replace the `.bat` files with `npm` scripts so macOS/Linux work (S)
- **Export / import of your local library** (one file you can move between browsers or back up) (S–M)
- **Custom domain and cache headers** — GitHub Pages cannot set headers; moving to Cloudflare Pages or Azure Static Web Apps would fix that (S)
- **TypeScript** for the engine and data shapes (M)
- **Accessibility pass** (keyboard focus, contrast, reduced motion) (M)

## Exploring / needs a decision

- **Matchmaking vs FACEIT demos.** Both parse today (the test demos are FACEIT). Valve MM demos have not been tested.
- **Accounts / syncing local demos between devices.** Deliberately out of scope for a static site; would need a backend.
- **Official rating or Elo-style ranking.** Needs a lot more data than a handful of demos.

## Known limitations

- Only CS2 demos; CS:GO demos are rejected.
- Rating, buy-type labels and clutch detection (1vN with N ≥ 2 only) are approximations or judgement calls.
- Half-time assumes MR12; the overtime side logic is a best guess.
- Utility effects use fixed durations (smoke 19 s, fire 7 s) rather than the real events.
- Replay positions are sampled at about 8 per second and interpolated.
- Browser parsing needs a desktop browser and a few GB of free memory for a ~130 MB demo.
- The match date comes from the filename or file time, not the demo.
- Radar images are third-party copies of Valve assets.
- The in-browser parser is a locally patched build of upstream demoparser2; it must be rebuilt by hand to update (see `site/src/parser/wasm/README.md`).
- Demos live only in the browser that added them: clearing site data deletes them, and they do not sync between devices.

## Non-goals

- A backend, accounts or paid features — the project stays a static site.
- Publishing or sharing anyone's demos or parsed data from the hosted site.
- Anti-cheat or "is this player cheating" detection.
- Live match tracking.

## Suggested order of work

1. Tests (#6) and parse progress (#5) — cheap, and they make everything after safer.
2. Trades/KAST/rating (#1) and team names/format (#2) — makes the existing numbers trustworthy.
3. Shareable links (#4) and player profiles (#3) — the features people will actually use with a team.
4. Data size (#7) before adding many demos.
