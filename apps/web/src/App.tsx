import React from 'react';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🎮 ClawGame</h1>
        <p>AI-first web game engine</p>
      </header>
      <main className="app-main">
        <p>Welcome to ClawGame. Select or create a project to get started.</p>
        <div className="quick-actions">
          <button>New Project</button>
          <button>Open Project</button>
          <button>Examples</button>
        </div>
      </main>
    </div>
  );
}

export default App;
