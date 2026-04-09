@{%
const moo = require("moo");

const lexer = moo.compile({
    ws:          { match: /\s+/, lineBreaks: true },
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
    bareword:    /[A-Za-z0-9_#'.\/\*\[\]\-]+/,
});
%}

@lexer lexer

# ─────────────────────────────────────────────────────────────────────────────
# Top-level query: a sequence of terms combined with implicit AND / explicit OR
# ─────────────────────────────────────────────────────────────────────────────

query -> _ terms _       {% ([, t]) => t %}

terms ->
      terms _ "or" _ term  {% ([left,,,,right]) => ({ type: "or",  left, right }) %}
    | terms _ "and" _ term {% ([left,,,,right]) => ({ type: "and", left, right }) %}
    | terms __ term        {% ([left,, right])  => ({ type: "and", left, right }) %}
    | term                 {% id %}

term ->
      "(" _ terms _ ")"  {% ([,, t]) => t %}
    | "-" criterion       {% ([, c]) => ({ type: "not", child: c }) %}
    | criterion           {% id %}

# ─────────────────────────────────────────────────────────────────────────────
# A single filter criterion
# ─────────────────────────────────────────────────────────────────────────────

criterion ->
      %bareword %op value        {% ([kw, op, val]) => ({ type: "condition", keyword: kw.value, op: op.value, value: val }) %}
    | %bareword %colon value     {% ([kw,, val])    => ({ type: "condition", keyword: kw.value, op: ":",     value: val }) %}
    | bareOrQuoted               {% ([v]) => ({ type: "name", value: v }) %}

# ─────────────────────────────────────────────────────────────────────────────
# Values
# ─────────────────────────────────────────────────────────────────────────────

value ->
      %quotedString   {% ([t]) => t.value %}
    | %dateString     {% ([t]) => t.value %}
    | %number         {% ([t]) => parseFloat(t.value) %}
    | %bareword       {% ([t]) => t.value %}

bareOrQuoted ->
      %quotedString   {% ([t]) => t.value %}
    | %bareword       {% ([t]) => t.value %}

# ─────────────────────────────────────────────────────────────────────────────
# Whitespace helpers
# ─────────────────────────────────────────────────────────────────────────────

_ ->  null | %ws    {% () => null %}
__ -> %ws           {% () => null %}
