import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { sidebarItems } from '../constants/sidebar';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>🎮 ClawGame</h1>
          <p>AI Game Engine</p>
        </div>
        
        <div className="sidebar-nav">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      
      <main className="main-content">
        {children || <Outlet />}
      </main>
    </div>
  );
}
