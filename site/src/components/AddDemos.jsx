import { useRef, useState } from 'react';
import { putDemo } from '../lib/store.js';

const DEMO_RE = /\.(dem|zst|bz2|gz|zip)$/i;

// Parses one file in its own worker; the worker is thrown away afterwards so its WASM memory is released.
function parseInWorker(file, onStage) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('../parser/worker.js', import.meta.url), { type: 'module' });
    w.onmessage = ({ data }) => {
      if (data.type === 'progress') onStage(data.stage);
      else if (data.type === 'done') { w.terminate(); resolve(data.results); }
      else if (data.type === 'error') { w.terminate(); reject(new Error(data.error)); }
    };
    w.onerror = e => { w.terminate(); reject(new Error(e.message || 'the parser crashed (out of memory?)')); };
    w.postMessage({ file });
  });
}

// Files from a drop, including dropped folders.
async function filesFromDrop(dt) {
  const out = [];
  const walk = async entry => {
    if (entry.isFile) await new Promise(res => entry.file(f => { out.push(f); res(); }, res));
    else if (entry.isDirectory) {
      const reader = entry.createReader();
      for (;;) {
        const batch = await new Promise(res => reader.readEntries(res, () => res([])));
        if (!batch.length) break;
        for (const e of batch) await walk(e);
      }
    }
  };
  const items = [...(dt.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (items.length) for (const e of items) await walk(e); else out.push(...dt.files);
  return out;
}

export default function AddDemos({ onAdded }) {
  const [jobs, setJobs] = useState([]);
  const [over, setOver] = useState(false);
  const busy = useRef(false);
  const queue = useRef([]);

  const patch = (i, p) => setJobs(js => js.map((j, k) => (k === i ? { ...j, ...p } : j)));

  const run = async () => {
    if (busy.current) return;
    busy.current = true;
    while (queue.current.length) {
      const { file, idx } = queue.current.shift();
      try {
        const results = await parseInWorker(file, stage => patch(idx, { stage }));
        for (const r of results) await putDemo(r);
        patch(idx, { status: 'done', stage: `${results.length} demo${results.length > 1 ? 's' : ''} added` });
        onAdded();
      } catch (e) {
        patch(idx, { status: 'error', stage: e.message });
      }
    }
    busy.current = false;
  };

  const add = files => {
    const good = [...files].filter(f => DEMO_RE.test(f.name));
    if (!good.length) return;
    setJobs(js => {
      const start = js.length;
      good.forEach((file, k) => queue.current.push({ file, idx: start + k }));
      return [...js, ...good.map(f => ({ name: f.name, status: 'working', stage: 'Waiting…' }))];
    });
    setTimeout(run, 0);
  };

  const input = useRef(null);
  return (
    <div className="card"
      style={{ borderStyle: 'dashed', borderColor: over ? 'var(--acc)' : undefined, background: over ? 'var(--sel)' : undefined }}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={async e => { e.preventDefault(); setOver(false); add(await filesFromDrop(e.dataTransfer)); }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <b>Add demos</b>
        <span className="muted">Drop .dem, .zst, .bz2, .gz or .zip files (or folders) here.</span>
        <button className="btn" onClick={() => input.current.click()}>Choose files…</button>
        <input ref={input} type="file" multiple accept=".dem,.zst,.bz2,.gz,.zip" style={{ display: 'none' }}
          onChange={e => { add(e.target.files); e.target.value = ''; }} />
      </div>
      {jobs.length > 0 && (
        <div style={{ marginTop: 10, display: 'grid', gap: 4, fontSize: 12 }}>
          {jobs.slice(-6).map((j, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <span style={{ minWidth: 14 }}>{j.status === 'done' ? '✔' : j.status === 'error' ? '✖' : '⏳'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>{j.name}</span>
              <span className={j.status === 'error' ? 'opp' : 'muted'}>{j.stage}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
