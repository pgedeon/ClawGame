import React from 'react';

export function SettingsPage() {
  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Configure your ClawGame workspace</p>
      </header>
      
      <div className="settings-content">
        <div className="settings-section">
          <h2>Appearance</h2>
          <p>Customize colors and themes coming soon...</p>
        </div>
        
        <div className="settings-section">
          <h2>Project Defaults</h2>
          <p>Default templates and configurations coming soon...</p>
        </div>
        
        <div className="settings-section">
          <h2>AI Providers</h2>
          <p>Configure AI services coming soon...</p>
        </div>
      </div>
    </div>
  );
}