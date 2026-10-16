import type { KeywordCostTable } from '../types';
import { isEvergreenKeyword } from './Keywords';

export const EVERGREEN_KEYWORD_COST = 3;

export const DEFAULT_KEYWORD_COST_TABLE: KeywordCostTable = { costs: {}, fallback: 15 };

function countWords(text: string): number {
    return text.split(/\b\W+\b/g).filter(Boolean).length;
}

function roundedMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    return Math.round(median);
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Measures each keyword's reminder text on cards where the keyword starts a line
 * (or follows a comma in a keyword list), so that mid-sentence mentions are ignored.
 */
export function buildKeywordCosts(cards: Array<{ oracleText: string; keywords: string[] }>): KeywordCostTable {
    const observations = new Map<string, number[]>();
    const patterns = new Map<string, RegExp>();

    for (const card of cards) {
        const oracleText = card?.oracleText ?? '';
        for (const keyword of card?.keywords ?? []) {
            if (!observations.has(keyword)) {
                observations.set(keyword, []);
            }
            let pattern = patterns.get(keyword);
            if (!pattern) {
                pattern = new RegExp(`(?:^|\\n|, )${escapeRegExp(keyword)}\\b[^(\\n]*?\\(([^)]*)\\)`, 'i');
                patterns.set(keyword, pattern);
            }
            const match = pattern.exec(oracleText);
            if (match) {
                observations.get(keyword)!.push(countWords(match[1]));
            }
        }
    }

    const costs: Record<string, number> = {};
    const nonEvergreenCosts: number[] = [];
    for (const [keyword, counts] of observations) {
        if (counts.length === 0) {
            continue;
        }
        costs[keyword] = roundedMedian(counts);
        if (!isEvergreenKeyword(keyword)) {
            nonEvergreenCosts.push(costs[keyword]);
        }
    }

    const fallback = nonEvergreenCosts.length > 0
        ? roundedMedian(nonEvergreenCosts)
        : DEFAULT_KEYWORD_COST_TABLE.fallback;

    for (const keyword of observations.keys()) {
        if (isEvergreenKeyword(keyword)) {
            costs[keyword] = EVERGREEN_KEYWORD_COST;
        } else if (costs[keyword] === undefined) {
            costs[keyword] = fallback;
        }
    }

    return { costs, fallback };
}

export function keywordCost(keyword: string, table: KeywordCostTable): number {
    return table.costs[keyword]
        ?? (isEvergreenKeyword(keyword) ? EVERGREEN_KEYWORD_COST : table.fallback);
}
