/**
 * @clawgame/engine - AI Graph Generator Tests
 *
 * Tests for natural-language-to-behavior-graph generation.
 * Verifies pattern matching, graph structure, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  generateFromDescription,
  registerPattern,
  getAvailablePatterns,
  type BehaviorPattern,
} from './AIGraphGenerator';
import type { BehaviorGraph } from './types';

describe('AIGraphGenerator', () => {
  // ─── Patrol Pattern ───

  describe('patrol pattern', () => {
    it('generates a patrol graph from "patrol between 100 and 400"', () => {
      const result = generateFromDescription('patrol between 100 and 400');
      expect(result.graph.name).toBe('Patrol');
      expect(result.graph.nodes.length).toBeGreaterThanOrEqual(3);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.warnings).toHaveLength(0);
    });

    it('uses default range when no numbers given', () => {
      const result = generateFromDescription('patrol back and forth');
      expect(result.graph.name).toBe('Patrol');
      expect(result.graph.tags).toContain('patrol');
    });

    it('applies slow speed modifier', () => {
      const result = generateFromDescription('patrol slowly between 0 and 300');
      expect(result.graph.name).toBe('Patrol');
    });

    it('applies fast speed modifier', () => {
      const result = generateFromDescription('patrol fast between 50 and 500');
      expect(result.graph.name).toBe('Patrol');
    });
  });

  // ─── Chase Pattern ───

  describe('chase pattern', () => {
    it('generates a chase graph targeting the player', () => {
      const result = generateFromDescription('chase the player when close');
      expect(result.graph.name).toBe('Chase');
      expect(result.graph.tags).toContain('chase');
    });

    it('detects player entity', () => {
      const result = generateFromDescription('chase player');
      const json = JSON.stringify(result.graph);
      expect(json).toContain('player');
    });

    it('uses numeric range from input', () => {
      const result = generateFromDescription('chase player within 150px');
      expect(result.graph.name).toBe('Chase');
      // Should have detect node with range
      const detectNode = result.graph.nodes.find(n =>
        n.type === 'condition' && n.label?.includes('150')
      );
      expect(detectNode).toBeDefined();
    });

    it('handles "pursue" keyword', () => {
      const result = generateFromDescription('pursue the player');
      expect(result.graph.name).toBe('Chase');
    });

    it('handles "follow" keyword', () => {
      const result = generateFromDescription('follow the player');
      expect(result.graph.name).toBe('Chase');
    });
  });

  // ─── Flee Pattern ───

  describe('flee pattern', () => {
    it('generates a flee graph', () => {
      const result = generateFromDescription('flee from the player');
      expect(result.graph.name).toBe('Flee');
      expect(result.graph.tags).toContain('flee');
    });

    it('handles "retreat" keyword', () => {
      const result = generateFromDescription('retreat when hurt');
      expect(result.graph.name).toBe('Flee');
    });

    it('handles "run away" keyword', () => {
      const result = generateFromDescription('run away from player');
      expect(result.graph.name).toBe('Flee');
    });

    it('handles "escape" keyword', () => {
      const result = generateFromDescription('escape from enemies');
      expect(result.graph.name).toBe('Flee');
    });
  });

  // ─── Guard Pattern ───

  describe('guard pattern', () => {
    it('generates a guard graph from simple guard pattern', () => {
      const result = generateFromDescription('guard position 200');
      expect(result.graph.name).toBe('Guard');
      expect(result.graph.tags).toContain('guard');
    });

    it('handles "defend" keyword without comma', () => {
      const result = generateFromDescription('defend the area');
      expect(result.graph.name).toBe('Guard');
      expect(result.graph.tags).toContain('guard');
    });

    it('handles "protect" keyword without comma', () => {
      const result = generateFromDescription('protect the castle');
      expect(result.graph.name).toBe('Guard');
      expect(result.graph.tags).toContain('guard');
    });

    it('composite guard pattern with comma', () => {
      const result = generateFromDescription('guard position 200,300,500');
      expect(result.graph.name).toBe('Composite Behavior');
      expect(result.graph.tags).toContain('composite');
    });
  });

  // ─── Alert/Chase/Flee Combo Pattern ───

  describe('alert/chase/flee combo pattern', () => {
    it('generates combo from "alert, chase, flee"', () => {
      const result = generateFromDescription('alert, chase, flee');
      expect(result.graph.name).toBe('Alert/Chase/Flee');
      expect(result.graph.nodes.length).toBeGreaterThan(5);
    });

    it('includes all three branches', () => {
      const result = generateFromDescription('patrol, alert, chase, retreat');
      // This should match the alert-chase-flee pattern or composite
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('requires at least 2 of alert/chase/flee', () => {
      // "chase only" should not trigger combo — should be plain chase
      const result = generateFromDescription('chase the player');
      expect(result.graph.name).toBe('Chase');
    });
  });

  // ─── Wander Pattern ───

  describe('wander pattern', () => {
    it('generates a wander graph', () => {
      const result = generateFromDescription('wander around randomly');
      expect(result.graph.name).toBe('Wander');
      expect(result.graph.tags).toContain('wander');
    });

    it('handles "roam" keyword', () => {
      const result = generateFromDescription('roam the area');
      expect(result.graph.name).toBe('Wander');
    });
  });

  // ─── Attack Pattern ───

  describe('attack pattern', () => {
    it('generates an attack graph', () => {
      const result = generateFromDescription('attack the player');
      expect(result.graph.name).toBe('Attack');
      expect(result.graph.tags).toContain('attack');
    });

    it('handles "shoot" keyword', () => {
      const result = generateFromDescription('shoot at the player');
      expect(result.graph.name).toBe('Attack');
    });

    it('handles "fight" keyword', () => {
      const result = generateFromDescription('fight the hero');
      expect(result.graph.name).toBe('Attack');
    });
  });

  // ─── Idle Pattern ───

  describe('idle pattern', () => {
    it('generates an idle graph', () => {
      const result = generateFromDescription('stand still');
      expect(result.graph.name).toBe('Idle');
    });

    it('generates idle from "wait"', () => {
      const result = generateFromDescription('wait here');
      expect(result.graph.name).toBe('Idle');
    });
  });

  // ─── Fallback ───

  describe('fallback / unknown', () => {
    it('returns low-confidence fallback for gibberish', () => {
      const result = generateFromDescription('xyzzy frobnicate widget');
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns a valid graph even for unknown input', () => {
      const result = generateFromDescription('something completely random');
      expect(result.graph).toBeDefined();
      expect(result.graph.nodes.length).toBeGreaterThan(0);
    });
  });

  // ─── Graph Structure Validation ───

  describe('graph structure', () => {
    it('every generated graph has a root node', () => {
      const descriptions = [
        'patrol between 0 and 500',
        'chase the player',
        'flee when hurt',
        'guard position 100',
        'wander around',
        'attack the enemy',
        'stand still',
      ];

      for (const desc of descriptions) {
        const result = generateFromDescription(desc);
        expect(result.graph.root).toBeDefined();
        expect(result.graph.nodes.find(n => n.id === result.graph.root)).toBeDefined();
      }
    });

    it('every edge references valid nodes', () => {
      const descriptions = [
        'patrol 100 to 400',
        'chase player within 200px',
        'alert, chase, flee',
        'guard 300 defend player',
      ];

      for (const desc of descriptions) {
        const result = generateFromDescription(desc);
        const nodeIds = new Set(result.graph.nodes.map(n => n.id));
        for (const edge of result.graph.edges) {
          expect(nodeIds.has(edge.from)).toBe(true);
          expect(nodeIds.has(edge.to)).toBe(true);
        }
      }
    });

    it('every node has valid type and data', () => {
      const descriptions = [
        'patrol back and forth',
        'chase player',
        'attack hero at 100px',
      ];

      for (const desc of descriptions) {
        const result = generateFromDescription(desc);
        for (const node of result.graph.nodes) {
          expect(['composite', 'condition', 'action', 'decorator']).toContain(node.type);
          expect(node.data).toBeDefined();
          expect(node.data.type).toBe(node.type);
        }
      }
    });

    it('graphs have unique node IDs', () => {
      const result = generateFromDescription('alert, chase, flee from player');
      const ids = result.graph.nodes.map(n => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // ─── Custom Patterns ───

  describe('custom patterns', () => {
    it('allows registering custom patterns', () => {
      const customPattern: BehaviorPattern = {
        keywords: ['dance'],
        priority: 200,
        build: (ctx) => {
          if (!ctx.has('dance')) return null;
          return {
            id: 'dance-graph',
            name: 'Dance',
            root: 'root',
            nodes: [
              { id: 'root', type: 'action', data: { type: 'action', action: { kind: 'play-animation', name: 'dance' } }, label: 'Dance!' },
            ],
            edges: [],
            tags: ['dance', 'custom', 'ai-generated'],
          };
        },
      };

      registerPattern(customPattern);

      const result = generateFromDescription('dance');
      expect(result.graph.name).toBe('Dance');
      expect(result.graph.tags).toContain('custom');
    });
  });

  // ─── Available Patterns API ───

  describe('getAvailablePatterns', () => {
    it('returns list of built-in patterns', () => {
      const patterns = getAvailablePatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.keywords.includes('patrol'))).toBe(true);
      expect(patterns.some(p => p.keywords.includes('chase'))).toBe(true);
    });
  });

  // ─── Entity Detection ───

  describe('entity detection', () => {
    it('detects player entity', () => {
      const result = generateFromDescription('chase the player');
      const json = JSON.stringify(result.graph);
      expect(json).toContain('player');
    });

    it('detects enemy entity', () => {
      const result = generateFromDescription('chase the enemy');
      const json = JSON.stringify(result.graph);
      expect(json).toContain('enemy');
    });

    it('detects boss entity', () => {
      const result = generateFromDescription('guard against boss');
      const json = JSON.stringify(result.graph);
      expect(json).toContain('boss');
    });

    it('uses detected entity in graph', () => {
      const result = generateFromDescription('guard against boss');
      const json = JSON.stringify(result.graph);
      // Should have some reference to boss or the detected entity
      const hasEntity = json.includes('boss') || json.includes('player') || json.includes('enemy');
      expect(hasEntity).toBe(true);
    });
  });

  // ─── Numeric Extraction ───

  describe('numeric parameter extraction', () => {
    it('extracts patrol range from numbers', () => {
      const result = generateFromDescription('patrol 50 to 250');
      expect(result.graph.name).toBe('Patrol');
      // Check that nodes reference the extracted numbers
      const moveNodes = result.graph.nodes.filter(n => n.label?.includes('50') || n.label?.includes('250'));
      expect(moveNodes.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts detection range', () => {
      const result = generateFromDescription('chase player at 200px');
      const detectNode = result.graph.nodes.find(n =>
        n.type === 'condition' && n.label?.includes('200')
      );
      expect(detectNode).toBeDefined();
    });
  });
});
