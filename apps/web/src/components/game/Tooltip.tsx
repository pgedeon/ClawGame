/**
 * @clawgame/web - Tooltip Component
 * Provides hover tooltips for icon-only buttons.
 * Part of UI/UX improvements for accessibility and discoverability.
 */

import React, { useRef, useEffect, useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  position = 'top',
  delay = 300,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDelayed, setIsDelayed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) {
      setIsVisible(false);
      setIsDelayed(false);
      return;
    }

    const showTooltip = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsDelayed(true);
      }, delay);
    };

    const hideTooltip = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsDelayed(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', showTooltip);
      container.addEventListener('mouseleave', hideTooltip);
      container.addEventListener('focus', showTooltip);
      container.addEventListener('blur', hideTooltip);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (container) {
        container.removeEventListener('mouseenter', showTooltip);
        container.removeEventListener('mouseleave', hideTooltip);
        container.removeEventListener('focus', showTooltip);
        container.removeEventListener('blur', hideTooltip);
      }
    };
  }, [delay, disabled]);

  useEffect(() => {
    setIsVisible(isDelayed);
  }, [isDelayed]);

  return (
    <div
      ref={containerRef}
      className="tooltip-wrapper"
      data-tooltip={text}
      data-position={position}
      data-visible={isVisible}
      role="tooltip"
      aria-label={text}
    >
      {children}
    </div>
  );
};
