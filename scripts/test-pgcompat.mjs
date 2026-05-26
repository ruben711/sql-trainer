// Snelle smoke test van pgToSqlite (kopie van lib/pgCompat.ts logic).
const FMT_MAP = { YEAR: "%Y", MONTH: "%m", DAY: "%d", HOUR: "%H", MINUTE: "%M", SECOND: "%S", DOW: "%w", DOY: "%j" };

function pgToSqlite(sql) {
  if (!sql) return sql;
  const stash = [];
  const protect = (s, re) => s.replace(re, (m) => { stash.push(m); return `__P${stash.length - 1}__`; });
  let s = sql;
  s = protect(s, /'(?:[^'\\]|\\.|'')*'/g);
  s = protect(s, /\/\*[\s\S]*?\*\//g);
  s = protect(s, /--[^\n]*/g);
  s = protect(s, /"(?:[^"]|"")*"/g);
  s = s.replace(/\bEXTRACT\s*\(\s*(\w+)\s+FROM\s+([^)]+?)\)/gi, (_, u, e) => {
    const f = FMT_MAP[u.toUpperCase()];
    return f ? `CAST(strftime('${f}', ${e.trim()}) AS INTEGER)` : _;
  });
  s = s.replace(/\bGREATEST\b/gi, "MAX");
  s = s.replace(/\bLEAST\b/gi, "MIN");
  s = s.replace(/\bSTRING_AGG\b/gi, "GROUP_CONCAT");
  s = s.replace(/\bILIKE\b/gi, "LIKE");
  s = s.replace(/\bNOW\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");
  s = s.replace(/__P(\d+)__/g, (_, i) => stash[+i]);
  return s;
}

const tests = [
  "SELECT GREATEST(prijs, biedenvanaf) FROM Zoekertje;",
  "SELECT LEAST(a, b, c) FROM t;",
  "SELECT EXTRACT(YEAR FROM lidsinds) FROM Gebruiker;",
  "SELECT EXTRACT(MONTH FROM datum), COUNT(*) FROM Bod GROUP BY EXTRACT(MONTH FROM datum);",
  "SELECT * FROM t WHERE titel ILIKE '%STOEL%';",
  "SELECT * FROM t WHERE name = 'GREATEST in tekst';",
  "SELECT STRING_AGG(naam, ',') FROM t;",
  "-- GREATEST in commentaar\nSELECT 1;",
  "SELECT NOW();",
];
for (const q of tests) {
  console.log("IN :", q);
  console.log("OUT:", pgToSqlite(q));
  console.log("");
}
