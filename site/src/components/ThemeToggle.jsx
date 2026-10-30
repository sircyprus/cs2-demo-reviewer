import { useState } from 'react';
import { getTheme, setTheme } from '../lib/theme.js';

export default function ThemeToggle() {
  const [theme, set] = useState(getTheme());
  const next = theme === 'night' ? 'bubblegum' : 'night';
  return (
    <button className="btn theme-btn" title="Switch between the light and dark look" onClick={() => { setTheme(next); set(next); }}>
      {theme === 'night' ? '✦ Bubblegum' : '☾ Night'}
    </button>
  );
}
