import { useMemo, useState } from 'react';
import { aggregate } from '../../lib/stats.js';
import { rcls } from '../../lib/util.js';

const COLS = [['name', 'Player', 'l'], ['m', 'Matches'], ['rounds', 'Rounds'], ['k', 'K'], ['d', 'D'], ['a', 'A'], ['kd', 'K/D'], ['adr', 'ADR'], ['kast', 'KAST'], ['hs', 'HS%'], ['od', 'Open K-D'], ['r', 'Rating']];

export default function PlayersView({ demos, h2h, onCompare, onOpenPlayer }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ k: 'r', dir: -1 });
  const rows = useMemo(() => {
    const n = q.toLowerCase();
    const L = aggregate(demos).filter(p => !n || String(p.name).toLowerCase().includes(n));
    return L.sort((a, b) => {
      const x = a[sort.k], y = b[sort.k];
      return typeof x === 'string' ? sort.dir * -1 * x.localeCompare(y) * -1 : sort.dir * (x - y);
    });
  }, [demos, q, sort]);

  const clickHead = k => setSort(s => (s.k === k ? { k, dir: -s.dir } : { k, dir: k === 'name' ? 1 : -1 }));
  const pending = h2h.a && !h2h.b;
  const nameOf = id => demos.flatMap(d => d.players).find(p => p.id === id)?.name || id;

  return (
    <>
      <div className="bar">
        <input placeholder="Search player…" value={q} onChange={e => setQ(e.target.value)} />
        <span className="muted">Averages across the demos shown. Click a name for their matches, ⚔ to compare.</span>
        {pending && <span className="A">Pick a second player with ⚔ (first: {nameOf(h2h.a)})</span>}
      </div>
      <table>
        <thead>
          <tr>
            {COLS.map(([k, label, cls]) => (
              <th key={k} className={'s ' + (cls || '') + (sort.k === k ? ' on' : '')} onClick={() => clickHead(k)}>
                {label}{sort.k === k ? (sort.dir < 0 ? ' ▼' : ' ▲') : ''}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map(p => (
            <tr className="pl" key={p.id}>
              <td className="l"><a onClick={() => onOpenPlayer(p.name)}>{p.name}</a></td>
              <td>{p.m}</td><td>{p.rounds}</td><td>{p.k}</td><td>{p.d}</td><td>{p.a}</td>
              <td>{p.kd.toFixed(2)}</td><td>{p.adr.toFixed(1)}</td><td>{Math.round(p.kast)}%</td><td>{Math.round(p.hs)}%</td>
              <td>{p.ok}-{p.od}</td>
              <td className={'rt ' + rcls(p.r)}>{p.r.toFixed(2)}</td>
              <td><a className="btn" title="Compare" onClick={() => onCompare(p.id)}>⚔</a></td>
            </tr>
          )) : <tr><td className="empty" colSpan={13}>No players.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
