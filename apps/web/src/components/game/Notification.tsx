/**
 * @clawgame/web - Notification Component
 * Accessible, stackable notifications for game events.
 *
 * ENHANCED: Proper stacking with overflow, animations, and dismissible notifications
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface Notification {
  id: number | string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loot' | 'quest';
  icon?: string;
  duration?: number;
}

interface NotificationComponentProps {
  notification: Notification;
  onDismiss: (id: number | string) => void;
}

export const NotificationComponent: React.FC<NotificationComponentProps> = ({
  notification,
  onDismiss,
}) => {
  const [isDismissing, setIsDismissing] = useState(false);
  const [remainingTime, setRemainingTime] = useState(notification.duration || 3000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Map notification types to icons (fallback to lucide icons if no emoji provided)
  const getLucideIcon = () => {
    if (notification.icon) return null; // Use provided emoji

    switch (notification.type) {
      case 'success':
      case 'loot':
        return <CheckCircle size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      case 'warning':
        return <AlertTriangle size={16} />;
      case 'info':
      case 'quest':
      default:
        return <Info size={16} />;
    }
  };

  // Handle auto-dismiss
  useEffect(() => {
    const duration = notification.duration || 3000;

    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    // Update remaining time every 100ms for progress bar
    const updateProgress = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      setRemainingTime(remaining);
    }, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(updateProgress);
    };
  }, [notification.duration]);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // Match slideOut animation duration
  };

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    handleDismiss();
  };

  const progressPercent = Math.max(0, (remainingTime / (notification.duration || 3000)) * 100);

  return (
    <div
      className={`game-preview-notification ${notification.type} ${isDismissing ? 'dismissing' : ''}`}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="notification-content">
        <span className="notification-icon" aria-hidden="true">
          {notification.icon || getLucideIcon()}
        </span>
        <span className="notification-message">{notification.message}</span>
      </div>
      <button
        className="notification-dismiss"
        onClick={dismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      {/* Progress bar showing remaining time */}
      <div className="notification-progress">
        <div
          className="notification-progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

interface NotificationAreaProps {
  notifications: Notification[];
  onDismiss: (id: number | string) => void;
}

export const NotificationArea: React.FC<NotificationAreaProps> = ({
  notifications,
  onDismiss,
}) => {
  // Track if user is hovering to pause auto-dismiss
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="game-preview-notification-area"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map((notification) => (
        <NotificationComponent
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
