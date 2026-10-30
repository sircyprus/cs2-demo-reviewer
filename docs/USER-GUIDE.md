# User guide

CS2 Demo Reviewer turns Counter-Strike 2 demo files into match reports and an interactive 2D replay. It runs entirely in your browser; nothing you add is uploaded.

Live site: https://sircyprus.github.io/cs2-demo-reviewer/

## Adding demos

**In the browser (anyone):** drop `.dem`, `.dem.zst`, `.dem.bz2`, `.dem.gz` or `.zip` files — or whole folders — onto the "Add your own demos" box, or use **Choose files…**. Each demo is decompressed and parsed on your computer (about 10–30 seconds for a 100 MB demo). Parsed demos are stored in this browser (IndexedDB) and show an **on this device** tag with a ✕ to remove them. Clearing site data removes them too.

**Privacy:** nothing is uploaded and no demo is ever stored on the server, so nobody else can see your demos and you cannot see theirs. **Local copy for the site owner:** demos placed in `demos/` and parsed with `build.bat` are shown only on your own machine (`site/public/data` is git-ignored and never published). See [ARCHITECTURE.md](ARCHITECTURE.md#publishing).

Only CS2 demos work (they start with `PBDEMS2`). CS:GO demos are rejected.

## Look

The site has two themes: **bubblegum** (light, the default) and **night** (dark). Use the button in the top-right corner of the home page or the replay header to switch; the choice is remembered in your browser.

## Matches tab

One card per demo: radar thumbnail, map, score (Team A : Team B), date, round count, the top three players by rating, and **Report** / **▶ Replay** buttons.

- Search matches map, filename or any player name.
- Chips filter by map. Sort by newest, oldest, filename, most rounds, closest score, biggest stomp or highest-rated player.
- **Date filter** (above the tabs) applies to every tab: presets for 7/30/90 days or a custom from/to range.

> Demo files carry no match date. The site uses a `YYYY-MM-DD` found in the file or folder name, otherwise the file's modified time. For demos you download, rename them (e.g. `2026-10-12_mirage.dem.zst`) if you want the real date.

## Players tab

Averages per player across the demos currently shown (respects the date filter), weighted by rounds played. Click a column header to sort, a name to see their matches, **⚔** to start a comparison.

## Head to Head tab

Pick two players (type a name, or press ⚔ on two rows in the Players tab).

- **Duel score** — how many times each killed the other, with headshots, over matches both played.
- **Stat bars** — rating, K/D, ADR, KAST, HS%, kills/deaths/assists per round, opening-duel win rate, matches. The better value is highlighted; for deaths, lower wins.
- **Shared matches** table — whether they were teammates or opponents, each player's line, the duels in that match, links to the report and replay.
- The checkbox limits the stat bars to matches both played; untick it to compare each player's overall numbers.

## Report page

Scoreboards for both teams (K, D, A, +/-, ADR, KAST, HS%, opening kills–deaths, multi-kill counts, rating), a round strip (click a round to jump to it) and a kill-by-kill log for every round with weapon, headshot, wallbang, through-smoke, no-scope and blind-kill tags.

## Replay

Open with **▶ Replay**. The map shows every player (T orange, CT blue) with view cone, health ring, short trail and name, plus smokes, fire, flashes, HE explosions, the planted bomb and kill lines.

| Control | Action |
| --- | --- |
| Space | Play / pause |
| ← / → | Back / forward 5 seconds |
| , / . | Previous / next round |
| Mouse wheel, drag | Zoom, pan (**Reset view** to recentre) |
| F | Focus mode on the selected player |
| H | Show / hide the heatmap panel |
| D | Toggle drawing (while paused) |
| Esc | Leave drawing |
| Ctrl+Z | Undo last drawing |

**Focus mode:** click a player on the map or a player card to select them, then press **Focus** (or **F**). Everyone else fades and shrinks (no cone or name) and the selected player gets a longer trail, so you can follow one person's round. Click the player again, or press F, to switch it off.

**Heatmaps:** press **Heatmap** (or **H**) to overlay one of three layers on the radar:
- **Deaths**: where players died.
- **Kills**: where the killer stood when they made the kill.
- **Paths**: where players walked, from the end of freeze time to the end of each round.

Filter by side (All / T / CT, using the side each player was on at the time), by player, and by rounds (all, this round, or a range). The panel shows how many points are plotted. Colours are scaled so the busiest areas stand out without hiding everything else. On two-level maps the heatmap follows the Level button. Death positions come from the last tracked position of the victim, so they can be a few units off.

**Top bar:** score, round clock (freeze time, 1:55 round timer, 40 s bomb countdown) and the round number.

**Side panels:** each player's health, armour, money and weapon (click a card to highlight them on the map). The header of each panel shows the buy type (Pistol round, Eco, Semi-eco, Force buy, Full buy) with team equipment value and bank.

**Round strip** above the controls reveals things as they happen: kills so far, the entry kill, 3K/4K/ACE, clutches (1vN with N ≥ 2, ✔/✖ at the end of the round) and the result.

**Timeline:** each round is a coloured block (T win orange, CT win blue) with the running score, how it ended (💣 bombed, ✂ defused, ☠ wiped, ⏱ time), kill ticks and bomb-plant markers; a dashed line marks half-time. Click or drag to seek; hover for a summary.

**Drawing (paused only):** Pen, Line, Arrow, Circle in five colours, plus grenade icons (Smoke, Flash, Molly, HE) placed with a click. Drawings belong to the paused frame and show only when you are paused on it. **Undo**, **Clear**, and **📷 Save** (downloads the current view as a PNG). Drawings are not stored when you leave the page.

**Maps with two levels** (Nuke, Vertigo): a **Level** button switches the radar; players on the other level are dimmed.

## What the numbers mean

- **Rating** is an approximation of HLTV 2.0 built from kills, deaths, assists, KAST and ADR. It is not the official rating.
- **KAST** counts rounds with a kill, assist or survival. Trades are not tracked, so it reads slightly low.
- **ADR** counts damage to enemies only, capped at 100 per victim per round, divided by rounds played by the match.
- **Team A / Team B** are the two teams by who started on T in round 1. Real team names are not in the demo.
- **Buy-type labels** use average equipment value per player (< $1,000 Eco, < $2,000 Semi-eco, < $3,300 Force buy, otherwise Full buy). These cut-offs are judgement calls.

See [ROADMAP.md](ROADMAP.md) for known gaps and planned work.
