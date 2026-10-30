// Two themes share one stylesheet: "bubblegum" (light, default) and "night" (dark). The choice is remembered per browser.
const KEY = 'cs2dr-theme';
export const THEMES = ['bubblegum', 'night'];

export function getTheme() {
  try { const t = localStorage.getItem(KEY); if (THEMES.includes(t)) return t; } catch { /* storage blocked */ }
  return 'bubblegum';
}

export function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ }
}

export const initTheme = () => setTheme(getTheme());
