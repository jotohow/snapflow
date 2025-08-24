import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@vscode/codicons/dist/codicon.css';
import './index.css';

// Get the container element
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
