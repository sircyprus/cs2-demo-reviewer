export const DAY = 86400000;

export const mapName = m => {
  m = String(m || 'unknown').replace(/^de_/, '');
  return m.charAt(0).toUpperCase() + m.slice(1);
};

export const fmtDate = t =>
  t ? new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'no date';

export const rcls = r => (r >= 1.15 ? 'hi' : r < 0.85 ? 'lo' : '');

export const money = v => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v);

// "2026-10-29" -> local midnight in ms (0 for empty)
export const dayStart = s => {
  if (!s) return 0;
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
};

export const toInputDate = ms => {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
