import React from "react";

const KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "JOIN", "CROSS", "NATURAL", "ON", "USING",
  "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "ILIKE", "IS", "NULL",
  "EXISTS", "ANY", "ALL", "SOME",
  "UNION", "INTERSECT", "EXCEPT",
  "AS", "DISTINCT", "WITH", "CASE", "WHEN", "THEN", "ELSE", "END",
  "CREATE", "VIEW", "TABLE", "INDEX", "DROP", "ALTER", "INSERT", "INTO",
  "VALUES", "UPDATE", "SET", "DELETE", "PRAGMA",
  "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "UNIQUE", "DEFAULT", "CHECK",
  "CONSTRAINT", "IF", "REPLACE",
  "ASC", "DESC", "TRUE", "FALSE",
]);

const FUNCTIONS = new Set([
  "COUNT", "SUM", "AVG", "MIN", "MAX",
  "UPPER", "LOWER", "LENGTH", "SUBSTR", "SUBSTRING", "TRIM",
  "CONCAT", "REPLACE", "POSITION", "INSTR",
  "ROUND", "ABS", "MOD", "CEIL", "FLOOR", "SIGN", "POWER", "SQRT",
  "COALESCE", "NULLIF", "CAST",
  "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP",
  "EXTRACT", "AGE", "DATE", "STRFTIME",
]);

const TYPES = new Set([
  "INTEGER", "INT", "BIGINT", "SMALLINT",
  "VARCHAR", "CHAR", "TEXT",
  "BOOLEAN", "BOOL",
  "DATE", "TIME", "TIMESTAMP",
  "DOUBLE", "REAL", "FLOAT", "NUMERIC", "DECIMAL",
  "BLOB",
]);

type Token = { v: string; cls: string };

function tokenize(sql: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const c = sql[i];

    // Whitespace + newline preserveren
    if (/\s/.test(c)) {
      let j = i;
      while (j < n && /\s/.test(sql[j])) j++;
      out.push({ v: sql.slice(i, j), cls: "" });
      i = j;
      continue;
    }

    // Line comment --
    if (c === "-" && sql[i + 1] === "-") {
      let j = i;
      while (j < n && sql[j] !== "\n") j++;
      out.push({ v: sql.slice(i, j), cls: "c" });
      i = j;
      continue;
    }

    // Block comment /* */
    if (c === "/" && sql[i + 1] === "*") {
      let j = i + 2;
      while (j < n && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
      j = Math.min(n, j + 2);
      out.push({ v: sql.slice(i, j), cls: "c" });
      i = j;
      continue;
    }

    // String literal
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      out.push({ v: sql.slice(i, j), cls: "s" });
      i = j;
      continue;
    }

    // Number
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < n && /[0-9.]/.test(sql[j])) j++;
      out.push({ v: sql.slice(i, j), cls: "n" });
      i = j;
      continue;
    }

    // Identifier / keyword
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_]/.test(sql[j])) j++;
      const word = sql.slice(i, j);
      const up = word.toUpperCase();
      let cls = "";
      if (KEYWORDS.has(up)) cls = "k";
      else if (FUNCTIONS.has(up)) cls = "f";
      else if (TYPES.has(up)) cls = "t";
      out.push({ v: word, cls });
      i = j;
      continue;
    }

    // Operator / punctuation
    out.push({ v: c, cls: "o" });
    i++;
  }

  return out;
}

const CLASS_MAP: Record<string, string> = {
  k: "text-[var(--sql-keyword)]",
  f: "text-[var(--sql-fn)]",
  s: "text-[var(--sql-string)]",
  n: "text-[var(--sql-number)]",
  c: "text-[var(--sql-comment)] italic",
  t: "text-[var(--sql-type)]",
  o: "text-fg",
  "": "text-fg",
};

export function HighlightedSql({ sql, inline = false }: { sql: string; inline?: boolean }) {
  const tokens = tokenize(sql);
  const content = tokens.map((t, i) => (
    <span key={i} className={CLASS_MAP[t.cls] || "text-fg"}>{t.v}</span>
  ));
  if (inline) {
    return <code className="font-mono whitespace-pre">{content}</code>;
  }
  return (
    <pre className="font-mono whitespace-pre text-fg m-0 p-0 bg-transparent border-0 overflow-auto">
      {content}
    </pre>
  );
}
