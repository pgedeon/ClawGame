/**
 * @clawgame/web - 404 Not Found Page
 * Shown when users hit an unknown route.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={16} />
            Go Back
          </button>
          <button onClick={() => navigate('/')} className="btn-primary">
            <Home size={16} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
