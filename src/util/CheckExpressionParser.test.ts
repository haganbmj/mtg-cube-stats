import { describe, it, expect } from 'vitest';
import { parseCheckExpression } from './CheckExpressionParser';

describe('CheckExpressionParser', () => {
  describe('count checks', () => {
    it('parses absolute count: c:u > 10', () => {
      const result = parseCheckExpression('c:u > 10');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'count',
        cardFilter: 'c:u',
        op: '>',
        threshold: 10,
        isPercentage: false,
      });
    });

    it('parses percentage count: type:creature > 50%', () => {
      const result = parseCheckExpression('type:creature > 50%');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'count',
        cardFilter: 'type:creature',
        op: '>',
        threshold: 50,
        isPercentage: true,
      });
    });

    it('parses implicit > 0: keyword:flying', () => {
      const result = parseCheckExpression('keyword:flying');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'count',
        cardFilter: 'keyword:flying',
        op: '>',
        threshold: 0,
        isPercentage: false,
      });
    });

    it('parses with >= operator: cmc>3 >= 20', () => {
      const result = parseCheckExpression('cmc>3 >= 20');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'count',
        cardFilter: 'cmc>3',
        op: '>=',
        threshold: 20,
        isPercentage: false,
      });
    });

    it('parses decimal threshold: type:creature > 33.3%', () => {
      const result = parseCheckExpression('type:creature > 33.3%');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'count',
        cardFilter: 'type:creature',
        op: '>',
        threshold: 33.3,
        isPercentage: true,
      });
    });
  });

  describe('relative checks', () => {
    it('parses relative: t:instant >= t:sorcery', () => {
      const result = parseCheckExpression('t:instant >= t:sorcery');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'relative',
        lhsFilter: 't:instant',
        op: '>=',
        rhsFilter: 't:sorcery',
      });
    });

    it('parses relative with complex filters: c:u type:creature > c:r type:creature', () => {
      const result = parseCheckExpression('c:u type:creature > c:r type:creature');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'relative',
        lhsFilter: 'c:u type:creature',
        op: '>',
        rhsFilter: 'c:r type:creature',
      });
    });
  });

  describe('aggregate checks', () => {
    it('parses unscoped aggregate: avg(cmc) < 3.5', () => {
      const result = parseCheckExpression('avg(cmc) < 3.5');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'aggregate',
        func: 'avg',
        field: 'cmc',
        cardFilter: null,
        op: '<',
        threshold: 3.5,
      });
    });

    it('parses scoped aggregate: avg(cmc, type:creature) < 3', () => {
      const result = parseCheckExpression('avg(cmc, type:creature) < 3');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'aggregate',
        func: 'avg',
        field: 'cmc',
        cardFilter: 'type:creature',
        op: '<',
        threshold: 3,
      });
    });

    it('parses max aggregate: max(cmc) <= 7', () => {
      const result = parseCheckExpression('max(cmc) <= 7');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'aggregate',
        func: 'max',
        field: 'cmc',
        cardFilter: null,
        op: '<=',
        threshold: 7,
      });
    });

    it('parses median aggregate: median(words) > 10', () => {
      const result = parseCheckExpression('median(words) > 10');
      expect(result.error).toBeNull();
      expect(result.expression).toEqual({
        type: 'aggregate',
        func: 'median',
        field: 'words',
        cardFilter: null,
        op: '>',
        threshold: 10,
      });
    });
  });

  describe('error cases', () => {
    it('returns error for empty input', () => {
      const result = parseCheckExpression('');
      expect(result.expression).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('returns error for aggregate with no comparison', () => {
      const result = parseCheckExpression('avg(cmc)');
      expect(result.expression).toBeNull();
      expect(result.error).toContain('comparison');
    });

    it('returns error for invalid aggregate field', () => {
      const result = parseCheckExpression('avg(invalid) > 5');
      expect(result.expression).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('returns error for invalid aggregate function', () => {
      const result = parseCheckExpression('foo(cmc) > 5');
      expect(result.expression).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });
});
