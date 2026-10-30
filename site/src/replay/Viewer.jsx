import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { money, mapName } from '../lib/util.js';
import { COLORS, HEAT_GRADIENT, ICONS, ReplayEngine, SN, drawIcon, reasonOf } from './engine.js';

function IconBadge({ kind }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; c.width = c.height = 36;
    drawIcon(c.getContext('2d'), kind, 18, 18, 15, 3);
  }, [kind]);
  return <canvas ref={ref} />;
}

const LABEL = { smoke: 'Smoke', flash: 'Flash', molly: 'Molly', he: 'HE' };

function TeamPanel({ side, cards, hdr, onSelect, focus }) {
  return (
    <div className={'rv-col ' + (side ? 'r' : 'l')}>
      {hdr && <div className="th2"><b>{hdr.kind}</b> · equip {money(hdr.equip)} · bank {money(hdr.bank)}</div>}
      {cards.map(c => (
        <div key={c.i} className={'pc ' + SN[side] + (c.hp > 0 ? '' : ' dead') + (c.sel ? ' sel' : '') + (focus && !c.sel ? ' dim' : '')} onClick={() => onSelect(c.i)}>
          <div className="n"><span>{c.name}</span><span>${c.money}</span></div>
          <div className={'pbar' + (c.hp <= 25 ? ' low' : '')}><i style={{ width: c.hp + '%' }} /></div>
          <div className="s"><span>{c.hp} HP{c.armor ? ` · ◈${c.armor}` : ''}</span><span>{c.weapon}</span></div>
        </div>
      ))}
    </div>
  );
}

const HEAT_LAYERS = [['off', 'Off'], ['deaths', 'Deaths'], ['kills', 'Kills'], ['paths', 'Paths']];
const HEAT_HELP = { deaths: 'where players died', kills: 'where kills were made from', paths: 'where players walked (after freeze time)' };

function HeatPanel({ hud, names, eng }) {
  const h = hud.heat, set = p => eng().setHeat(p), on = (a, b) => (a === b ? 'on' : '');
  return (
    <div className="rv-heat">
      <div className="row">{HEAT_LAYERS.map(([k, label]) => <button key={k} className={on(h.layer, k)} onClick={() => set({ layer: k })}>{label}</button>)}</div>
      {h.layer !== 'off' && (
        <>
          <div className="row"><span>Side</span>{[[-1, 'All'], [0, 'T'], [1, 'CT']].map(([v, label]) => <button key={v} className={on(h.side, v)} onClick={() => set({ side: v })}>{label}</button>)}</div>
          <div className="row"><span>Player</span>
            <select value={h.player} onChange={e => set({ player: +e.target.value })}>
              <option value={-1}>Everyone</option>
              {names.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
          </div>
          <div className="row"><span>Rounds</span>
            {[['all', 'All'], ['current', 'This round'], ['range', 'Range']].map(([m, label]) => <button key={m} className={on(h.rounds.mode, m)} onClick={() => set({ rounds: { mode: m } })}>{label}</button>)}
          </div>
          {h.rounds.mode === 'range' && (
            <div className="row"><span />
              <select value={h.rounds.from} onChange={e => set({ rounds: { from: +e.target.value } })}>{Array.from({ length: hud.nRounds }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
              <span>to</span>
              <select value={h.rounds.to} onChange={e => set({ rounds: { to: +e.target.value } })}>{Array.from({ length: hud.nRounds }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
            </div>
          )}
          <div className="legend" style={{ background: HEAT_GRADIENT[h.layer] }} />
          <div className="hint">{hud.heatN ? hud.heatN + ' points: ' + HEAT_HELP[h.layer] : 'No points for these filters'}</div>
        </>
      )}
    </div>
  );
}

function RoundInfo({ r }) {
  const [ic, tx] = r.result ? reasonOf(r.result.reason) : [];
  const parts = [
    <span className="rn" key="n">Round {r.n}</span>,
    <span key="k">Kills {r.kills} / {r.total}</span>,
  ];
  if (r.entry) parts.push(<span key="e">Entry: <b className={SN[r.entry.side]}>{r.entry.a}</b> ✕ {r.entry.v}</span>);
  r.multi.forEach(m => parts.push(<span key={'m' + m.name}>{m.n >= 5 ? 'ACE' : m.n + 'K'}: <b className={SN[m.side]}>{m.name}</b></span>));
  r.clutch.forEach(c => parts.push(
    <span key={'c' + c.name}>Clutch: <b className={SN[c.side]}>{c.name}</b> 1v{c.n}{' '}
      {c.res === 'won' && <span className="ok">✔ won</span>}{c.res === 'lost' && <span className="no">✖ lost</span>}</span>
  ));
  if (r.result) parts.push(<span key="r"><b className={r.result.winner}>{r.result.winner} won</b> {ic} {tx}</span>);
  return <div className="rv-rinfo">{parts.reduce((acc, p, i) => (i ? [...acc, <span key={'s' + i} style={{ opacity: 0.4 }}>·</span>, p] : [p]), [])}</div>;
}

const EMPTY = {
  playing: false, speed: 2, drawOn: false, tool: 'pen', color: COLORS[0], trail: true, names: true, level: 'upper', hasLower: false, focus: false, selected: -1,
  heat: { layer: 'off', side: -1, player: -1, rounds: { mode: 'all', from: 1, to: 1 } }, heatN: 0, nRounds: 1,
  clock: { big: '', small: '', bomb: false, round: 1, total: 1 }, scoreT: 0, scoreCT: 0, teamT: '', teamCT: '',
  cards: [[], []], hdr: [null, null], feed: [], rinfo: { n: 1, kills: 0, total: 0, multi: [], clutch: [], entry: null, result: null },
};

export default function Viewer({ data, radar, slug }) {
  const cvRef = useRef(null), tlRef = useRef(null), eng = useRef(null);
  const [live, setHud] = useState(null);
  const [tip, setTip] = useState(null);
  const [heatOpen, setHeatOpen] = useState(false);

  useEffect(() => {
    const e = new ReplayEngine(data, radar, cvRef.current, tlRef.current, setHud);
    eng.current = e;
    const ro = new ResizeObserver(() => e.fit());
    ro.observe(cvRef.current); ro.observe(tlRef.current);
    const onKey = ev => {
      if (ev.target.tagName === 'SELECT' || ev.target.tagName === 'INPUT') return;
      const k = ev.key;
      if (k === 'd' || k === 'D') { e.setDraw(!e.drawOn); return; }
      if (k === 'Escape' && e.drawOn) { e.setDraw(false); return; }
      if (e.drawOn && (ev.ctrlKey || ev.metaKey) && k.toLowerCase() === 'z') { ev.preventDefault(); e.undo(); return; }
      if (ev.code === 'Space') { ev.preventDefault(); e.toggle(); }
      else if (ev.code === 'ArrowRight') e.seekSec(5);
      else if (ev.code === 'ArrowLeft') e.seekSec(-5);
      else if (k === '.') e.jumpRound(1);
      else if (k === ',') e.jumpRound(-1);
      else if (k === 'f' || k === 'F') e.toggleFocus();
      else if (k === 'h' || k === 'H') setHeatOpen(o => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); ro.disconnect(); e.destroy(); eng.current = null; };
  }, [data, radar]);

  const E = () => eng.current;
  const hud = live || EMPTY;

  return (
    <div className="rv">
      <div className="rv-hud">
        <Link className="back" to={`/demo/${slug}`}>← report</Link>
        <div className="rv-team T"><span>{hud.scoreT}</span><small>{hud.teamT}</small></div>
        <div className={'rv-clock' + (hud.clock.bomb ? ' bomb' : '')}><b>{hud.clock.big}</b><div>Round {hud.clock.round} / {hud.clock.total} · {hud.clock.small}</div></div>
        <div className="rv-team CT"><small>{hud.teamCT}</small><span>{hud.scoreCT}</span></div>
        <div className="meta">{mapName(data.map)}</div>
      </div>

      <div className="rv-mid">
        <TeamPanel side={0} cards={hud.cards[0]} hdr={hud.hdr[0]} focus={hud.focus} onSelect={i => E().selectPlayer(i)} />
        <div className="rv-stage">
          <canvas ref={cvRef} />
          <div className="rv-tools">
            <button className={hud.trail ? 'on' : ''} onClick={() => E().setOpt('trail', !hud.trail)}>Trails</button>
            <button className={hud.names ? 'on' : ''} onClick={() => E().setOpt('names', !hud.names)}>Names</button>
            {hud.hasLower && <button onClick={() => E().setOpt('level', hud.level === 'upper' ? 'lower' : 'upper')}>Level: {hud.level}</button>}
            <button className={hud.focus ? 'on' : ''} title="Fade everyone but the selected player (F). Click a player to select." onClick={() => E().toggleFocus()}>Focus</button>
            <button className={hud.heat.layer !== 'off' ? 'on' : heatOpen ? 'on' : ''} title="Heatmaps of deaths, kills and paths (H)" onClick={() => setHeatOpen(o => !o)}>Heatmap</button>
            <button onClick={() => E().resetView()}>Reset view</button>
            <button className={hud.drawOn ? 'on' : ''} title="Draw on the paused frame (D)" onClick={() => E().setDraw(!hud.drawOn)}>✏ Draw</button>
          </div>
          {hud.drawOn && (
            <div className="rv-dtools">
              {['pen', 'line', 'arrow', 'circle'].map(t => <button key={t} className={hud.tool === t ? 'on' : ''} onClick={() => E().setTool(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
              <span className="sep" />
              {ICONS.map(k => <button key={k} className={hud.tool === k ? 'on' : ''} title={'Place ' + LABEL[k]} onClick={() => E().setTool(k)}><IconBadge kind={k} />{LABEL[k]}</button>)}
              <span className="rv-sw">{COLORS.map(c => <i key={c} className={hud.color === c ? 'on' : ''} style={{ background: c }} onClick={() => E().setColor(c)} />)}</span>
              <button onClick={() => E().undo()}>Undo</button>
              <button onClick={() => E().clearDrawings()}>Clear</button>
              <button title="Save as PNG" onClick={() => E().savePng()}>📷 Save</button>
              <span className="hint">Stays on this frame</span>
            </div>
          )}
          {heatOpen && <HeatPanel hud={hud} names={data.names} eng={E} />}
          <div className="rv-feed">
            {hud.feed.map((k, i) => (
              <div key={i}>
                <span style={{ color: ['#e8a94b', '#5da9ff'][k[5]] || '#ccc' }}>{k[1] || 'World'}</span>{' '}
                <span style={{ color: 'var(--mut)' }}>{k[3]}{k[4] ? ' ⌖' : ''}</span>{' '}
                <span style={{ color: ['#e8a94b', '#5da9ff'][k[6]] || '#ccc' }}>{k[2]}</span>
              </div>
            ))}
          </div>
        </div>
        <TeamPanel side={1} cards={hud.cards[1]} hdr={hud.hdr[1]} focus={hud.focus} onSelect={i => E().selectPlayer(i)} />
      </div>

      <div className="rv-bottom">
        <RoundInfo r={hud.rinfo} />
        <div className="rv-ctl">
          <button onClick={() => E().jumpRound(-1)}>⏮</button>
          <button style={{ minWidth: 70 }} onClick={() => E().toggle()}>{hud.playing ? 'Pause' : 'Play'}</button>
          <button onClick={() => E().jumpRound(1)}>⏭</button>
          <select value={hud.speed} onChange={e => E().setSpeed(+e.target.value)}>
            {[0.5, 1, 2, 4, 8, 16].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="muted">x speed</span>
          <span className="sp" />
          <span className="muted"><kbd>Space</kbd> play · <kbd>←</kbd><kbd>→</kbd> 5s · <kbd>,</kbd><kbd>.</kbd> round · <kbd>D</kbd> draw · <kbd>F</kbd> focus · <kbd>H</kbd> heatmap · wheel zoom · drag pan</span>
        </div>
        <div className="rv-tlwrap">
          <canvas ref={tlRef}
            onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, text: E()?.roundTip(e.clientX) })}
            onMouseLeave={() => setTip(null)} />
        </div>
      </div>
      {tip && <div className="rv-tip" style={{ left: tip.x + 10, top: tip.y - 34 }}>{tip.text}</div>}
    </div>
  );
}

