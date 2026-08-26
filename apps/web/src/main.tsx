import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installClawgameEventsAccessor } from './utils/activationEvents';
import './theme.css';       /* Add theme colors and variables */
import './App.css';        /* Add app layout styles */
import './index.css';       /* Add page-specific styles */
import './code-editor.css'; /* Add CodeMirror editor styles */
import './file-workspace.css'; /* Add file workspace styles */
import './ai-command.css';  /* Add AI Command page styles */
import './game-preview.css'; /* Add Game Preview page styles */
import './ai-studio.css';  /* Add AI and Asset Studio styles */

// Console accessor for qa (onboarding design §4): window.__clawgameEvents
installClawgameEventsAccessor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
