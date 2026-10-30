import { useState } from 'react';
import { THEME_LABEL, getTheme, nextTheme, setTheme } from '../lib/theme.js';

export default function ThemeToggle() {
  const [theme, set] = useState(getTheme());
  const next = nextTheme(theme);
  return (
    <button className="btn theme-btn" title={'Switch look (now: ' + theme + ')'} onClick={() => { setTheme(next); set(next); }}>
      {THEME_LABEL[next]}
    </button>
  );
}
