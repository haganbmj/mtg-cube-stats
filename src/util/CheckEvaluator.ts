import type { CheckExpression, CheckResult, AggregateField } from '../types/checks';
import type { CubeCard } from '../types/cube';
import type { FilterContext } from './CardFilterEvaluator';
import { evaluateCard } from './CardFilterEvaluator';
import { parseQuery } from './CardFilterParser';

function compare(lhs: number, op: string, rhs: number): boolean {
  switch (op) {
    case '>':  return lhs > rhs;
    case '<':  return lhs < rhs;
    case '>=': return lhs >= rhs;
    case '<=': return lhs <= rhs;
    case '!=': return lhs !== rhs;
    case '=':  return lhs === rhs;
    default:   return false;
  }
}

function countMatching(cardFilter: string, cards: CubeCard[], ctx: FilterContext): number {
  const { ast } = parseQuery(cardFilter);
  if (!ast) return 0;
  return cards.filter(card => evaluateCard(ast, card, ctx)).length;
}

function getNumericField(card: CubeCard, field: AggregateField): number | null {
  switch (field) {
    case 'cmc':
      return card.cmc ?? null;
    case 'words':
      return card.oracleTextWordCount ?? null;
    case 'power': {
      const v = parseFloat((card as any).power);
      return isNaN(v) ? null : v;
    }
    case 'toughness': {
      const v = parseFloat((card as any).toughness);
      return isNaN(v) ? null : v;
    }
    case 'elo':
      return card.elo ?? null;
    case 'usd':
      return card.minPriceUsd ?? null;
    case 'tix':
      return card.minPriceTix ?? null;
    case 'year':
      return card.releaseYear ?? null;
    default:
      return null;
  }
}

function computeAggregate(func: string, values: number[]): number | null {
  if (values.length === 0) return null;
  switch (func) {
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
    default:
      return null;
  }
}

export function evaluateCheck(expression: CheckExpression, cards: CubeCard[], ctx: FilterContext): CheckResult {
  switch (expression.type) {
    case 'count': {
      const matchCount = countMatching(expression.cardFilter, cards, ctx);
      const totalCards = cards.length;
      let lhsValue: number;
      if (expression.isPercentage) {
        lhsValue = totalCards > 0 ? (matchCount / totalCards) * 100 : 0;
      } else {
        lhsValue = matchCount;
      }
      return {
        passed: compare(lhsValue, expression.op, expression.threshold),
        lhsValue,
        rhsValue: expression.threshold,
        isPercentage: expression.isPercentage,
        expressionType: 'count',
      };
    }

    case 'relative': {
      const lhsCount = countMatching(expression.lhsFilter, cards, ctx);
      const rhsCount = countMatching(expression.rhsFilter, cards, ctx);
      return {
        passed: compare(lhsCount, expression.op, rhsCount),
        lhsValue: lhsCount,
        rhsValue: rhsCount,
        isPercentage: false,
        expressionType: 'relative',
      };
    }

    case 'aggregate': {
      let scopedCards = cards;
      if (expression.cardFilter) {
        const { ast } = parseQuery(expression.cardFilter);
        if (ast) {
          scopedCards = cards.filter(card => evaluateCard(ast, card, ctx));
        }
      }
      const values: number[] = [];
      for (const card of scopedCards) {
        const v = getNumericField(card, expression.field);
        if (v !== null) values.push(v);
      }
      const aggResult = computeAggregate(expression.func, values) ?? 0;
      return {
        passed: compare(aggResult, expression.op, expression.threshold),
        lhsValue: aggResult,
        rhsValue: expression.threshold,
        isPercentage: false,
        expressionType: 'aggregate',
      };
    }
  }
}
