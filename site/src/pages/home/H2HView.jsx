import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggregate } from '../../lib/stats.js';
import { mapName, rcls } from '../../lib/util.js';

const inDemo = (d, id) => d.players.some(p => p.id === id);
const pOf = (d, id) => d.players.find(p => p.id === id);

function Row({ label, a, b, dec, higher = true }) {
  const aw = a === b ? 0 : (higher ? a > b : a < b) ? 1 : -1;
  const mx = Math.max(a, b) || 1;
  let wa, wb;
  if (higher) { wa = (a / mx) * 100; wb = (b / mx) * 100; }
  else { const mn = Math.min(a, b); wa = a ? (mn / a) * 100 : 100; wb = b ? (mn / b) * 100 : 100; }
  return (
    <div className="cr">
      <div className={'v r' + (aw >= 0 ? ' w' : '')}>{a.toFixed(dec)}</div>
      <div>
        <div className="lb">{label}</div>
        <div className="tr">
          <div className="h"><i className={aw < 0 ? 'l' : ''} style={{ width: wa + '%' }} /></div>
          <div className="h2"><i className={aw > 0 ? 'l' : ''} style={{ width: wb + '%' }} /></div>
        </div>
      </div>
      <div className={'v l' + (aw <= 0 ? ' w' : '')}>{b.toFixed(dec)}</div>
    </div>
  );
}

export default function H2HView({ all, demos, h2h, setH2h }) {
  const [only, setOnly] = useState(true);
  const names = useMemo(() => {
    const n = {};
    all.forEach(d => d.players.forEach(p => { n[p.id] = p.name; }));
    return n;
  }, [all]);
  const idOf = v => {
    v = String(v || '').trim().toLowerCase();
    return v ? Object.keys(names).find(i => String(names[i]).toLowerCase() === v) || '' : '';
  };
  // draft holds half-typed text; once it matches a player name the selection (h2h) takes over.
  const [draft, setDraft] = useState({ a: null, b: null });
  const shownA = draft.a ?? names[h2h.a] ?? '';
  const shownB = draft.b ?? names[h2h.b] ?? '';
  const setPick = (key, v) => {
    const id = idOf(v);
    if (id || v === '') {
      setDraft(d => ({ ...d, [key]: null }));
      setH2h(h => ({ ...h, [key]: id }));
    } else setDraft(d => ({ ...d, [key]: v }));
  };
  const swap = () => { setH2h(h => ({ a: h.b, b: h.a })); setDraft({ a: null, b: null }); };

  const A = h2h.a, B = h2h.b;
  const body = useMemo(() => {
    if (!A || !B || A === B) return null;
    const shared = demos.filter(d => inDemo(d, A) && inDemo(d, B));
    const useShared = only && shared.length > 0;
    const la = useShared ? shared : demos.filter(d => inDemo(d, A));
    const lb = useShared ? shared : demos.filter(d => inDemo(d, B));
    const pa = aggregate(la).find(p => p.id === A), pb = aggregate(lb).find(p => p.id === B);
    let ab = 0, ba = 0, abh = 0, bah = 0;
    shared.forEach(d => {
      const x = d.duels[A + '>' + B], y = d.duels[B + '>' + A];
      if (x) { ab += x[0]; abh += x[1]; }
      if (y) { ba += y[0]; bah += y[1]; }
    });
    return { shared, useShared, pa, pb, ab, ba, abh, bah };
  }, [A, B, demos, only]);

  const nameOf = id => names[id] || id;
  let content;
  if (!A || !B || A === B) {
    content = <div className="empty">Pick two players above, or press ⚔ in the Players tab.</div>;
  } else if (!body.pa || !body.pb) {
    content = <div className="empty">{nameOf(!body.pa ? A : B)} has no matches in this date range.</div>;
  } else {
    const { shared, useShared, pa, pb, ab, ba, abh, bah } = body;
    const open = x => (x.ok + x.od ? (100 * x.ok) / (x.ok + x.od) : 0);
    content = (
      <>
        <div className="vs">
          <div><div className="nm A">{nameOf(A)}</div><small>{pa.m} match{pa.m > 1 ? 'es' : ''} · rating {pa.r.toFixed(2)}</small></div>
          <div>
            <div className="big"><span className="A">{ab}</span><span className="muted"> : </span><span className="B">{ba}</span></div>
            <small>kills on each other{shared.length ? ` · ${shared.length} shared match${shared.length > 1 ? 'es' : ''} · ${abh} / ${bah} HS` : ''}</small>
          </div>
          <div><div className="nm B">{nameOf(B)}</div><small>{pb.m} match{pb.m > 1 ? 'es' : ''} · rating {pb.r.toFixed(2)}</small></div>
        </div>
        {!shared.length
          ? <div className="card muted">They haven't played in the same demo, so there are no duels. Overall stats below.</div>
          : !useShared && <div className="muted" style={{ marginBottom: 8 }}>Stats cover all their matches. Duels and the table cover shared matches only.</div>}
        <div className="cmp">
          <Row label="Rating" a={pa.r} b={pb.r} dec={2} />
          <Row label="K/D" a={pa.kd} b={pb.kd} dec={2} />
          <Row label="ADR" a={pa.adr} b={pb.adr} dec={1} />
          <Row label="KAST %" a={pa.kast} b={pb.kast} dec={0} />
          <Row label="HS %" a={pa.hs} b={pb.hs} dec={0} />
          <Row label="Kills / round" a={pa.k / pa.rounds} b={pb.k / pb.rounds} dec={2} />
          <Row label="Deaths / round" a={pa.d / pa.rounds} b={pb.d / pb.rounds} dec={2} higher={false} />
          <Row label="Assists / round" a={pa.a / pa.rounds} b={pb.a / pb.rounds} dec={2} />
          <Row label="Opening duel win %" a={open(pa)} b={open(pb)} dec={0} />
          <Row label="Matches" a={pa.m} b={pb.m} dec={0} />
        </div>
        {shared.length > 0 && (
          <>
            <h2>Shared matches</h2>
            <table>
              <thead><tr><th className="l">Match</th><th>Relation</th><th>Score</th><th className="A">{nameOf(A)}</th><th className="B">{nameOf(B)}</th><th>Duels</th><th /></tr></thead>
              <tbody>
                {shared.map(d => {
                  const x = pOf(d, A), y = pOf(d, B), same = x.team && x.team === y.team;
                  const du1 = (d.duels[A + '>' + B] || [0])[0], du2 = (d.duels[B + '>' + A] || [0])[0];
                  const line = p => <>{p.k}/{p.d} · ADR {p.adr} · <span className={'rt ' + rcls(p.r)}>{p.r.toFixed(2)}</span></>;
                  return (
                    <tr key={d.slug}>
                      <td className="l">{mapName(d.map)} <span className="muted">{d.file.slice(0, 18)}…</span></td>
                      <td className={same ? 'tm' : 'opp'}>{same ? 'Teammates' : 'Opponents'}</td>
                      <td><span className="A">{d.score.A}</span> : <span className="B">{d.score.B}</span></td>
                      <td>{line(x)}</td><td>{line(y)}</td>
                      <td><span className="A">{du1}</span> : <span className="B">{du2}</span></td>
                      <td><Link className="btn" to={`/demo/${d.slug}`}>Report</Link> <Link className="btn" to={`/demo/${d.slug}/replay`}>▶</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className="bar">
        <input list="h2h-players" placeholder="Player 1…" style={{ borderColor: 'var(--A)' }} value={shownA} onChange={e => setPick('a', e.target.value)} />
        <span className="muted">vs</span>
        <input list="h2h-players" placeholder="Player 2…" style={{ borderColor: 'var(--B)' }} value={shownB} onChange={e => setPick('b', e.target.value)} />
        <label className="muted"><input type="checkbox" style={{ minWidth: 0 }} checked={only} onChange={e => setOnly(e.target.checked)} /> only matches they both played</label>
        <a className="btn" onClick={swap}>⇄ Swap</a>
      </div>
      <datalist id="h2h-players">
        {Object.values(names).sort().map(n => <option key={n} value={n} />)}
      </datalist>
      <div>{content}</div>
    </>
  );
}
