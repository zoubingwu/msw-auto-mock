import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { startWorker } from './mock';

function mountApp() {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );
}

if (process.env.NODE_ENV === 'development') {
  startWorker();
}

mountApp();
