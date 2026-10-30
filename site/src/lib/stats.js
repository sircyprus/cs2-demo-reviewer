// Averages per player across a list of demo summaries, weighted by rounds played.
export function aggregate(list) {
  const P = {};
  for (const d of list) {
    for (const p of d.players) {
      const x = P[p.id] || (P[p.id] = { id: p.id, name: p.name, m: 0, rounds: 0, k: 0, d: 0, a: 0, adr: 0, kast: 0, hs: 0, hsk: 0, ok: 0, od: 0, r: 0 });
      x.name = p.name; x.m++; x.rounds += d.n;
      x.k += p.k; x.d += p.d; x.a += p.a;
      x.adr += p.adr * d.n; x.kast += p.kast * d.n; x.r += p.r * d.n;
      x.hs += p.hs * p.k; x.hsk += p.k;
      x.ok += p.ok; x.od += p.od;
    }
  }
  return Object.values(P).map(x => ({
    ...x,
    kd: x.d ? x.k / x.d : x.k,
    adr: x.adr / x.rounds,
    kast: x.kast / x.rounds,
    hs: x.hsk ? x.hs / x.hsk : 0,
    r: x.r / x.rounds,
  }));
}
