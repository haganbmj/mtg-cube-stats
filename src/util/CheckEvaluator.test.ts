import { describe, it, expect } from 'vitest';
import { evaluateCheck } from './CheckEvaluator';
import type { CountCheck, RelativeCheck, AggregateCheck } from '../types/checks';
import type { CubeCard } from '../types/cube';

function makeCard(overrides: Partial<CubeCard> = {}): CubeCard {
  return {
    printingId: 'test-print',
    oracleId: 'test-oracle',
    name: 'Test Card',
    cmc: 3,
    colors: ['U'],
    effectiveColors: ['U'],
    typeLine: 'Creature — Human',
    effectiveTypes: ['creature'],
    primaryType: 'creature',
    oracleText: 'some oracle text here',
    oracleTextWordCount: 4,
    rarity: 'common',
    keywords: [],
    ...overrides,
  } as CubeCard;
}

const emptyCtx = { loadedCubes: {} };

describe('CheckEvaluator', () => {
  describe('count checks', () => {
    it('counts matching cards (absolute)', () => {
      const cards = [
        makeCard({ colors: ['U'], effectiveColors: ['U'], typeLine: 'Creature', effectiveTypes: ['creature'] }),
        makeCard({ colors: ['U'], effectiveColors: ['U'], typeLine: 'Instant', effectiveTypes: ['instant'] }),
        makeCard({ colors: ['R'], effectiveColors: ['R'], typeLine: 'Creature', effectiveTypes: ['creature'] }),
      ];
      const expr: CountCheck = {
        type: 'count',
        cardFilter: 'c:u',
        op: '>',
        threshold: 1,
        isPercentage: false,
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      expect(result.passed).toBe(true);
      expect(result.lhsValue).toBe(2);
      expect(result.rhsValue).toBe(1);
    });

    it('counts matching cards (percentage)', () => {
      const cards = [
        makeCard({ typeLine: 'Creature', effectiveTypes: ['creature'] }),
        makeCard({ typeLine: 'Creature', effectiveTypes: ['creature'] }),
        makeCard({ typeLine: 'Instant', effectiveTypes: ['instant'] }),
        makeCard({ typeLine: 'Land', effectiveTypes: ['land'] }),
      ];
      const expr: CountCheck = {
        type: 'count',
        cardFilter: 'type:creature',
        op: '>',
        threshold: 50,
        isPercentage: true,
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      // 2/4 = 50%, not > 50%
      expect(result.passed).toBe(false);
      expect(result.lhsValue).toBe(50);
      expect(result.rhsValue).toBe(50);
    });

    it('handles implicit > 0 (at least one match)', () => {
      const cards = [
        makeCard({ keywords: ['flying'] }),
        makeCard({ keywords: [] }),
      ];
      const expr: CountCheck = {
        type: 'count',
        cardFilter: 'keyword:flying',
        op: '>',
        threshold: 0,
        isPercentage: false,
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      expect(result.passed).toBe(true);
      expect(result.lhsValue).toBe(1);
    });
  });

  describe('relative checks', () => {
    it('compares counts of two filters', () => {
      const cards = [
        makeCard({ typeLine: 'Instant', effectiveTypes: ['instant'] }),
        makeCard({ typeLine: 'Instant', effectiveTypes: ['instant'] }),
        makeCard({ typeLine: 'Sorcery', effectiveTypes: ['sorcery'] }),
      ];
      const expr: RelativeCheck = {
        type: 'relative',
        lhsFilter: 't:instant',
        op: '>=',
        rhsFilter: 't:sorcery',
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      expect(result.passed).toBe(true);
      expect(result.lhsValue).toBe(2);
      expect(result.rhsValue).toBe(1);
    });
  });

  describe('aggregate checks', () => {
    it('computes average over all cards', () => {
      const cards = [
        makeCard({ cmc: 2 }),
        makeCard({ cmc: 4 }),
        makeCard({ cmc: 6 }),
      ];
      const expr: AggregateCheck = {
        type: 'aggregate',
        func: 'avg',
        field: 'cmc',
        cardFilter: null,
        op: '<',
        threshold: 5,
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      expect(result.passed).toBe(true);
      expect(result.lhsValue).toBe(4); // (2+4+6)/3
    });

    it('computes scoped average', () => {
      const cards = [
        makeCard({ cmc: 2, typeLine: 'Creature', effectiveTypes: ['creature'] }),
        makeCard({ cmc: 6, typeLine: 'Creature', effectiveTypes: ['creature'] }),
        makeCard({ cmc: 10, typeLine: 'Instant', effectiveTypes: ['instant'] }),
      ];
      const expr: AggregateCheck = {
        type: 'aggregate',
        func: 'avg',
        field: 'cmc',
        cardFilter: 'type:creature',
        op: '<=',
        threshold: 4,
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      expect(result.passed).toBe(true);
      expect(result.lhsValue).toBe(4); // (2+6)/2
    });

    it('computes median', () => {
      const cards = [
        makeCard({ cmc: 1 }),
        makeCard({ cmc: 3 }),
        makeCard({ cmc: 7 }),
        makeCard({ cmc: 9 }),
        makeCard({ cmc: 10 }),
      ];
      const expr: AggregateCheck = {
        type: 'aggregate',
        func: 'median',
        field: 'cmc',
        cardFilter: null,
        op: '=',
        threshold: 7,
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      expect(result.passed).toBe(true);
      expect(result.lhsValue).toBe(7);
    });

    it('skips cards with non-numeric values for power', () => {
      const cards = [
        makeCard({ power: '2' } as any),
        makeCard({ power: '*' } as any),
        makeCard({ power: '4' } as any),
      ];
      const expr: AggregateCheck = {
        type: 'aggregate',
        func: 'avg',
        field: 'power',
        cardFilter: null,
        op: '=',
        threshold: 3,
      };
      const result = evaluateCheck(expr, cards, emptyCtx);
      expect(result.passed).toBe(true);
      expect(result.lhsValue).toBe(3); // (2+4)/2, * skipped
    });
  });
});
