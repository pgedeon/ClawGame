import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './theme.css';  /* Add theme colors and variables */
import './App.css';    /* Add app layout styles */
import './index.css';  /* Add page-specific styles */
import './ai-studio.css';  /* Add AI and Asset Studio styles */

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);