import type {
  CheckExpression,
  CountCheck,
  RelativeCheck,
  AggregateCheck,
  ComparisonOp,
  AggregateFunction,
  AggregateField
} from '../types/checks';
import { parseQuery } from './CardFilterParser';

const COMPARISON_OPS = ['>=', '<=', '!=', '>', '<', '='] as const;
const AGGREGATE_FUNCTIONS: AggregateFunction[] = ['avg', 'sum', 'min', 'max', 'median'];
const AGGREGATE_FIELDS: AggregateField[] = ['cmc', 'words', 'power', 'toughness', 'elo', 'usd', 'tix', 'year'];

interface ParseCheckResult {
  expression: CheckExpression | null;
  error: string | null;
}

function validateCardFilter(filter: string): string | null {
  const { error } = parseQuery(filter);
  return error;
}

/**
 * Find the top-level comparison operator in the expression.
 * Top-level operators are surrounded by whitespace.
 * Scans right-to-left to find the last such operator (handles relative comparisons).
 */
function findTopLevelOp(input: string): { op: ComparisonOp; index: number } | null {
  // Scan right-to-left for whitespace-surrounded comparison operators
  for (let i = input.length - 1; i >= 0; i--) {
    for (const op of COMPARISON_OPS) {
      if (i - op.length < 0) continue;
      const start = i - op.length + 1;
      const slice = input.slice(start, i + 1);
      if (slice !== op) continue;

      // Check for surrounding whitespace
      const before = start - 1;
      const after = i + 1;
      if (before < 0 || after >= input.length) continue;
      if (input[before] !== ' ' || input[after] !== ' ') continue;

      // Skip if inside parentheses
      let depth = 0;
      for (let j = 0; j < start; j++) {
        if (input[j] === '(') depth++;
        if (input[j] === ')') depth--;
      }
      if (depth > 0) continue;

      return { op: op as ComparisonOp, index: start };
    }
  }
  return null;
}

/**
 * Check if a string looks like a numeric threshold (with optional %).
 */
function parseThreshold(s: string): { value: number; isPercentage: boolean } | null {
  const trimmed = s.trim();
  const isPercentage = trimmed.endsWith('%');
  const numStr = isPercentage ? trimmed.slice(0, -1) : trimmed;
  const value = parseFloat(numStr);
  if (isNaN(value)) return null;
  return { value, isPercentage };
}

/**
 * Try to parse as an aggregate expression.
 * Pattern: func(field) or func(field, cardFilter)
 */
function parseAggregate(lhs: string): { func: AggregateFunction; field: AggregateField; cardFilter: string | null } | null {
  const match = lhs.match(/^(avg|sum|min|max|median)\((.+)\)$/);
  if (!match) return null;

  const func = match[1] as AggregateFunction;
  const inner = match[2];

  // Split on first comma for field vs card filter
  const commaIndex = inner.indexOf(',');
  let fieldStr: string;
  let cardFilter: string | null = null;

  if (commaIndex === -1) {
    fieldStr = inner.trim();
  } else {
    fieldStr = inner.slice(0, commaIndex).trim();
    cardFilter = inner.slice(commaIndex + 1).trim();
  }

  if (!AGGREGATE_FIELDS.includes(fieldStr as AggregateField)) {
    return null;
  }

  return { func, field: fieldStr as AggregateField, cardFilter };
}

export function parseCheckExpression(input: string): ParseCheckResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { expression: null, error: 'Expression cannot be empty' };
  }

  // Check if LHS starts with an aggregate function
  const aggFuncMatch = trimmed.match(/^(avg|sum|min|max|median)\(/);

  // Find top-level comparison operator
  const topOp = findTopLevelOp(trimmed);

  // Aggregate without comparison is an error
  if (aggFuncMatch && !topOp) {
    return { expression: null, error: 'Aggregate expressions require a comparison operator (e.g., avg(cmc) < 3.5)' };
  }

  // No top-level operator → implicit > 0 count check
  if (!topOp) {
    const filterError = validateCardFilter(trimmed);
    if (filterError) {
      return { expression: null, error: filterError };
    }
    return {
      expression: {
        type: 'count',
        cardFilter: trimmed,
        op: '>',
        threshold: 0,
        isPercentage: false,
      } satisfies CountCheck,
      error: null,
    };
  }

  const lhs = trimmed.slice(0, topOp.index).trimEnd();
  const rhs = trimmed.slice(topOp.index + topOp.op.length).trimStart();
  const op = topOp.op;

  if (!lhs || !rhs) {
    return { expression: null, error: 'Missing left-hand or right-hand side of comparison' };
  }

  // Try aggregate
  const agg = parseAggregate(lhs);
  if (agg) {
    const threshold = parseThreshold(rhs);
    if (!threshold) {
      return { expression: null, error: `Invalid threshold: "${rhs}". Expected a number.` };
    }
    if (threshold.isPercentage) {
      return { expression: null, error: 'Percentage thresholds are not supported for aggregate functions' };
    }
    if (agg.cardFilter) {
      const filterError = validateCardFilter(agg.cardFilter);
      if (filterError) {
        return { expression: null, error: filterError };
      }
    }
    return {
      expression: {
        type: 'aggregate',
        func: agg.func,
        field: agg.field,
        cardFilter: agg.cardFilter,
        op,
        threshold: threshold.value,
      } satisfies AggregateCheck,
      error: null,
    };
  }

  // Check if aggregate function name but failed to parse (bad field)
  if (aggFuncMatch) {
    const funcName = aggFuncMatch[1];
    if (AGGREGATE_FUNCTIONS.includes(funcName as AggregateFunction)) {
      return { expression: null, error: `Invalid aggregate field in ${funcName}(). Valid fields: ${AGGREGATE_FIELDS.join(', ')}` };
    }
  }

  // Check if LHS looks like a function call with an invalid function name
  const funcCallMatch = lhs.match(/^(\w+)\(.+\)$/);
  if (funcCallMatch && !AGGREGATE_FUNCTIONS.includes(funcCallMatch[1] as AggregateFunction)) {
    return { expression: null, error: `Unknown aggregate function "${funcCallMatch[1]}". Valid functions: ${AGGREGATE_FUNCTIONS.join(', ')}` };
  }

  // Try threshold (count check) vs card filter (relative check)
  const threshold = parseThreshold(rhs);
  if (threshold) {
    const filterError = validateCardFilter(lhs);
    if (filterError) {
      return { expression: null, error: filterError };
    }
    return {
      expression: {
        type: 'count',
        cardFilter: lhs,
        op,
        threshold: threshold.value,
        isPercentage: threshold.isPercentage,
      } satisfies CountCheck,
      error: null,
    };
  }

  // RHS is not numeric → relative check
  const lhsFilterError = validateCardFilter(lhs);
  if (lhsFilterError) {
    return { expression: null, error: lhsFilterError };
  }
  const rhsFilterError = validateCardFilter(rhs);
  if (rhsFilterError) {
    return { expression: null, error: rhsFilterError };
  }
  return {
    expression: {
      type: 'relative',
      lhsFilter: lhs,
      op,
      rhsFilter: rhs,
    } satisfies RelativeCheck,
    error: null,
  };
}
