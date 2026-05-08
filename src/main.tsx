/**
 * main.tsx — React DOM Entry Point
 *
 * This is the bootstrap file for the entire PresenceCV frontend.
 * It mounts the root <App /> component into the #root div defined in index.html.
 * StrictMode is enabled to surface potential issues during development.
 *
 * Imports:
 * - App.tsx: Root component containing routing and providers.
 * - index.css: Global stylesheet with Tailwind theme, glass effects, and print layout.
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
