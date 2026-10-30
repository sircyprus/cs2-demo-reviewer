import { Link, useParams } from 'react-router-dom';
import { useDemoData } from '../lib/data.js';
import { fmtDate, mapName } from '../lib/util.js';

function Scoreboard({ players }) {
  return (
    <table>
      <thead>
        <tr><th className="l">Player</th><th>K</th><th>D</th><th>A</th><th>+/-</th><th>ADR</th><th>KAST</th><th>HS%</th><th>Open K-D</th><th>2k/3k/4k/5k</th><th>Rating*</th></tr>
      </thead>
      <tbody>
        {players.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td><td>{p.k}</td><td>{p.d}</td><td>{p.a}</td>
            <td>{p.k - p.d > 0 ? '+' : ''}{p.k - p.d}</td><td>{p.adr}</td><td>{p.kast}%</td><td>{p.hsPct}%</td>
            <td>{p.openK}-{p.openD}</td><td>{p.m2}/{p.m3}/{p.m4}/{p.m5}</td><td>{p.rating}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Report() {
  const { slug } = useParams();
  const { data: a, error } = useDemoData(slug, 'analysis');
  if (error) return <div className="page"><Link to="/">← all demos</Link><div className="card">Could not load this demo: {error}</div></div>;
  if (!a) return <div className="page muted">Loading…</div>;

  const team = t => a.players.filter(p => p.team === t);
  const unassigned = a.players.filter(p => !p.team);
  const jump = n => {
    const el = document.getElementById('r' + n);
    if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };

  return (
    <div className="page">
      <p>
        <Link to="/">← all demos</Link> · <Link to={`/demo/${slug}/replay`}><b>▶ 2D replay</b></Link>
      </p>
      <h1>{mapName(a.map)} <span className="muted" style={{ fontSize: 14 }}>{a.file} · {fmtDate(a.date)}</span></h1>
      <h2>
        <span className="A">Team A {a.score.A}</span> : <span className="B">{a.score.B} Team B</span>{' '}
        <span className="muted">({a.nRounds} rounds)</span>
      </h2>

      <div className="rounds">
        {a.rounds.map(r => (
          <div key={r.n} className={'rd ' + (r.winner || '')} title={`Round ${r.n}: ${r.winner} won (${r.reason})`} onClick={() => jump(r.n)}>{r.n}</div>
        ))}
      </div>

      <h2 className="A">Team A ({a.score.A})</h2><Scoreboard players={team('A')} />
      <h2 className="B">Team B ({a.score.B})</h2><Scoreboard players={team('B')} />
      {unassigned.length > 0 && <><h2>Unassigned</h2><Scoreboard players={unassigned} /></>}
      <p className="muted">*Rating is a rough HLTV 2.0 estimate. KAST ignores trades. ADR counts enemy damage only.</p>

      <h2>Rounds</h2>
      {a.rounds.map(r => (
        <details id={'r' + r.n} key={r.n}>
          <summary>
            Round {r.n} — <span className={r.winner || ''}>{r.winner || '?'}</span> won{' '}
            <span className="muted">({r.reason}, {r.kills.length} kills)</span>
          </summary>
          {r.kills.map((k, i) => (
            <div className="k" key={i}>
              <span className={k.aSide || ''}>{k.attacker || 'World'}</span> {k.assister ? '+ ' + k.assister + ' ' : ''}[{k.weapon}]
              {k.hs ? ' HS' : ''}{k.wall ? ' wallbang' : ''}{k.smoke ? ' thru-smoke' : ''}{k.noscope ? ' noscope' : ''}{k.blind ? ' blind' : ''} →{' '}
              <span className={k.vSide || ''}>{k.victim}</span>
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
