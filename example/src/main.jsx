import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

async function enableMocking() {
  const { worker } = await import('./mock/browser');
  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  return worker.start();
}

function mountApp() {
  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
}

enableMocking().then(mountApp);
