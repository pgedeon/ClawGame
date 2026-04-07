/**
 * @clawgame/web - Silent logger for production
 * In dev: logs to console. In prod: silent (toast system handles user feedback).
 */

const isDev = typeof window !== 'undefined' &&
  (location?.hostname === 'localhost' || location?.hostname === '127.0.0.1');

export const logger = {
  error(...args: any[]) {
    if (isDev) console.error('[ClawGame]', ...args);
  },
  warn(...args: any[]) {
    if (isDev) console.warn('[ClawGame]', ...args);
  },
  info(...args: any[]) {
    if (isDev) console.log('[ClawGame]', ...args);
  },
};
