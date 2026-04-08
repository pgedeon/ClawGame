/**
 * RPG Notification System
 */
import { GameNotification, NotificationType } from './types';

let notifId = 0;
type NotifListener = (n: GameNotification) => void;
const listeners: NotifListener[] = [];

export function subscribeNotifications(fn: NotifListener) {
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
}

export function notify(type: NotificationType, title: string, message: string, icon?: string, duration = 3000) {
  const n: GameNotification = {
    id: `notif-${++notifId}-${Date.now()}`,
    type, title, message,
    icon: icon || (type === 'quest' ? '📜' : type === 'loot' ? '🎁' : type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'),
    duration,
    createdAt: Date.now(),
  };
  listeners.forEach(fn => fn(n));
  return n;
}
