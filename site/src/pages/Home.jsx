import { useEffect, useMemo, useState } from 'react';
import AddDemos from '../components/AddDemos.jsx';
import heroArt from '../assets/art/c4.svg';
import logo from '../assets/logo.svg';
import { deleteDemo, listLocal } from '../lib/store.js';
import { useSearchParams } from 'react-router-dom';
import { asset, useJson } from '../lib/data.js';
import { DAY, dayStart, fmtDate, toInputDate } from '../lib/util.js';
import MatchesView from './home/MatchesView.jsx';
import PlayersView from './home/PlayersView.jsx';
import H2HView from './home/H2HView.jsx';

const TABS = [['m', 'Matches'], ['p', 'Players'], ['h', 'Head to Head']];

function DateBar({ range, setRange, demos, shown }) {
  const dates = demos.map(d => d.date).filter(Boolean);
  const active = range.from || range.to;
  const preset = n => {
    if (!n) return setRange({ from: 0, to: 0, preset: 0 });
    const now = new Date(); now.setHours(0, 0, 0, 0);
    setRange({ from: now.getTime() - n * DAY, to: 0, preset: n });
  };
  const custom = (key, value) => {
    const next = { ...range, preset: -1, [key]: dayStart(value) };
    if (!next.from && !next.to) next.preset = 0;
    setRange(next);
  };
  return (
    <div className="bar">
      <span className="muted">Date</span>
      {[[0, 'All time'], [7, '7 days'], [30, '30 days'], [90, '90 days']].map(([n, label]) => (
        <span key={n} className={'chip' + (range.preset === n ? ' on' : '')} onClick={() => preset(n)}>{label}</span>
      ))}
      <input type="date" style={{ minWidth: 0 }} value={range.from ? toInputDate(range.from) : ''} onChange={e => custom('from', e.target.value)} />
      <span className="muted">to</span>
      <input type="date" style={{ minWidth: 0 }} value={range.to ? toInputDate(range.to) : ''} onChange={e => custom('to', e.target.value)} />
      <span className="muted">
        {active ? `${shown} of ${demos.length} demos` : dates.length ? `demos span ${fmtDate(Math.min(...dates))} – ${fmtDate(Math.max(...dates))}` : ''}
      </span>
    </div>
  );
}

export default function Home() {
  const { data, error } = useJson(asset('data/index.json'));
  const samples = useJson(asset('samples/index.json'));
  const [source, setSource] = useState('all'); // all | mine | samples
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'm';
  const setTab = t => setSp(t === 'm' ? {} : { tab: t }, { replace: true });

  const [range, setRange] = useState({ from: 0, to: 0, preset: 0 });
  const [h2h, setH2h] = useState({ a: '', b: '' });
  const [q, setQ] = useState('');

  // demos the visitor parsed in this browser (IndexedDB) are merged with the pre-built ones
  const [local, setLocal] = useState([]);
  const refreshLocal = () => listLocal().then(setLocal);
  useEffect(() => { refreshLocal(); }, []);
  const removeLocal = async slug => { await deleteDemo(slug); refreshLocal(); };

  const all = useMemo(() => {
    const built = [...(data?.demos || []), ...(samples.data?.demos || [])], seen = new Set(built.map(d => d.slug));
    return [...built, ...local.filter(d => !seen.has(d.slug))];
  }, [data, samples.data, local]);
  const hasSamples = all.some(d => d.sample);
  const counts = { all: all.length, mine: all.filter(d => !d.sample).length, samples: all.filter(d => d.sample).length };
  const visible = useMemo(
    () => all.filter(d => (source === 'all' || (source === 'samples') === !!d.sample) && ((!range.from && !range.to) || (d.date && (!range.from || d.date >= range.from) && (!range.to || d.date < range.to + DAY)))),
    [all, range, source]
  );
  const stats = useMemo(() => {
    const pl = new Set(); let rounds = 0;
    visible.forEach(d => { rounds += d.n; d.players.forEach(p => pl.add(p.id)); });
    return [['Demos', visible.length], ['Maps', new Set(visible.map(d => d.map)).size], ['Rounds', rounds], ['Players', pl.size]];
  }, [visible]);

  // No pre-built demos is the normal state of the public site: everything is added (and stays) in the visitor's browser.
  if ((!data && !error) || (!samples.data && !samples.error)) return <div className="page muted">Loading…</div>;

  const compare = id => {
    if (!h2h.a || h2h.b || id === h2h.a) { setH2h({ a: id, b: '' }); return; }
    setH2h({ a: h2h.a, b: id });
    setTab('h');
  };

  return (
    <div className="page">
      <div className="top">
        <div>
          <h1 className="logo"><img src={logo} alt="Masturbatorium" /></h1>
          <div className="muted">A CS2 demo reviewer. Demos are read in your browser; nothing is uploaded.</div>
        </div>
        <img className="hero-art" src={heroArt} alt="" />
        <div className="stats">
          {stats.map(([label, v]) => <div className="stat" key={label}><b>{v}</b><span>{label}</span></div>)}
        </div>
      </div>

      <AddDemos onAdded={refreshLocal} />

      <DateBar range={range} setRange={setRange} demos={all} shown={visible.length} />
      {hasSamples && (
        <div className="bar">
          <span className="muted">Show</span>
          {[['all', 'All demos'], ['mine', 'My demos'], ['samples', 'Sample pro demos']].map(([k, label]) => (
            <span key={k} className={'chip' + (source === k ? ' on' : '')} onClick={() => setSource(k)}>{label} · {counts[k]}</span>
          ))}
        </div>
      )}

      <div className="tabs">
        {TABS.map(([k, label]) => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      <div hidden={tab !== 'm'}><MatchesView demos={visible} q={q} setQ={setQ} onRemove={removeLocal} /></div>
      <div hidden={tab !== 'p'}>
        <PlayersView demos={visible} h2h={h2h} onCompare={compare} onOpenPlayer={name => { setQ(name); setTab('m'); }} />
      </div>
      <div hidden={tab !== 'h'}><H2HView all={all} demos={visible} h2h={h2h} setH2h={setH2h} /></div>

      {data?.failed?.length > 0 && (
        <>
          <h2>Could not parse</h2>
          {data.failed.map(f => <div className="card" key={f.file}>⚠ {f.file}: {f.err}</div>)}
        </>
      )}
    </div>
  );
}
