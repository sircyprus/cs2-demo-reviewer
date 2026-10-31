// Demo analysis shared by the Node CLI (native parser) and the browser (WASM parser).
// Everything here works on an `api` object so it never cares which parser is underneath:
//   api.header()                         -> { map_name, ... }
//   api.events(names, playerProps)       -> flat array of events, each with event_name + tick
//   api.ticks(props, tickList)           -> array of rows { tick, steamid, name, ...props }

export const STEP = 8; // replay sampling: every 8 ticks (~8 fps at 64 tick); the viewer interpolates

const sideName = n => (n === 2 || n === 'T' || n === 't') ? 'T' : (n === 3 || n === 'CT' || n === 'ct') ? 'CT' : null;
const sideIdx = n => (n === 2 ? 0 : n === 3 ? 1 : -1);

export const slug = s => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');

// Stable, non-reversible-looking player key so published data never carries raw SteamIDs (cyrb53, two seeds).
function cyrb53(str, seed) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
export const anon = id => cyrb53('cs2dr:' + String(id), 7).slice(0, 12);

function halvesSwapped(r) {
  if (r <= 12) return false;
  if (r <= 24) return true;
  // overtime: 6-round blocks (MR3)
  return Math.floor((r - 25) / 6) % 2 !== 0;
}

const EVENT_NAMES = [
  'player_death', 'player_hurt', 'round_end', 'round_start', 'begin_new_match', 'round_freeze_end',
  'smokegrenade_detonate', 'inferno_startburn', 'flashbang_detonate', 'hegrenade_detonate',
  'bomb_planted', 'bomb_defused', 'bomb_exploded',
];

// One pass over the demo for every event we need.
export function readEvents(api) {
  const by = {};
  for (const e of api.events(EVENT_NAMES, ['team_num', 'X', 'Y']) || []) (by[e.event_name] || (by[e.event_name] = [])).push(e);
  return by;
}

export function analyse(api, ev = readEvents(api)) {
  let header = {};
  try { header = api.header() || {}; } catch { /* header is optional */ }
  let deaths = ev.player_death || [];
  const hurts = ev.player_hurt || [];
  const roundEnds = ev.round_end || [];
  const roundStarts = ev.round_start || [];
  const matchStarts = ev.begin_new_match || [];

  if (!deaths.length && !roundEnds.length) throw new Error('no events parsed (is this a valid CS2 .dem?)');

  // Drop warmup: everything before the last match start (or the first round_start near it).
  let startTick = 0;
  if (matchStarts.length) startTick = Math.max(...matchStarts.map(e => e.tick));
  const rs = roundStarts.filter(e => e.tick >= startTick - 50).sort((a, b) => a.tick - b.tick);
  if (rs.length) startTick = Math.min(startTick, rs[0].tick);
  const ends = roundEnds.filter(e => e.tick > startTick).sort((a, b) => a.tick - b.tick);
  const endTicks = ends.map(e => e.tick);
  const roundOf = tick => endTicks.filter(t => t < tick).length + 1;
  deaths = deaths.filter(e => e.tick >= startTick).sort((a, b) => a.tick - b.tick);
  const hurtsIn = hurts.filter(e => e.tick >= startTick);

  const players = new Map();
  const P = (id, name) => {
    id = String(id);
    if (!players.has(id)) players.set(id, {
      id, name, k: 0, d: 0, a: 0, hs: 0, dmg: 0, kastRounds: new Set(), openK: 0, openD: 0,
      multi: { 2: 0, 3: 0, 4: 0, 5: 0 }, sideByRound: {}, rounds: new Set(), weapons: {},
    });
    const p = players.get(id);
    if (name) p.name = name;
    return p;
  };

  const rounds = [];
  for (let i = 0; i < ends.length; i++) rounds.push({ n: i + 1, winner: sideName(ends[i].winner), reason: ends[i].reason, kills: [] });

  const killsByRoundPlayer = {};
  for (const e of deaths) {
    const r = roundOf(e.tick);
    if (!rounds[r - 1]) continue;
    const hasAtk = e.attacker_steamid && String(e.attacker_steamid) !== '0' && e.attacker_steamid !== e.user_steamid;
    const v = P(e.user_steamid, e.user_name);
    v.d++; v.rounds.add(r); v.sideByRound[r] = sideName(e.user_team_num);
    const kill = {
      tick: e.tick, victim: e.user_name, weapon: e.weapon, hs: !!e.headshot, attacker: hasAtk ? e.attacker_name : null,
      assister: e.assister_name || null, vSide: sideName(e.user_team_num), aSide: hasAtk ? sideName(e.attacker_team_num) : null,
      wall: !!e.penetrated, smoke: !!e.thrusmoke, noscope: !!e.noscope, blind: !!e.attackerblind,
    };
    const first = rounds[r - 1].kills.length === 0;
    rounds[r - 1].kills.push(kill);
    v.kastRounds.delete(r);
    v._died = (v._died || new Set()).add(r);
    if (first) v.openD++;
    if (hasAtk) {
      const a = P(e.attacker_steamid, e.attacker_name);
      a.k++; a.rounds.add(r); a.sideByRound[r] = sideName(e.attacker_team_num);
      if (e.headshot) a.hs++;
      a.kastRounds.add(r);
      if (first) a.openK++;
      a.weapons[e.weapon] = (a.weapons[e.weapon] || 0) + 1;
      const key = a.id + ':' + r;
      killsByRoundPlayer[key] = (killsByRoundPlayer[key] || 0) + 1;
    }
    if (e.assister_steamid && String(e.assister_steamid) !== '0') {
      const as = P(e.assister_steamid, e.assister_name);
      as.a++; as.rounds.add(r); as.kastRounds.add(r);
      as.sideByRound[r] = sideName(e.assister_team_num);
    }
  }
  // Survived rounds count for KAST; "traded" is not tracked.
  for (const p of players.values()) for (const r of p.rounds) if (!(p._died && p._died.has(r))) p.kastRounds.add(r);
  for (const [key, n] of Object.entries(killsByRoundPlayer)) if (n >= 2) players.get(key.split(':')[0]).multi[Math.min(n, 5)]++;

  // Damage (enemy only, capped at 100 per victim per round)
  const dmgMap = {};
  for (const e of hurtsIn) {
    if (!e.attacker_steamid || String(e.attacker_steamid) === '0' || e.attacker_steamid === e.user_steamid) continue;
    if (sideName(e.attacker_team_num) && sideName(e.attacker_team_num) === sideName(e.user_team_num)) continue;
    const r = roundOf(e.tick);
    const k = `${e.attacker_steamid}|${e.user_steamid}|${r}`;
    dmgMap[k] = Math.min(100, (dmgMap[k] || 0) + (e.dmg_health || 0));
    P(e.attacker_steamid, e.attacker_name).rounds.add(r);
    P(e.user_steamid, e.user_name).rounds.add(r);
  }
  for (const [k, v] of Object.entries(dmgMap)) players.get(k.split('|')[0]).dmg += v;

  // Teams: players on T side in round 1 form "Team A".
  const sideAt = (p, r) => p.sideByRound[r] || null;
  const teamOf = new Map();
  for (const p of players.values()) {
    const first = Object.keys(p.sideByRound).map(Number).sort((a, b) => a - b).find(r => p.sideByRound[r]);
    if (!first) { teamOf.set(p.id, null); continue; }
    teamOf.set(p.id, (p.sideByRound[first] === 'T') !== halvesSwapped(first) ? 'A' : 'B');
  }
  const score = { A: 0, B: 0 };
  for (const r of rounds) {
    let aSide = null;
    for (const p of players.values()) if (teamOf.get(p.id) === 'A' && sideAt(p, r.n)) { aSide = sideAt(p, r.n); break; }
    if (!aSide) aSide = halvesSwapped(r.n) ? 'CT' : 'T';
    r.aSide = aSide;
    if (r.winner) score[r.winner === aSide ? 'A' : 'B']++;
  }

  const nRounds = rounds.length || 1;
  const list = [...players.values()].map(p => {
    const adr = p.dmg / nRounds, kast = p.kastRounds.size / nRounds;
    const rating = 0.0073 * kast * 100 + 0.3591 * (p.k / nRounds) - 0.5329 * (p.d / nRounds) + 0.2372 * (p.k / nRounds + 0.2 * (p.a / nRounds)) + 0.0032 * adr + 0.1587; // approximate HLTV-2.0-style
    return {
      id: anon(p.id), name: p.name, team: teamOf.get(p.id), k: p.k, d: p.d, a: p.a,
      hsPct: p.k ? Math.round(100 * p.hs / p.k) : 0, adr: +adr.toFixed(1), kast: Math.round(kast * 100),
      openK: p.openK, openD: p.openD, m3: p.multi[3], m4: p.multi[4], m5: p.multi[5], m2: p.multi[2],
      rating: +rating.toFixed(2), topWeapon: Object.entries(p.weapons).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    };
  }).filter(p => p.k || p.d || p.a).sort((a, b) => b.rating - a.rating);

  const allStarts = roundStarts.map(e => e.tick).sort((x, y) => x - y);
  const roundStartTicks = endTicks.map((_, i) => {
    const after = i === 0 ? startTick - 1 : endTicks[i - 1];
    return allStarts.find(t => t > after) ?? after;
  });
  return { startTick, endTicks, roundStarts: roundStartTicks, map: header.map_name || 'unknown', score, rounds, players: list, nRounds: rounds.length };
}

// Per-demo 2D replay data: positions, utility, bomb, kills, economy.
export function buildReplay(api, a, ev) {
  const first = a.startTick, last = a.endTicks[a.endTicks.length - 1];
  const grid = [];
  for (let t = first; t <= last; t += STEP) grid.push(t);

  const freeze = (ev.round_freeze_end || []).map(e => e.tick).sort((x, y) => x - y);
  const freezeOf = i => freeze.find(t => t >= a.roundStarts[i]) ?? a.roundStarts[i];
  const freezeTicks = a.rounds.map((_, i) => freezeOf(i));

  // One tick pass for both the movement frames and the end-of-freeze economy snapshot.
  const wantedSet = new Set(grid); freezeTicks.forEach(t => wantedSet.add(t));
  const wanted = [...wantedSet].sort((x, y) => x - y);
  const BASE = ['X', 'Y', 'Z', 'health', 'yaw', 'team_num', 'armor_value', 'active_weapon_name', 'balance', 'current_equip_value', 'pitch'];
  let rows;
  // team_clan_name gives real team names in tournament demos; older/other parsers may not know it, so fall back step by step
  try { rows = api.ticks([...BASE, 'team_clan_name'], wanted); }
  catch { try { rows = api.ticks(BASE, wanted); } catch { rows = api.ticks(BASE.slice(0, 6), wanted); } }
  rows = rows || [];

  const ids = [], names = [], idx = new Map(), weapons = [], wIdx = new Map();
  const byTick = new Map();
  for (const r of rows) {
    const id = String(r.steamid);
    if (!idx.has(id)) { idx.set(id, ids.length); ids.push(id); names.push(r.name); }
    let arr = byTick.get(r.tick);
    if (!arr) byTick.set(r.tick, arr = []);
    arr.push(r);
  }
  const weaponId = w => {
    w = (w || '').replace(/^weapon_/, '');
    if (!wIdx.has(w)) { wIdx.set(w, weapons.length); weapons.push(w); }
    return wIdx.get(w);
  };
  const frames = [];
  for (const t of grid) {
    const arr = byTick.get(t);
    if (!arr) continue;
    const p = new Array(ids.length).fill(null);
    for (const r of arr) {
      if (r.X == null) continue;
      p[idx.get(String(r.steamid))] = [Math.round(r.X), Math.round(r.Y), Math.round(r.Z || 0), r.health | 0, Math.round(r.yaw || 0),
        sideIdx(r.team_num), r.armor_value | 0, weaponId(r.active_weapon_name), r.balance | 0, Math.round(r.pitch || 0)];
    }
    frames.push([t, p]);
  }

  const util = [];
  const add = (name, kind, dur) => { for (const e of ev[name] || []) if (e.tick >= first && e.x != null) util.push([e.tick, Math.round(e.x), Math.round(e.y), kind, dur]); };
  add('smokegrenade_detonate', 'smoke', 1216);
  add('inferno_startburn', 'fire', 448);
  add('flashbang_detonate', 'flash', 48);
  add('hegrenade_detonate', 'he', 48);

  const bomb = [];
  for (const [n, k] of [['bomb_planted', 'plant'], ['bomb_defused', 'defuse'], ['bomb_exploded', 'explode']])
    for (const e of ev[n] || []) if (e.tick >= first) bomb.push([e.tick, k, e.user_X != null ? Math.round(e.user_X) : null, e.user_Y != null ? Math.round(e.user_Y) : null]);
  bomb.sort((x, y) => x[0] - y[0]);

  const kills = [];
  a.rounds.forEach(r => r.kills.forEach(k => kills.push([k.tick, k.attacker, k.victim, k.weapon, k.hs ? 1 : 0, k.aSide === 'T' ? 0 : k.aSide === 'CT' ? 1 : -1, k.vSide === 'T' ? 0 : k.vSide === 'CT' ? 1 : -1])));
  kills.sort((x, y) => x[0] - y[0]);

  // Economy at the end of freeze time: team equipment value and money left, per side.
  const eqByTick = new Map();
  for (const t of new Set(freezeTicks)) {
    for (const r of byTick.get(t) || []) {
      const s = sideIdx(r.team_num);
      if (s < 0 || r.current_equip_value == null) continue;
      const m = eqByTick.get(t) || eqByTick.set(t, { 0: [0, 0, 0], 1: [0, 0, 0] }).get(t);
      m[s][0] += r.current_equip_value | 0; m[s][1] += r.balance | 0; m[s][2]++;
    }
  }

  // Real team names, when the demo carries them: the clan name most common among each team's players at the end of round 1's freeze time.
  const teamOfId = new Map(a.players.map(p => [p.id, p.team]));
  const tally = { A: {}, B: {} };
  for (const r of byTick.get(freezeTicks[0]) || []) {
    const t = teamOfId.get(anon(String(r.steamid))), n = r.team_clan_name;
    if (t && n) tally[t][n] = (tally[t][n] || 0) + 1;
  }
  const top = o => Object.entries(o).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
  const teamNames = { A: top(tally.A), B: top(tally.B) };
  if (teamNames.A || teamNames.B) a.teamNames = teamNames;

  return {
    map: a.map, step: STEP, teamNames: a.teamNames || null, ids: ids.map(anon), names, weapons, frames, util, bomb, kills,
    rounds: a.rounds.map((r, i) => ({
      n: r.n, start: a.roundStarts[i], end: a.endTicks[i], winner: r.winner, reason: r.reason,
      freezeEnd: freezeTicks[i], aSide: r.aSide, eq: eqByTick.get(freezeTicks[i]) || null,
    })),
    score: a.score,
  };
}

// duels: "attackerId>victimId" -> [kills, headshots] within one demo
export function duelsOf(a) {
  const byName = {};
  a.players.forEach(p => { byName[p.name] = p.id; });
  const o = {};
  a.rounds.forEach(r => r.kills.forEach(k => {
    const x = byName[k.attacker], y = byName[k.victim];
    if (!x || !y || x === y) return;
    const e = o[x + '>' + y] || (o[x + '>' + y] = [0, 0]);
    e[0]++; if (k.hs) e[1]++;
  }));
  return o;
}

// Compact per-demo entry for the index page.
export function summarise(a) {
  return {
    file: a.file, slug: a.slug, map: a.map, n: a.nRounds, score: a.score, duels: duelsOf(a), date: a.date || 0, dsrc: a.dateSource || '',
    teamNames: a.teamNames, sample: a.sample, title: a.title, event: a.event, source: a.source, credit: a.credit,
    players: a.players.map(p => ({ id: p.id, name: p.name, team: p.team, k: p.k, d: p.d, a: p.a, adr: p.adr, kast: p.kast, hs: p.hsPct, r: p.rating, ok: p.openK, od: p.openD })),
  };
}

// CS2 demos carry no match date: use a YYYY-MM-DD in the path if there is one, else the file's modified time (ms).
export function demoDate(relPath, mtimeMs) {
  const m = relPath.match(/(?<!\d)(20\d\d)[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?!\d)/);
  if (m) return { date: Date.UTC(+m[1], +m[2] - 1, +m[3], 12), dateSource: 'filename' };
  return { date: Math.round(mtimeMs), dateSource: 'file' };
}
