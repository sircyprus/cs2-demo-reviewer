# Sample demos

The home page shows a few public pro matches so visitors have something to explore before adding their own demos. Each card is tagged **sample** and credits its source.

## What is published (and what is not)

- Published: parsed statistics and replay data (positions sampled about 8 times a second, kills, utility, economy) in `site/public/samples/`.
- Never published: the raw `.dem` files. They stay in `sample-demos/`, which is git-ignored.
- Player names are the public in-game names of professional players. SteamIDs are replaced by a hash.

## Current samples

PGL Masters Bucharest 2026 (31 Oct 2026), demos via HLTV.org:

| Match | Maps |
| --- | --- |
| Vitality 2-1 Natus Vincere | Cache, Mirage, Dust 2 |
| BetBoom 0-2 FURIA | Dust 2, Cache |
| Aurora 0-2 MOUZ | Mirage, Cache |
| FUT 0-2 Nemiga | Nuke, Dust 2 |

Team names come from the demos themselves; the match dates, titles and credit line come from `samples.json`.

## Adding or replacing samples

1. Download the match demos from HLTV in your own browser (it has a human check) and extract them. HLTV serves `.rar` archives; Windows 11 can extract them with `tar -xf file.rar`, or use 7-Zip.
2. Put the `.dem` files in `sample-demos/`.
3. Add an entry per file to `samples.json` (key = file name without `.dem`): `title`, `event`, `date` (YYYY-MM-DD), `credit`, and optionally `source` (the match page URL).
4. Run `node review.js`. Samples are written to `site/public/samples/`; each is 5-12 MB.
5. Commit `samples.json` and `site/public/samples/`, then push.

To remove a sample, delete its files from `site/public/samples/` and its entry from `samples.json`, regenerate `index.json` with `node review.js`, and commit.

## Licensing

HLTV and the tournament organisers do not publish clear redistribution terms for demo files or for data derived from them. The raw files are not redistributed, only facts about the matches (scores, kills, positions). If a rights holder objects, remove the sample as above.
