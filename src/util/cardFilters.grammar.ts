// Card filter grammar for the Nearley parser.
// This is the source of truth — edit this file directly.
import moo from 'moo';

interface CompiledGrammar {
    Lexer: moo.Lexer;
    ParserRules: Array<{ name: string; symbols: unknown[]; postprocess?: (...args: any[]) => any }>;
    ParserStart: string;
}

const lexer = moo.compile({
    ws:          { match: /[\s,]+/u, lineBreaks: true },
    lparen:      '(',
    rparen:      ')',
    op:          ['>=', '<=', '!=', '>', '<', '='],
    colon:       ':',
    minus:       '-',
    dateString:  /[0-9]{4}-[0-9]{2}-[0-9]{2}/u,
    number:      /[0-9]+(?:\.[0-9]+)?/u,
    quotedString: { match: /"(?:[^"\\]|\\.)*"/u, value: (s: string) => s.slice(1, -1) },
    or_kw:       { match: /[oO][rR](?=\s|\(|$)/u, value: () => 'or' },
    and_kw:      { match: /[aA][nN][dD](?=\s|\(|$)/u, value: () => 'and' },
    bareword:    /[\p{L}\p{N}_#'.\/\*\[\]\-]+/u,
});

function id(x: unknown[]) { return x[0]; }

const grammar: CompiledGrammar = {
    Lexer: lexer,
    ParserRules: [
        { name: 'query', symbols: ['_', 'terms', '_'], postprocess: ([, t]: unknown[]) => t },
        { name: 'terms', symbols: ['terms', '_', { literal: 'or' }, '_', 'term'], postprocess: ([left, , , , right]: unknown[]) => ({ type: 'or', left, right }) },
        { name: 'terms', symbols: ['terms', '_', { literal: 'and' }, '_', 'term'], postprocess: ([left, , , , right]: unknown[]) => ({ type: 'and', left, right }) },
        { name: 'terms', symbols: ['terms', '__', 'term'], postprocess: ([left, , right]: unknown[]) => ({ type: 'and', left, right }) },
        { name: 'terms', symbols: ['term'], postprocess: id },
        { name: 'term', symbols: [{ literal: '(' }, '_', 'terms', '_', { literal: ')' }], postprocess: ([, , t]: unknown[]) => t },
        { name: 'term', symbols: [{ literal: '-' }, 'criterion'], postprocess: ([, c]: unknown[]) => ({ type: 'not', child: c }) },
        { name: 'term', symbols: ['criterion'], postprocess: id },
        { name: 'criterion', symbols: [lexer.has('bareword') ? { type: 'bareword' } : 'bareword', lexer.has('op') ? { type: 'op' } : 'op', 'value'], postprocess: ([kw, op, val]: any[]) => ({ type: 'condition', keyword: kw.value, op: op.value, value: val }) },
        { name: 'criterion', symbols: [lexer.has('bareword') ? { type: 'bareword' } : 'bareword', lexer.has('colon') ? { type: 'colon' } : 'colon', 'value'], postprocess: ([kw, , val]: any[]) => ({ type: 'condition', keyword: kw.value, op: ':', value: val }) },
        { name: 'criterion', symbols: ['bareOrQuoted'], postprocess: ([v]: unknown[]) => ({ type: 'name', value: v }) },
        { name: 'value', symbols: [lexer.has('quotedString') ? { type: 'quotedString' } : 'quotedString'], postprocess: ([t]: any[]) => t.value },
        { name: 'value', symbols: [lexer.has('dateString') ? { type: 'dateString' } : 'dateString'], postprocess: ([t]: any[]) => t.value },
        { name: 'value', symbols: [lexer.has('number') ? { type: 'number' } : 'number'], postprocess: ([t]: any[]) => parseFloat(t.value) },
        { name: 'value', symbols: [lexer.has('bareword') ? { type: 'bareword' } : 'bareword'], postprocess: ([t]: any[]) => t.value },
        { name: 'bareOrQuoted', symbols: [lexer.has('quotedString') ? { type: 'quotedString' } : 'quotedString'], postprocess: ([t]: any[]) => t.value },
        { name: 'bareOrQuoted', symbols: [lexer.has('bareword') ? { type: 'bareword' } : 'bareword'], postprocess: ([t]: any[]) => t.value },
        { name: '_', symbols: [] },
        { name: '_', symbols: [lexer.has('ws') ? { type: 'ws' } : 'ws'], postprocess: () => null },
        { name: '__', symbols: [lexer.has('ws') ? { type: 'ws' } : 'ws'], postprocess: () => null },
    ],
    ParserStart: 'query',
};

export default grammar;
