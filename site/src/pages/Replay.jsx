import { Link, useParams } from 'react-router-dom';
import { asset, useDemoData, useJson } from '../lib/data.js';
import Viewer from '../replay/Viewer.jsx';

export default function Replay() {
  const { slug } = useParams();
  const { data, error } = useDemoData(slug, 'replay');
  const maps = useJson(asset('maps/maps.json'));

  if (error) return <div className="page"><Link to="/">← all demos</Link><div className="card">Could not load this replay: {error}</div></div>;
  if (!data || (!maps.data && !maps.error)) return <div className="page muted">Loading replay…</div>;
  if (!data.frames.length) return <div className="page"><Link to="/">← all demos</Link><div className="card">This replay has no position data.</div></div>;

  const radar = maps.data?.[data.map] || null;
  return <Viewer key={slug} data={data} radar={radar} slug={slug} />;
}
