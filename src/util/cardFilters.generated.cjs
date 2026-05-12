// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require("moo");

const lexer = moo.compile({
    ws:          { match: /[\s,]+/, lineBreaks: true },
    lparen:      "(",
    rparen:      ")",
    op:          [">=", "<=", "!=", ">", "<", "="],
    colon:       ":",
    minus:       "-",
    dateString:  /[0-9]{4}-[0-9]{2}-[0-9]{2}/,
    number:      /[0-9]+(?:\.[0-9]+)?/,
    quotedString: { match: /"(?:[^"\\]|\\.)*"/, value: s => s.slice(1, -1) },
    or_kw:       { match: /[oO][rR](?=\s|\(|$)/, value: () => "or" },
    and_kw:      { match: /[aA][nN][dD](?=\s|\(|$)/, value: () => "and" },
    bareword:    /[\p{L}\p{N}_#'.\/\*\[\]\-]+/u,
});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "query", "symbols": ["_", "terms", "_"], "postprocess": ([, t]) => t},
    {"name": "terms", "symbols": ["terms", "_", {"literal":"or"}, "_", "term"], "postprocess": ([left,,,,right]) => ({ type: "or",  left, right })},
    {"name": "terms", "symbols": ["terms", "_", {"literal":"and"}, "_", "term"], "postprocess": ([left,,,,right]) => ({ type: "and", left, right })},
    {"name": "terms", "symbols": ["terms", "__", "term"], "postprocess": ([left,, right])  => ({ type: "and", left, right })},
    {"name": "terms", "symbols": ["term"], "postprocess": id},
    {"name": "term", "symbols": [{"literal":"("}, "_", "terms", "_", {"literal":")"}], "postprocess": ([,, t]) => t},
    {"name": "term", "symbols": [{"literal":"-"}, "criterion"], "postprocess": ([, c]) => ({ type: "not", child: c })},
    {"name": "term", "symbols": ["criterion"], "postprocess": id},
    {"name": "criterion", "symbols": [(lexer.has("bareword") ? {type: "bareword"} : bareword), (lexer.has("op") ? {type: "op"} : op), "value"], "postprocess": ([kw, op, val]) => ({ type: "condition", keyword: kw.value, op: op.value, value: val })},
    {"name": "criterion", "symbols": [(lexer.has("bareword") ? {type: "bareword"} : bareword), (lexer.has("colon") ? {type: "colon"} : colon), "value"], "postprocess": ([kw,, val])    => ({ type: "condition", keyword: kw.value, op: ":",     value: val })},
    {"name": "criterion", "symbols": ["bareOrQuoted"], "postprocess": ([v]) => ({ type: "name", value: v })},
    {"name": "value", "symbols": [(lexer.has("quotedString") ? {type: "quotedString"} : quotedString)], "postprocess": ([t]) => t.value},
    {"name": "value", "symbols": [(lexer.has("dateString") ? {type: "dateString"} : dateString)], "postprocess": ([t]) => t.value},
    {"name": "value", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": ([t]) => parseFloat(t.value)},
    {"name": "value", "symbols": [(lexer.has("bareword") ? {type: "bareword"} : bareword)], "postprocess": ([t]) => t.value},
    {"name": "bareOrQuoted", "symbols": [(lexer.has("quotedString") ? {type: "quotedString"} : quotedString)], "postprocess": ([t]) => t.value},
    {"name": "bareOrQuoted", "symbols": [(lexer.has("bareword") ? {type: "bareword"} : bareword)], "postprocess": ([t]) => t.value},
    {"name": "_", "symbols": []},
    {"name": "_", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": () => null},
    {"name": "__", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": () => null}
]
  , ParserStart: "query"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
