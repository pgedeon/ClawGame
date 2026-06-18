/**
 * @clawgame/shared - General utilities
 */

import { nanoid } from 'nanoid';

// ID generation
export function generateId(): string {
  return nanoid(10);
}

export function generateProjectId(): string {
  return nanoid(11);
}

export function createId(): string {
  return nanoid(8);
}

// Debug and development utilities
export const DEBUG_UTILS = {
  measurePerformance: (name: string, fn: () => void) => {
    const start = Date.now();
    fn();
    const end = Date.now();
    return { name, duration: end - start };
  },

  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  generateBulkIds: (count: number, prefix = ''): string[] => {
    return Array.from({ length: count }, () => `${prefix}${nanoid(8)}`);
  },

  validateGameObject: (obj: any, required: string[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    for (const field of required) {
      if (!(field in obj)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    return { valid: errors.length === 0, errors };
  },
};
