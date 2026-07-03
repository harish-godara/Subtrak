/* ══════════════════════════════════════════════════════
   SubTrack — Entry Point (React)
   ══════════════════════════════════════════════════════ */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { getSettings, applyTheme, applyAesthetic } from './utils/helpers';

// Apply saved theme and aesthetic before React mounts
const settings = getSettings();
applyTheme(settings.theme);
applyAesthetic(settings.aesthetic || 'professional');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
