/**
 * Project validation tests
 * Tests the pure validation logic for project creation.
 */

import { describe, expect, it } from 'vitest';
import { validateCreateProjectInput } from '../routes/projects';

describe('validateCreateProjectInput', () => {
  const validInput = {
    name: 'My Game',
    genre: 'platformer',
    artStyle: 'pixel',
  };

  describe('valid inputs', () => {
    it('accepts a complete valid input', () => {
      const result = validateCreateProjectInput(validInput);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts optional description', () => {
      const result = validateCreateProjectInput({ ...validInput, description: 'A cool game' });
      expect(result.valid).toBe(true);
    });

    it('accepts all valid genres', () => {
      const genres = ['platformer', 'rpg', 'action', 'puzzle', 'adventure', 'simulation', 'strategy', 'other'];
      for (const genre of genres) {
        const result = validateCreateProjectInput({ ...validInput, genre });
        expect(result.valid).toBe(true);
      }
    });

    it('accepts all valid art styles', () => {
      const styles = ['pixel', 'vector', '3d', 'mixed', 'other'];
      for (const artStyle of styles) {
        const result = validateCreateProjectInput({ ...validInput, artStyle });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects null/undefined', () => {
      expect(validateCreateProjectInput(null).valid).toBe(false);
      expect(validateCreateProjectInput(undefined).valid).toBe(false);
    });

    it('rejects missing name', () => {
      const result = validateCreateProjectInput({ genre: 'rpg', artStyle: 'pixel' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('name');
    });

    it('rejects empty name', () => {
      const result = validateCreateProjectInput({ name: '  ', genre: 'rpg', artStyle: 'pixel' });
      expect(result.valid).toBe(false);
    });

    it('rejects name over 100 chars', () => {
      const result = validateCreateProjectInput({ name: 'x'.repeat(101), genre: 'rpg', artStyle: 'pixel' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('100');
    });

    it('rejects missing genre', () => {
      const result = validateCreateProjectInput({ name: 'Test', artStyle: 'pixel' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Genre');
    });

    it('rejects invalid genre', () => {
      const result = validateCreateProjectInput({ name: 'Test', genre: 'fps', artStyle: 'pixel' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Genre must be one of');
    });

    it('rejects missing art style', () => {
      const result = validateCreateProjectInput({ name: 'Test', genre: 'rpg' });
      expect(result.valid).toBe(false);
      expect(result.error!.toLowerCase()).toContain('art style');
    });

    it('rejects invalid art style', () => {
      const result = validateCreateProjectInput({ name: 'Test', genre: 'rpg', artStyle: 'photorealistic' });
      expect(result.valid).toBe(false);
      expect(result.error!.toLowerCase()).toContain('art style must be one of');
    });

    it('rejects description over 500 chars', () => {
      const result = validateCreateProjectInput({
        ...validInput,
        description: 'x'.repeat(501),
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('500');
    });

    it('rejects non-string description', () => {
      const result = validateCreateProjectInput({ ...validInput, description: 123 });
      expect(result.valid).toBe(false);
    });
  });
});
