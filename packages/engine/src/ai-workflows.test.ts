import {
  createAIEditOperation,
  assessRisk,
  generateDiffSummary,
  validateSnapshot,
} from '../src/ai-workflows';
import type { AIEditOperation } from '../src/ai-workflows';

describe('ai-workflows', () => {
  describe('createAIEditOperation', () => {
    it('creates operation with correct type', () => {
      const op = createAIEditOperation('add_entity', 'Add player', '{}', '{"player":{}}', '+player');
      expect(op.type).toBe('add_entity');
      expect(op.id).toMatch(/^ai-/);
      expect(op.timestamp).toBeGreaterThan(0);
    });
  });

  describe('assessRisk', () => {
    it('safe for single add', () => {
      const ops = [createAIEditOperation('add_entity', '', '{}', '{}', '')];
      expect(assessRisk(ops)).toBe('safe');
    });

    it('moderate for 3 operations', () => {
      const ops = [1, 2, 3].map(() => createAIEditOperation('modify_entity', '', '{}', '{}', ''));
      expect(assessRisk(ops)).toBe('moderate');
    });

    it('risky for remove', () => {
      const ops = [createAIEditOperation('remove_entity', '', '{}', '{}', '')];
      expect(assessRisk(ops)).toBe('risky');
    });

    it('risky for batch', () => {
      const ops = [createAIEditOperation('batch', '', '{}', '{}', '')];
      expect(assessRisk(ops)).toBe('risky');
    });
  });

  describe('generateDiffSummary', () => {
    it('produces readable summary', () => {
      const ops = [
        createAIEditOperation('add_entity', 'Add enemy', '{}', '{}', ''),
        createAIEditOperation('modify_entity', 'Move player', '{}', '{}', ''),
      ];
      const summary = generateDiffSummary(ops);
      expect(summary).toContain('[add_entity] Add enemy');
      expect(summary).toContain('[modify_entity] Move player');
    });
  });

  describe('validateSnapshot', () => {
    it('valid for small JSON', () => {
      expect(validateSnapshot('{"scene":[]}').valid).toBe(true);
    });

    it('invalid for non-JSON', () => {
      const result = validateSnapshot('not json');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('invalid for oversized snapshot', () => {
      const big = 'x'.repeat(6 * 1024 * 1024);
      const result = validateSnapshot(big);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds max size');
    });
  });
});
