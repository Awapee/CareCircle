import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Root } from '@/app/Root';
import { MEMORY_ROUTER } from '@/app/worlds';
import { applyDisplayPrefs } from '@/lib/displayPrefs';
import { captureInstallPrompt, registerServiceWorker } from '@/lib/pwa';
import '@/styles/index.css';

applyDisplayPrefs();

// A single-file preview can't install or work offline, so only the real site registers these.
if (!MEMORY_ROUTER) {
  captureInstallPrompt();
  registerServiceWorker();
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
