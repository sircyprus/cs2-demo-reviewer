import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '../../lib/data.js';
import { fmtDate, mapName, rcls } from '../../lib/util.js';

const diff = d => Math.abs(d.score.A - d.score.B);
const top = d => (d.players.length ? d.players[0].r : 0);
const SORTS = {
  newest: (a, b) => b.date - a.date || (a.file < b.file ? -1 : 1),
  oldest: (a, b) => a.date - b.date || (a.file < b.file ? -1 : 1),
  file: (a, b) => (a.file < b.file ? -1 : 1),
  rounds: (a, b) => b.n - a.n,
  close: (a, b) => diff(a) - diff(b),
  stomp: (a, b) => diff(b) - diff(a),
  rating: (a, b) => top(b) - top(a),
};

export default function MatchesView({ demos, q, setQ, onRemove }) {
  const [map, setMap] = useState('');
  const [sort, setSort] = useState('newest');
  const maps = useMemo(() => [...new Set(demos.map(d => d.map))].sort(), [demos]);
  const needle = q.toLowerCase();

  const list = useMemo(() => demos
    .filter(d => (!map || d.map === map) && (!needle ||
      d.file.toLowerCase().includes(needle) || mapName(d.map).toLowerCase().includes(needle) ||
      d.players.some(p => String(p.name).toLowerCase().includes(needle))))
    .sort(SORTS[sort]), [demos, map, needle, sort]);

  return (
    <>
      <div className="bar">
        <input placeholder="Search map, file or player…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Sort: newest first</option>
          <option value="oldest">Sort: oldest first</option>
          <option value="file">Sort: filename</option>
          <option value="rounds">Sort: most rounds</option>
          <option value="close">Sort: closest score</option>
          <option value="stomp">Sort: biggest stomp</option>
          <option value="rating">Sort: highest rated player</option>
        </select>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className={'chip' + (!map ? ' on' : '')} onClick={() => setMap('')}>All maps</span>
          {maps.map(m => <span key={m} className={'chip' + (map === m ? ' on' : '')} onClick={() => setMap(m)}>{mapName(m)}</span>)}
        </span>
      </div>

      {!list.length ? <div className="empty">{demos.length ? 'No matches found.' : 'No demos yet. Add some above.'}</div> : (
        <div className="grid">
          {list.map(d => (
            <div className="m" key={d.slug}>
              <div className="th" style={{ backgroundImage: `url(${asset('maps/' + d.map + '.png')})` }} />
              <div className="bd">
                <div className="hd">
                  <span className="mp">{mapName(d.map)}</span>
                  <span className="sc"><span className="A">{d.score.A}</span><span className="muted"> : </span><span className="B">{d.score.B}</span></span>
                </div>
                <div className="fn" title={d.file}>
                  <span title={d.dsrc === 'filename' ? 'Date from the filename' : 'File date (demos have no match date)'}>📅 {fmtDate(d.date)}</span> · {d.n} rounds · {d.file}
                </div>
                <div className="tp">
                  {d.players.slice(0, 3).map(p => (
                    <div key={p.id}>
                      <span className={p.team || ''} style={needle && String(p.name).toLowerCase().includes(needle) ? { textDecoration: 'underline' } : null}>{p.name}</span>
                      <span className="muted">{p.k}/{p.d} · ADR {p.adr} · <span className={'rt ' + rcls(p.r)}>{p.r.toFixed(2)}</span></span>
                    </div>
                  ))}
                </div>
                <div className="ac">
                  <Link className="btn" to={`/demo/${d.slug}`}>Report</Link>
                  <Link className="btn pri" to={`/demo/${d.slug}/replay`}>▶ Replay</Link>
                  {d.local && <span className="chip" title="Only in this browser">on this device</span>}
                  {d.local && <a className="btn" title="Remove from this browser" onClick={() => onRemove(d.slug)}>✕</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
