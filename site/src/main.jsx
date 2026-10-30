import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/quicksand/500.css';
import '@fontsource/quicksand/700.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/unbounded/900.css';
import '@fontsource/vt323/400.css';
import './styles.css';
import { initTheme } from './lib/theme.js';

initTheme();

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>
);
