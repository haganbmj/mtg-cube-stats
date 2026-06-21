export type ComparisonOp = '>' | '<' | '>=' | '<=' | '!=' | '=';
export type AggregateFunction = 'avg' | 'sum' | 'min' | 'max' | 'median';
export type AggregateField = 'cmc' | 'words' | 'power' | 'toughness' | 'elo' | 'usd' | 'tix' | 'year';

export interface CountCheck {
  type: 'count';
  cardFilter: string;
  op: ComparisonOp;
  threshold: number;
  isPercentage: boolean;
}

export interface RelativeCheck {
  type: 'relative';
  lhsFilter: string;
  op: ComparisonOp;
  rhsFilter: string;
}

export interface AggregateCheck {
  type: 'aggregate';
  func: AggregateFunction;
  field: AggregateField;
  cardFilter: string | null;
  op: ComparisonOp;
  threshold: number;
}

export type CheckExpression = CountCheck | RelativeCheck | AggregateCheck;

export interface CheckCondition {
  id: string;
  expression: string;
  label?: string;
}

export interface CheckCollection {
  id: string;
  name: string;
  conditions: CheckCondition[];
}

export interface ChecksState {
  collections: CheckCollection[];
  activeCollectionId: string | null;
}

export interface CheckResult {
  passed: boolean;
  lhsValue: number;
  rhsValue: number;
  isPercentage: boolean;
  expressionType: CheckExpression['type'];
}
