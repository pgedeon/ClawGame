/**
 * @clawgame/web - Skip Link Component
 * Accessibility: allows keyboard users to skip navigation and jump to main content.
 */

import React from 'react';

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      Skip to main content
    </a>
  );
}
