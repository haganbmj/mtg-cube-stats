import * as fs from 'fs';
import * as readline from 'readline';
import type { Eligibility, EligibilityRule } from '../types';

interface Printing {
    oracle_id?: string;
    rarity?: string;
    games?: string[];
    released_at?: string;
    set?: string;
}

interface Candidate {
    date: number;
    setCode: string;
}

function isBetter(candidate: Candidate, current: Candidate | undefined): boolean {
    if (!current) {
        return true;
    }
    if (candidate.date !== current.date) {
        return candidate.date < current.date;
    }
    return candidate.setCode < current.setCode;
}

function qualifiesForRule(rarity: string | undefined, rule: EligibilityRule): boolean {
    if (rule === 'firstPrinting') {
        return true;
    }
    if (rule === 'firstCommon') {
        return rarity === 'common';
    }
    return rarity === 'common' || rarity === 'uncommon';
}

export async function computeEligibility(
    lines: AsyncIterable<string> | Iterable<string>,
    rule: EligibilityRule,
): Promise<Map<string, Eligibility>> {
    const fallbackBest = new Map<string, Candidate>();
    const ruleBest = new Map<string, Candidate>();

    let lineNumber = 0;
    for await (const line of lines) {
        lineNumber += 1;
        if (line.trim() === '') {
            continue;
        }

        let printing: Printing;
        try {
            printing = JSON.parse(line);
        } catch (err) {
            throw new Error(`malformed JSON on line ${lineNumber}: ${(err as Error).message}`);
        }

        const { oracle_id: oracleId, rarity, games, released_at: releasedAt, set } = printing;
        if (!oracleId) {
            continue;
        }
        if (!games || !(games.includes('paper') || games.includes('mtgo'))) {
            continue;
        }

        const candidate: Candidate = { date: Date.parse(releasedAt!), setCode: set! };

        if (isBetter(candidate, fallbackBest.get(oracleId))) {
            fallbackBest.set(oracleId, candidate);
        }

        if (qualifiesForRule(rarity, rule) && isBetter(candidate, ruleBest.get(oracleId))) {
            ruleBest.set(oracleId, candidate);
        }
    }

    const result = new Map<string, Eligibility>();
    for (const [oracleId, fallback] of fallbackBest) {
        const best = ruleBest.get(oracleId);
        if (best) {
            result.set(oracleId, { date: best.date, setCode: best.setCode, fallback: false });
        } else {
            result.set(oracleId, { date: fallback.date, setCode: fallback.setCode, fallback: true });
        }
    }

    return result;
}

export function readJsonlLines(path: string): AsyncIterable<string> {
    return readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity });
}
