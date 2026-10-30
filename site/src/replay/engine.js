// Imperative 2D replay engine: canvas drawing, camera, playback, annotations and timeline.
// React owns the surrounding UI and receives a plain "hud" snapshot through onHud.
import { asset } from '../lib/data.js';

export const TPS = 64;
export const COL = ['#e8a94b', '#5da9ff'];
export const SN = ['T', 'CT'];
export const ICONS = ['smoke', 'flash', 'molly', 'he'];
export const COLORS = ['#ff4d3d', '#ffd23f', '#4fd37a', '#ffffff', '#4cc9f0'];

const REASON = {
  bomb_exploded: ['💣', 'Bombed'], bomb_defused: ['✂', 'Defused'], t_killed: ['☠', 'T wiped'],
  ct_killed: ['☠', 'CT wiped'], time_ran_out: ['⏱', 'Time'], target_saved: ['⏱', 'Saved'],
};
export const reasonOf = r => REASON[r] || ['•', String(r || '').replace(/_/g, ' ')];

// Grenade badge: dark disc, coloured rim and a simple glyph. Shared by the map and the toolbar buttons.
export function drawIcon(g, kind, x, y, r, lw) {
  const rim = { smoke: '#c9ced4', flash: '#fff3a0', molly: '#ff7a2e', he: '#ff4d3d' }[kind];
  g.save(); g.lineWidth = lw; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = r * 0.3;
  g.fillStyle = '#10141a'; g.strokeStyle = rim; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); g.shadowBlur = 0;
  if (kind === 'smoke') {
    g.fillStyle = '#d5d9de';
    [[-0.32, 0.12, 0.3], [0.3, 0.14, 0.28], [0, -0.14, 0.36], [-0.12, 0.22, 0.26], [0.14, 0.22, 0.26]].forEach(c => { g.beginPath(); g.arc(x + c[0] * r, y + c[1] * r, c[2] * r, 0, 7); g.fill(); });
  } else if (kind === 'flash') {
    g.fillStyle = '#fff3a0'; g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? r * 0.24 : r * 0.68; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  } else if (kind === 'molly') {
    g.fillStyle = '#ff7a2e'; g.beginPath(); g.moveTo(x, y - r * 0.7); g.quadraticCurveTo(x + r * 0.72, y + r * 0.05, x, y + r * 0.66); g.quadraticCurveTo(x - r * 0.72, y + r * 0.05, x, y - r * 0.7); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x, y - r * 0.1); g.quadraticCurveTo(x + r * 0.34, y + r * 0.3, x, y + r * 0.58); g.quadraticCurveTo(x - r * 0.34, y + r * 0.3, x, y - r * 0.1); g.fill();
  } else {
    g.fillStyle = '#ff4d3d'; g.beginPath(); g.arc(x, y + r * 0.14, r * 0.4, 0, 7); g.fill();
    g.fillStyle = '#d5d9de'; g.fillRect(x - r * 0.12, y - r * 0.46, r * 0.24, r * 0.22);
    g.strokeStyle = '#d5d9de'; g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(x + r * 0.1, y - r * 0.4); g.lineTo(x + r * 0.42, y - r * 0.26); g.stroke();
  }
  g.restore();
}

// Colour ramps: [position, r, g, b]. Paths use the brand palette; deaths use the "bad" red/amber; kills use teal.
const HEAT_RAMPS = {
  paths: [[0, 142, 30, 162], [0.5, 198, 84, 195], [0.8, 237, 150, 215], [1, 255, 192, 222]],
  deaths: [[0, 139, 30, 30], [0.5, 229, 83, 75], [0.8, 255, 210, 63], [1, 255, 246, 200]],
  kills: [[0, 20, 90, 100], [0.5, 111, 211, 201], [1, 230, 255, 250]],
};
function rampColor(ramp, t) {
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) { const a = ramp[i - 1], b = ramp[i], f = (t - a[0]) / (b[0] - a[0] || 1); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]; }
  }
  const l = ramp[ramp.length - 1]; return [l[1], l[2], l[3]];
}
export const HEAT_GRADIENT = Object.fromEntries(Object.entries(HEAT_RAMPS).map(([k, r]) => [k, 'linear-gradient(90deg,' + r.map(s => 'rgb(' + s.slice(1).join(',') + ') ' + Math.round(s[0] * 100) + '%').join(',') + ')']));

const loadImg = src => { const i = new Image(); i.src = src; return i; };

export class ReplayEngine {
  constructor(D, radar, cv, tl, onHud) {
    this.D = D; this.F = D.frames; this.nF = this.F.length; this.step = D.step;
    this.cv = cv; this.ctx = cv.getContext('2d'); this.tl = tl; this.tctx = tl.getContext('2d');
    this.onHud = onHud; this.radar = radar; this.imgs = {};
    if (radar) {
      this.imgs.upper = loadImg(asset(`maps/${D.map}.png`));
      if (radar.hasLower) this.imgs.lower = loadImg(asset(`maps/${D.map}_lower.png`));
    }
    // fallback bounds when there is no radar for this map
    const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    for (const f of this.F) for (const q of f[1]) if (q) { b.x0 = Math.min(b.x0, q[0]); b.x1 = Math.max(b.x1, q[0]); b.y0 = Math.min(b.y0, q[1]); b.y1 = Math.max(b.y1, q[1]); }
    this.b = b;

    this.view = { cx: 0.5, cy: 0.5, k: 1 };
    this.W = this.H = this.S = 0; this.dpr = 1;
    this.playing = false; this.speed = 2; this.lastTs = 0; this.lastHud = 0;
    this.trail = true; this.names = true; this.level = 'upper'; this.selected = -1; this.focus = false;
    // heatmap overlay: layer off|deaths|kills|paths, side -1|0|1, player -1|index, rounds all|current|range
    this.heat = { layer: 'off', side: -1, player: -1, rounds: { mode: 'all', from: 1, to: D.rounds.length } };
    this.heatDirty = false; this.heatCanvas = null; this.heatN = 0; this.heatCur = -1;
    // canvas background matches the --stage colour from the stylesheet
    this.stage = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#c7a0e3';
    this.drawOn = false; this.tool = 'pen'; this.color = COLORS[0]; this.cur = null; this.ann = {};
    this.drag = null; this.tlDrag = false;
    this.nameIdx = {}; D.names.forEach((n, i) => { this.nameIdx[n] = i; });

    let sa = 0, sb = 0;
    this.RSCORE = D.rounds.map(r => { if (r.winner) (r.winner === r.aSide ? sa++ : sb++); return [sa, sb]; });
    this.INFO = D.rounds.map(r => this.analyseRound(r));
    this.pos = this.frameOfTick(D.rounds[0].start);

    this.fit();
    this.bind();
    this.raf = requestAnimationFrame(ts => this.loop(ts));
  }

  // ---------- geometry ----------
  world(x, y) {
    if (this.radar) { const o = this.radar.ov; return [(x - o[0]) / o[2] / 1024, (o[1] - y) / o[2] / 1024]; }
    const b = this.b, m = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 1.12 || 1;
    return [(x - (b.x0 + b.x1) / 2) / m + 0.5, 0.5 - (y - (b.y0 + b.y1) / 2) / m];
  }
  levelOf(z) { const r = this.radar; return r && r.hasLower && r.lowerBelow != null && z < r.lowerBelow ? 'lower' : 'upper'; }
  toScr(u, v) { return [(u - this.view.cx) * this.view.k * this.S + this.W / 2, (v - this.view.cy) * this.view.k * this.S + this.H / 2]; }
  toMap(sx, sy) { return [(sx - this.W / 2) / (this.view.k * this.S) + this.view.cx, (sy - this.H / 2) / (this.view.k * this.S) + this.view.cy]; }
  P(x, y) { const w = this.world(x, y); return this.toScr(w[0], w[1]); }

  fit() {
    this.dpr = window.devicePixelRatio || 1;
    let r = this.cv.getBoundingClientRect();
    this.W = this.cv.width = Math.round(r.width * this.dpr); this.H = this.cv.height = Math.round(r.height * this.dpr); this.S = Math.min(this.W, this.H);
    r = this.tl.getBoundingClientRect();
    this.tl.width = Math.round(r.width * this.dpr); this.tl.height = Math.round(r.height * this.dpr);
  }

  // ---------- time ----------
  tickOf(p) { const i = Math.min(this.nF - 1, Math.floor(p)), j = Math.min(this.nF - 1, i + 1); return this.F[i][0] + (this.F[j][0] - this.F[i][0]) * (p - i); }
  frameOfTick(t) { let lo = 0, hi = this.nF - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (this.F[m][0] < t) lo = m + 1; else hi = m; } return lo; }
  roundIdx(t) { let r = 0; for (let i = 0; i < this.D.rounds.length; i++) if (t >= this.D.rounds[i].start) r = i; return r; }

  playerAt(i, p) {
    const F = this.F, nF = this.nF, a = Math.min(nF - 1, Math.floor(p)), bI = Math.min(nF - 1, a + 1), f = p - a;
    const A = F[a][1][i], B = F[bI][1][i];
    if (!A) return null;
    if (!B || f === 0 || A[3] <= 0 || B[3] <= 0) return A;
    const dx = B[0] - A[0], dy = B[1] - A[1];
    if (dx * dx + dy * dy > 600 * 600) return A;
    const dyaw = ((B[4] - A[4] + 540) % 360) - 180;
    return [A[0] + dx * f, A[1] + dy * f, A[2] + (B[2] - A[2]) * f, A[3], A[4] + dyaw * f, A[5], A[6], A[7], A[8]];
  }

  // ---------- per-round analysis (entry / multi-kills / clutches), revealed progressively ----------
  analyseRound(r) {
    const pl = this.F[this.frameOfTick(r.freezeEnd)][1], alive = [new Set(), new Set()];
    pl.forEach((q, i) => { if (q && q[3] > 0 && q[5] >= 0) alive[q[5]].add(this.D.names[i]); });
    const ks = this.D.kills.filter(k => k[0] >= r.start && k[0] <= r.end);
    const o = { entry: null, multi: [], clutch: [], ticks: ks.map(k => k[0]) }, cnt = {}, t3 = {}, done = [false, false];
    ks.forEach((k, j) => {
      if (j === 0 && k[1]) o.entry = { tick: k[0], a: k[1], v: k[2], side: k[5] };
      if (k[1]) { cnt[k[1]] = (cnt[k[1]] || 0) + 1; if (cnt[k[1]] === 3) t3[k[1]] = { tick: k[0], side: k[5] }; }
      if (k[6] >= 0) alive[k[6]].delete(k[2]);
      for (const s of [0, 1]) if (!done[s] && alive[s].size === 1 && alive[1 - s].size >= 2) { done[s] = true; o.clutch.push({ tick: k[0], name: [...alive[s]][0], side: s, n: alive[1 - s].size }); }
    });
    for (const n in t3) o.multi.push({ tick: t3[n].tick, name: n, n: cnt[n], side: t3[n].side });
    return o;
  }

  // ---------- HUD snapshot for React ----------
  computeHud() {
    const D = this.D, t = this.tickOf(this.pos), ri = this.roundIdx(t), R = D.rounds[ri];
    let planted = null, over = null;
    for (const e of D.bomb) { if (e[0] > t || e[0] < R.start) continue; if (e[1] === 'plant') planted = e; else over = e; }

    let big, small = '', bomb = false;
    if (planted && !over) { big = Math.ceil(Math.max(0, 40 - (t - planted[0]) / TPS)) + 's'; small = 'bomb planted'; bomb = true; }
    else if (t < R.freezeEnd) { big = Math.ceil((R.freezeEnd - t) / TPS) + 's'; small = 'freeze time'; }
    else {
      const left = Math.max(0, 115 - (t - R.freezeEnd) / TPS);
      big = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
      small = over ? (over[1] === 'defuse' ? 'bomb defused' : 'bomb exploded') : 'round time';
    }
    if (t >= R.end && R.winner) small = R.winner + ' win';

    let sA = 0, sB = 0;
    for (let i = 0; i < ri; i++) { const r = D.rounds[i]; if (r.winner) (r.winner === r.aSide ? sA++ : sB++); }
    if (t >= R.end && R.winner) (R.winner === R.aSide ? sA++ : sB++);
    const tIsA = R.aSide === 'T';

    const cards = [[], []], p = Math.round(this.pos);
    for (let i = 0; i < D.ids.length; i++) {
      const q = this.playerAt(i, p);
      if (!q || q[5] < 0) continue;
      cards[q[5]].push({ i, name: D.names[i], hp: q[3], money: q[8], armor: q[6], weapon: D.weapons[q[7]] || '', sel: i === this.selected });
    }
    const hdr = s => {
      const e = R.eq && R.eq[s];
      if (!e || !e[2]) return null;
      const avg = e[0] / e[2], pistol = ri === 0 || ri === 12;
      const kind = pistol ? 'Pistol round' : avg < 1000 ? 'Eco' : avg < 2000 ? 'Semi-eco' : avg < 3300 ? 'Force buy' : 'Full buy';
      return { kind, equip: e[0], bank: e[1] };
    };

    const feed = D.kills.filter(k => k[0] <= t && k[0] >= R.start && t - k[0] < 640).slice(-6);

    const I = this.INFO[ri];
    const rinfo = {
      n: R.n, kills: I.ticks.filter(x => x <= t).length, total: I.ticks.length,
      entry: I.entry && t >= I.entry.tick ? I.entry : null,
      multi: I.multi.filter(m => t >= m.tick),
      clutch: I.clutch.filter(c => t >= c.tick).map(c => ({ ...c, res: t >= R.end ? (R.winner === SN[c.side] ? 'won' : 'lost') : null })),
      result: t >= R.end && R.winner ? { winner: R.winner, reason: R.reason } : null,
    };

    return {
      playing: this.playing, speed: this.speed, drawOn: this.drawOn, tool: this.tool, color: this.color,
      trail: this.trail, names: this.names, level: this.level, focus: this.focus, selected: this.selected, heat: this.heat, heatN: this.heatN, nRounds: D.rounds.length, hasLower: !!(this.radar && this.radar.hasLower),
      clock: { big, small, bomb, round: R.n, total: D.rounds.length },
      scoreT: tIsA ? sA : sB, scoreCT: tIsA ? sB : sA, teamT: tIsA ? 'Team A' : 'Team B', teamCT: tIsA ? 'Team B' : 'Team A',
      cards, hdr: [hdr(0), hdr(1)], feed, rinfo,
    };
  }
  emit() { this.onHud(this.computeHud()); }

  // ---------- heatmaps ----------
  setHeat(p) {
    const h = this.heat;
    if (p.layer != null) h.layer = p.layer;
    if (p.side != null) h.side = p.side;
    if (p.player != null) h.player = p.player;
    if (p.rounds) h.rounds = { ...h.rounds, ...p.rounds };
    this.heatDirty = true; this.emit();
  }
  // Density of deaths / kills / movement on a 256x256 grid over the radar, blurred and colour-mapped once;
  // drawing it each frame is a single drawImage. Rebuilt only when the filters, level or (in "this round" mode) the round change.
  buildHeat() {
    const h = this.heat, D = this.D, F = this.F, N = 256;
    this.heatDirty = false;
    if (h.layer === 'off') { this.heatCanvas = null; this.heatN = 0; return; }
    const grid = new Float32Array(N * N), hasLower = this.radar && this.radar.hasLower;
    let n = 0;
    const add = (x, y, z) => {
      if (hasLower && this.levelOf(z) !== this.level) return;
      const [u, v] = this.world(x, y), gx = Math.floor(u * N), gy = Math.floor(v * N);
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) return;
      grid[gy * N + gx] += 1; n++;
    };
    const cur = this.roundIdx(this.tickOf(this.pos)); this.heatCur = cur;
    let from = 0, to = D.rounds.length - 1;
    if (h.rounds.mode === 'current') from = to = cur;
    else if (h.rounds.mode === 'range') { from = Math.max(0, h.rounds.from - 1); to = Math.min(to, h.rounds.to - 1); if (from > to) [from, to] = [to, from]; }
    const sideOk = s => h.side === -1 || s === h.side;

    if (h.layer === 'paths') {
      for (let ri = from; ri <= to; ri++) {
        const R = D.rounds[ri], f0 = this.frameOfTick(R.freezeEnd), f1 = Math.min(this.frameOfTick(R.end), this.nF - 1);
        for (let f = f0; f <= f1; f++) {
          const pl = F[f][1];
          for (let i = 0; i < pl.length; i++) {
            if (h.player >= 0 && i !== h.player) continue;
            const q = pl[i];
            if (!q || q[3] <= 0 || !sideOk(q[5])) continue;
            add(q[0], q[1], q[2]);
          }
        }
      }
    } else {
      const t0 = D.rounds[from].start, t1 = D.rounds[to].end, deaths = h.layer === 'deaths';
      for (const k of D.kills) {
        if (k[0] < t0 || k[0] > t1) continue;
        const idx = this.nameIdx[deaths ? k[2] : k[1]];
        if (idx == null || (h.player >= 0 && idx !== h.player) || !sideOk(deaths ? k[6] : k[5])) continue;
        const fi = Math.min(this.frameOfTick(k[0]), this.nF - 1);
        // a victim's last tracked position is where they fell; a killer is read from the frame just before the kill
        const q = deaths ? (F[fi][1][idx] || (F[fi - 1] && F[fi - 1][1][idx])) : (F[Math.max(0, fi - 1)][1][idx] || F[fi][1][idx]);
        if (q) add(q[0], q[1], q[2]);
      }
    }
    this.heatN = n;
    if (!n) { this.heatCanvas = null; return; }

    // separable gaussian blur
    const sigma = h.layer === 'paths' ? 2.2 : 4.5, R = Math.ceil(sigma * 3), ker = [];
    let ks = 0; for (let i = -R; i <= R; i++) { const w = Math.exp(-(i * i) / (2 * sigma * sigma)); ker.push(w); ks += w; }
    for (let i = 0; i < ker.length; i++) ker[i] /= ks;
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < N) s += grid[y * N + xx] * ker[k + R]; } tmp[y * N + x] = s; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < N) s += tmp[yy * N + x] * ker[k + R]; } out[y * N + x] = s; }

    // scale to the 97th percentile of occupied cells so one hot spot cannot wash everything else out
    const vals = []; for (let i = 0; i < out.length; i++) if (out[i] > 1e-4) vals.push(out[i]);
    vals.sort((a, b) => a - b);
    const top = vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.97))] : 1;
    const ramp = HEAT_RAMPS[h.layer];
    const c = this.heatCanvas && this.heatCanvas.width === N ? this.heatCanvas : Object.assign(document.createElement('canvas'), { width: N, height: N });
    const g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let i = 0; i < out.length; i++) {
      const t = Math.min(1, out[i] / top);
      if (t < 0.04) continue;
      const [r, gg, b] = rampColor(ramp, t), o = i * 4;
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = Math.round(255 * Math.min(1, 0.25 + t) * 0.85);
    }
    g.putImageData(img, 0, 0);
    this.heatCanvas = c;
  }

  // ---------- drawing the map ----------
  draw() {
    const { ctx, D, W, H, S, view, dpr } = this;
    const t = this.tickOf(this.pos), R = D.rounds[this.roundIdx(t)];
    ctx.fillStyle = this.stage; ctx.fillRect(0, 0, W, H);
    const tl0 = this.toScr(0, 0), br = this.toScr(1, 1);
    const want = this.imgs[this.level], img = want && want.complete && want.naturalWidth ? want : (this.imgs.upper && this.imgs.upper.complete ? this.imgs.upper : null);
    if (img) { ctx.globalAlpha = 0.9; ctx.drawImage(img, tl0[0], tl0[1], br[0] - tl0[0], br[1] - tl0[1]); ctx.globalAlpha = 1; }
    else { ctx.strokeStyle = '#222a35'; ctx.strokeRect(tl0[0], tl0[1], br[0] - tl0[0], br[1] - tl0[1]); }
    if (this.heatCanvas) { ctx.imageSmoothingEnabled = true; ctx.drawImage(this.heatCanvas, tl0[0], tl0[1], br[0] - tl0[0], br[1] - tl0[1]); }
    const U = S * view.k;

    // utility effects
    for (const u of D.util) {
      if (t < u[0] || t > u[0] + u[4]) continue;
      const [x, y] = this.P(u[1], u[2]), age = (t - u[0]) / u[4], k = u[3];
      ctx.beginPath();
      if (k === 'smoke') { ctx.arc(x, y, U * 0.026, 0, 7); ctx.fillStyle = 'rgba(110,100,150,' + (age > 0.85 ? 0.5 * (1 - age) / 0.15 : 0.5) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(60,40,100,.45)'; ctx.stroke(); }
      else if (k === 'fire') { ctx.arc(x, y, U * 0.018, 0, 7); ctx.fillStyle = 'rgba(255,110,30,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,170,60,.8)'; ctx.stroke(); }
      else { const rr = U * (0.012 + 0.05 * age); ctx.arc(x, y, rr, 0, 7); ctx.strokeStyle = k === 'flash' ? 'rgba(224,168,0,' + (1 - age) + ')' : 'rgba(255,90,70,' + (1 - age) + ')'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
    }

    // planted bomb
    let planted = null, over = null;
    for (const e of D.bomb) { if (e[0] > t || e[0] < R.start) continue; if (e[1] === 'plant') planted = e; else over = e; }
    if (planted && planted[2] != null && !over) {
      const [x, y] = this.P(planted[2], planted[3]), el = (t - planted[0]) / TPS;
      ctx.fillStyle = '#ff4d3d'; ctx.beginPath(); ctx.arc(x, y, U * 0.009, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,77,61,' + (0.35 + 0.35 * Math.sin(el * 8)) + ')'; ctx.beginPath(); ctx.arc(x, y, U * (0.016 + 0.012 * ((el * 2) % 1)), 0, 7); ctx.stroke();
    }

    // kill lines
    for (const k of D.kills) {
      if (t < k[0] || t > k[0] + 80) continue;
      const ai = this.nameIdx[k[1]], vi = this.nameIdx[k[2]];
      if (ai == null || vi == null) continue;
      const A = this.playerAt(ai, this.pos), V = this.playerAt(vi, this.pos);
      if (!A || !V) continue;
      const [ax, ay] = this.P(A[0], A[1]), [vx, vy] = this.P(V[0], V[1]);
      ctx.strokeStyle = 'rgba(60,10,80,' + (0.8 * (1 - (t - k[0]) / 80)) + ')'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(vx, vy); ctx.stroke();
    }

    // players: dead first, then alive on top. Focus mode softens everyone except the selected player.
    const fo = this.focus && this.selected >= 0;
    const alive = [], dead = [];
    for (let i = 0; i < D.ids.length; i++) { const q = this.playerAt(i, this.pos); if (!q) continue; (q[3] > 0 ? alive : dead).push([i, q]); }
    for (const [i, q] of dead) {
      const [x, y] = this.P(q[0], q[1]), d = U * 0.007;
      ctx.strokeStyle = COL[q[5]] || '#999'; ctx.globalAlpha = fo && i !== this.selected ? 0.22 : 0.7; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke(); ctx.lineWidth = 1; ctx.globalAlpha = 1;
    }
    const fs = Math.max(10 * dpr, U * 0.014), F = this.F, hasLower = this.radar && this.radar.hasLower;
    // draw the focused player last so they sit on top
    if (fo) alive.sort((a, b) => (a[0] === this.selected) - (b[0] === this.selected));
    for (const [i, q] of alive) {
      const [x, y] = this.P(q[0], q[1]), c = COL[q[5]] || '#999', onLvl = !hasLower || this.levelOf(q[2]) === this.level;
      const dim = fo && i !== this.selected, base = (onLvl ? 1 : 0.28) * (dim ? 0.35 : 1);
      ctx.globalAlpha = base;
      if (this.trail) {
        ctx.strokeStyle = c; ctx.globalAlpha = base * (dim ? 0.3 : 0.45); ctx.beginPath();
        let first = true;
        for (let j = Math.max(0, Math.floor(this.pos) - (fo && !dim ? 16 : 8)); j <= Math.floor(this.pos); j++) { const o = F[j][1][i]; if (!o || o[3] <= 0) continue; const s = this.P(o[0], o[1]); first ? ctx.moveTo(s[0], s[1]) : ctx.lineTo(s[0], s[1]); first = false; }
        ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = base;
      }
      const a = q[4] * Math.PI / 180, r = U * 0.0095 * (dim ? 0.7 : fo ? 1.15 : 1);
      if (!dim) { ctx.fillStyle = c + (fo ? '44' : '33'); ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, U * (fo ? 0.055 : 0.04), -a - 0.45, -a + 0.45); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#10141a'; ctx.beginPath(); ctx.arc(x, y, r + 2 * dpr, 0, 7); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = q[3] > 50 ? '#4fd37a' : q[3] > 25 ? '#e8c14b' : '#e5534b'; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.arc(x, y, r + 3 * dpr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * q[3] / 100); ctx.stroke(); ctx.lineWidth = 1;
      if (i === this.selected) { ctx.strokeStyle = '#2b0a3f'; ctx.beginPath(); ctx.arc(x, y, r + 7 * dpr, 0, 7); ctx.stroke(); }
      if (this.names && !dim) { ctx.font = '600 ' + fs + 'px system-ui,sans-serif'; ctx.fillStyle = '#2b0a3f'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 5; ctx.fillText(D.names[i], x + r + 6 * dpr, y - r); ctx.shadowBlur = 0; }
      ctx.globalAlpha = 1;
    }
    // annotations belong to the paused frame
    if (!this.playing) for (const s of (this.ann[Math.round(this.pos)] || [])) this.drawShape(s);
    if (this.cur) this.drawShape(this.cur);
  }

  drawShape(s) {
    const { ctx, dpr, S, view } = this;
    const pts = s.pts.map(p => this.toScr(p[0], p[1])), a = pts[0], b = pts[pts.length - 1];
    if (s.t === 'icon') { drawIcon(ctx, s.k, a[0], a[1], Math.max(11 * dpr, S * view.k * 0.026), 2 * dpr); return; }
    ctx.save(); ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = 3 * dpr; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 3 * dpr; ctx.beginPath();
    if (s.t === 'pen') { pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    else if (s.t === 'circle') { ctx.arc(a[0], a[1], Math.hypot(b[0] - a[0], b[1] - a[1]), 0, 7); ctx.stroke(); }
    else {
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (s.t === 'arrow' && Math.hypot(b[0] - a[0], b[1] - a[1]) > 4) {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 14 * dpr;
        ctx.beginPath(); ctx.moveTo(b[0], b[1]);
        ctx.lineTo(b[0] - L * Math.cos(ang - 0.4), b[1] - L * Math.sin(ang - 0.4)); ctx.lineTo(b[0] - L * Math.cos(ang + 0.4), b[1] - L * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- timeline ----------
  drawTL() {
    const { tctx: g, tl, D, dpr: d } = this;
    const w = tl.width, h = tl.height; g.clearRect(0, 0, w, h);
    const F = this.F, t0 = F[0][0], t1 = F[this.nF - 1][0], X = t => (t - t0) / (t1 - t0) * w;
    const curR = this.roundIdx(this.tickOf(this.pos)), barY = 17 * d, barH = 36 * d, font = (s, wt) => (wt || '500') + ' ' + s * d + 'px system-ui,sans-serif';
    D.rounds.forEach((r, i) => {
      const x0 = X(r.start) + 1, x1 = X(r.end) - 1, rw = x1 - x0, cw = rw / d, on = i === curR;
      g.fillStyle = on ? (r.winner === 'T' ? '#c9902f' : r.winner === 'CT' ? '#3d86cf' : '#666') : (r.winner === 'T' ? '#8a6428' : r.winner === 'CT' ? '#2a6aa8' : '#444');
      g.fillRect(x0, barY, rw, barH);
      if (on) { g.strokeStyle = '#2b0a3f'; g.lineWidth = 1.5 * d; g.strokeRect(x0, barY, rw, barH); }
      g.textBaseline = 'alphabetic'; g.fillStyle = on ? '#2b0a3f' : '#5e2f7d'; g.font = font(11, on ? '700' : '600');
      const sc = this.RSCORE[i][0] + '–' + this.RSCORE[i][1];
      g.fillText(cw > 64 ? 'R' + r.n + '  ' + sc : cw > 26 ? r.n : '', x0 + 2 * d, 12 * d);
      const [ic, tx] = reasonOf(r.reason); g.font = font(11, '500');
      if (cw >= 22) g.fillText(cw > 92 ? ic + ' ' + tx : ic, x0 + 2 * d, barY + barH + 13 * d);
    });
    for (const k of D.kills) { g.fillStyle = k[5] === 0 ? '#c76a10' : k[5] === 1 ? '#1d5fd0' : '#5e2f7d'; g.fillRect(X(k[0]) - d * 0.75, barY + barH - 13 * d, d * 1.5, 11 * d); }
    for (const e of D.bomb) {
      if (e[1] !== 'plant') continue;
      const x = X(e[0]), y = barY + 7 * d;
      g.fillStyle = '#ff4d3d'; g.beginPath(); g.moveTo(x, y - 5 * d); g.lineTo(x + 5 * d, y); g.lineTo(x, y + 5 * d); g.lineTo(x - 5 * d, y); g.fill();
    }
    const hr = D.rounds[12];
    if (hr) { const x = X(hr.start) - 1; g.strokeStyle = '#2b0a3f66'; g.setLineDash([3 * d, 3 * d]); g.beginPath(); g.moveTo(x, barY - 2 * d); g.lineTo(x, barY + barH + 2 * d); g.stroke(); g.setLineDash([]); }
    // playhead
    const px = X(this.tickOf(this.pos));
    g.fillStyle = '#2b0a3f'; g.fillRect(px - d, barY - 4 * d, 2 * d, barH + 8 * d);
  }
  tlTick(clientX) { const r = this.tl.getBoundingClientRect(), f = Math.min(1, Math.max(0, (clientX - r.left) / r.width)); return this.F[0][0] + f * (this.F[this.nF - 1][0] - this.F[0][0]); }
  roundTip(clientX) {
    const t = this.tlTick(clientX), i = this.roundIdx(t), r = this.D.rounds[i];
    const nk = this.D.kills.filter(k => k[0] >= r.start && k[0] <= r.end).length, [ic, tx] = reasonOf(r.reason);
    return 'Round ' + r.n + (r.winner ? ' · ' + r.winner + ' won — ' + ic + ' ' + tx : '') + ' · Team A ' + this.RSCORE[i][0] + '–' + this.RSCORE[i][1] + ' Team B · ' + nk + ' kills · ' + Math.round((r.end - r.start) / TPS) + 's';
  }

  // ---------- loop ----------
  loop(ts) {
    // pick up changes to the stage colour (cheap: twice a second)
    if ((this.frameNo = (this.frameNo || 0) + 1) % 30 === 0) this.stage = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || this.stage;
    const dt = Math.min(0.1, (ts - this.lastTs) / 1000); this.lastTs = ts;
    if (this.playing) {
      this.pos += dt * this.speed * TPS / this.step;
      if (this.pos >= this.nF - 1) { this.pos = this.nF - 1; this.playing = false; this.emit(); }
    }
    if (this.heatDirty || (this.heat.layer !== 'off' && this.heat.rounds.mode === 'current' && this.roundIdx(this.tickOf(this.pos)) !== this.heatCur)) this.buildHeat();
    this.drawTL(); this.draw();
    if (ts - this.lastHud > 90) { this.lastHud = ts; this.emit(); }
    this.raf = requestAnimationFrame(t => this.loop(t));
  }

  // ---------- controls ----------
  setPlaying(p) { this.playing = p; if (p && this.drawOn) this.setDraw(false); this.emit(); }
  toggle() { this.setPlaying(!this.playing); }
  setSpeed(s) { this.speed = s; this.emit(); }
  seekSec(s) { this.pos = Math.max(0, Math.min(this.nF - 1, this.pos + s * TPS / this.step)); this.emit(); }
  jumpRound(d) {
    const ri = this.roundIdx(this.tickOf(this.pos)), cur = this.D.rounds[ri];
    let n = ri + d; if (d < 0 && this.tickOf(this.pos) - cur.start > TPS * 3) n = ri;
    n = Math.max(0, Math.min(this.D.rounds.length - 1, n)); this.pos = this.frameOfTick(this.D.rounds[n].start); this.emit();
  }
  setOpt(k, v) { this[k] = v; if (k === 'level') this.heatDirty = true; this.emit(); }
  resetView() { this.view = { cx: 0.5, cy: 0.5, k: 1 }; }
  selectPlayer(i) { this.selected = this.selected === i ? -1 : i; if (this.selected < 0) this.focus = false; this.emit(); }
  toggleFocus() { if (this.selected < 0) { const i = this.nearestPlayer(this.W / 2, this.H / 2); if (i >= 0) this.selected = i; } this.focus = !this.focus && this.selected >= 0; this.emit(); }
  // nearest living player to a canvas point (device pixels), within a generous radius; -1 if none
  nearestPlayer(sx, sy, maxPx = Infinity) {
    let best = -1, bd = maxPx * maxPx;
    for (let i = 0; i < this.D.ids.length; i++) { const q = this.playerAt(i, this.pos); if (!q || q[3] <= 0) continue; const [x, y] = this.P(q[0], q[1]), d = (x - sx) ** 2 + (y - sy) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }

  // ---------- annotations ----------
  setDraw(on) {
    if (on && this.playing) this.playing = false;
    this.drawOn = on; if (on) this.pos = Math.round(this.pos);
    this.cur = null; this.cv.classList.toggle('draw', on); this.emit();
  }
  setTool(t) { this.tool = t; this.emit(); }
  setColor(c) { this.color = c; this.emit(); }
  undo() { const a = this.ann[Math.round(this.pos)]; if (a) a.pop(); }
  clearDrawings() { delete this.ann[Math.round(this.pos)]; }
  savePng() {
    this.draw();
    this.cv.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b);
      a.download = 'replay-round' + this.D.rounds[this.roundIdx(this.tickOf(this.pos))].n + '-tick' + Math.round(this.tickOf(this.pos)) + '.png';
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  // ---------- input ----------
  evPt(e) { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left) * this.dpr, (e.clientY - r.top) * this.dpr]; }
  bind() {
    const cv = this.cv, tl = this.tl;
    this.h = {
      wheel: e => {
        e.preventDefault();
        const [mx, my] = this.evPt(e), v = this.view, u = (mx - this.W / 2) / (v.k * this.S) + v.cx, w = (my - this.H / 2) / (v.k * this.S) + v.cy;
        const nk = Math.min(8, Math.max(0.6, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        v.k = nk; v.cx = u - (mx - this.W / 2) / (nk * this.S); v.cy = w - (my - this.H / 2) / (nk * this.S);
      },
      down: e => {
        if (this.drawOn) {
          if (e.button !== 0) return;
          const m = this.toMap(...this.evPt(e));
          this.cur = ICONS.includes(this.tool) ? { t: 'icon', k: this.tool, c: this.color, pts: [m] } : { t: this.tool, c: this.color, pts: [m, m] };
          return;
        }
        this.drag = { x: e.clientX, y: e.clientY, cx: this.view.cx, cy: this.view.cy }; cv.style.cursor = 'grabbing';
      },
      move: e => {
        if (this.cur) {
          const m = this.toMap(...this.evPt(e));
          if (this.cur.t === 'pen') this.cur.pts.push(m); else if (this.cur.t === 'icon') this.cur.pts = [m]; else this.cur.pts[1] = m;
        } else if (this.drag) {
          this.view.cx = this.drag.cx - (e.clientX - this.drag.x) * this.dpr / (this.view.k * this.S);
          this.view.cy = this.drag.cy - (e.clientY - this.drag.y) * this.dpr / (this.view.k * this.S);
        }
        if (this.tlDrag) this.pos = this.frameOfTick(this.tlTick(e.clientX));
      },
      up: e => {
        // a click (not a drag) on the map selects the nearest player
        if (this.drag && !this.cur && e && Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) < 4 && e.target === this.cv) {
          const [px, py] = this.evPt(e), i = this.nearestPlayer(px, py, 26 * this.dpr);
          this.selected = i >= 0 && i !== this.selected ? i : -1; if (this.selected < 0) this.focus = false; this.emit();
        }
        if (this.cur) {
          const k = Math.round(this.pos), c = this.cur;
          if (c.t === 'icon' || (c.pts.length > 1 && JSON.stringify(c.pts[0]) !== JSON.stringify(c.pts[c.pts.length - 1]))) (this.ann[k] = this.ann[k] || []).push(c);
          this.cur = null;
        }
        this.drag = null; this.tlDrag = false; cv.style.cursor = '';
      },
      tlDown: e => { this.tlDrag = true; this.pos = this.frameOfTick(this.tlTick(e.clientX)); },
    };
    cv.addEventListener('wheel', this.h.wheel, { passive: false });
    cv.addEventListener('mousedown', this.h.down);
    tl.addEventListener('mousedown', this.h.tlDown);
    window.addEventListener('mousemove', this.h.move);
    window.addEventListener('mouseup', this.h.up);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.cv.removeEventListener('wheel', this.h.wheel);
    this.cv.removeEventListener('mousedown', this.h.down);
    this.tl.removeEventListener('mousedown', this.h.tlDown);
    window.removeEventListener('mousemove', this.h.move);
    window.removeEventListener('mouseup', this.h.up);
  }
}
