import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { startWorker } from './mock';

function mountApp() {
  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
}

if (process.env.NODE_ENV === 'development') {
  startWorker();
}

mountApp();
