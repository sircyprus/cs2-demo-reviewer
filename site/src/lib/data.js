import { useEffect, useState } from 'react';
import { getDemo, isLocal } from './store.js';

// Resolves a path inside public/ regardless of where the site is hosted.
export const asset = p => import.meta.env.BASE_URL + p;

const cache = new Map();
export function fetchJson(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then(r => {
        if (!r.ok) throw new Error(url + ' -> ' + r.status);
        return r.json();
      })
    );
  }
  return cache.get(url);
}

export function useJson(url) {
  const [s, setS] = useState({ data: null, error: null });
  useEffect(() => {
    let live = true;
    setS({ data: null, error: null });
    if (!url) return;
    fetchJson(url).then(
      data => live && setS({ data, error: null }),
      e => live && setS({ data: null, error: String(e.message || e) })
    );
    return () => { live = false; };
  }, [url]);
  return s;
}

// kind: 'analysis' (scoreboard + rounds) or 'replay' (positions). Local demos come from IndexedDB, the rest from /data.
export function useDemoData(slug, kind) {
  const [s, setS] = useState({ data: null, error: null });
  useEffect(() => {
    let live = true;
    setS({ data: null, error: null });
    const done = data => live && setS({ data, error: null });
    const fail = e => live && setS({ data: null, error: String((e && e.message) || e) });
    if (isLocal(slug)) {
      getDemo(slug).then(rec => (rec ? done(rec[kind]) : fail("This demo isn't saved in this browser.")), fail);
    } else {
      fetchJson(asset(`data/${slug}${kind === 'replay' ? '.replay' : ''}.json`)).then(done, fail);
    }
    return () => { live = false; };
  }, [slug, kind]);
  return s;
}
