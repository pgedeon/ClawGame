import React from 'react';

export function EditorPage() {
  return (
    <div className="editor-page">
      <header className="page-header">
        <h1>Editor</h1>
        <p>Scene editor and code workspace</p>
      </header>
      
      <div className="editor-empty">
        <p>Editor will be available once you open a project.</p>
      </div>
    </div>
  );
}