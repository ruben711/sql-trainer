// Smoke test ALL/ANY transformaties
function pgToSqlite(sql) {
  if (!sql) return sql;
  const stash = [];
  const protect = (s, re) => s.replace(re, (m) => { stash.push(m); return `__P${stash.length - 1}__`; });
  let s = sql;
  s = protect(s, /'(?:[^'\\]|\\.|'')*'/g);
  s = protect(s, /\/\*[\s\S]*?\*\//g);
  s = protect(s, /--[^\n]*/g);
  s = protect(s, /"(?:[^"]|"")*"/g);

  s = s.replace(
    /(>=|<=|<>|!=|>|<|=)\s*ALL\s*\(\s*SELECT\s+(.+?)\s+FROM\s+([^)]+?)\)/gi,
    (m, op, col, rest) => {
      if (op === "<>" || op === "!=") return `NOT IN (SELECT ${col.trim()} FROM ${rest})`;
      if (op === ">" || op === ">=") return `${op} (SELECT MAX(${col.trim()}) FROM ${rest})`;
      if (op === "<" || op === "<=") return `${op} (SELECT MIN(${col.trim()}) FROM ${rest})`;
      return m;
    }
  );
  s = s.replace(
    /(>=|<=|<>|!=|>|<|=)\s*(?:ANY|SOME)\s*\(\s*SELECT\s+(.+?)\s+FROM\s+([^)]+?)\)/gi,
    (m, op, col, rest) => {
      if (op === "=") return `IN (SELECT ${col.trim()} FROM ${rest})`;
      if (op === ">" || op === ">=") return `${op} (SELECT MIN(${col.trim()}) FROM ${rest})`;
      if (op === "<" || op === "<=") return `${op} (SELECT MAX(${col.trim()}) FROM ${rest})`;
      return m;
    }
  );

  s = s.replace(/__P(\d+)__/g, (_, i) => stash[+i]);
  return s;
}

const tests = [
  "SELECT titel, prijs FROM Zoekertje WHERE prijs > ALL (SELECT bod FROM Bod);",
  "SELECT * FROM t WHERE x < ALL (SELECT v FROM tab WHERE active = 1);",
  "SELECT * FROM t WHERE x > ANY (SELECT v FROM tab);",
  "SELECT * FROM t WHERE x = ANY (SELECT id FROM ids);",
  "SELECT * FROM t WHERE x <> ALL (SELECT id FROM ids);",
];
for (const q of tests) {
  console.log("IN :", q);
  console.log("OUT:", pgToSqlite(q));
  console.log("");
}
