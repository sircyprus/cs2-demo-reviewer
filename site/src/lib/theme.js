// Three themes share one stylesheet: "bubblegum" (light, default), "holo" (iridescent Y2K device look) and "night" (dark neon).
// The choice is remembered per browser.
const KEY = 'cs2dr-theme';
export const THEMES = ['bubblegum', 'holo', 'night'];
export const THEME_LABEL = { bubblegum: '✦ Bubblegum', holo: '❖ Holo', night: '☾ Night' };

export function getTheme() {
  try { const t = localStorage.getItem(KEY); if (THEMES.includes(t)) return t; } catch { /* storage blocked */ }
  return 'bubblegum';
}

export function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ }
}

export const nextTheme = t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length];
export const initTheme = () => setTheme(getTheme());
