/**
 * PostgreSQL → SQLite compat-laag.
 * Onderschept een handvol PG-specifieke functies en herschrijft ze naar de
 * SQLite-equivalent vóór de query naar sql.js gaat.
 *
 * Strategie:
 *   1. Bescherm string-literals, identifier-quotes en comments
 *   2. Pas word-boundary regex-vervangingen toe
 *   3. Herstel beschermde stukken
 *
 * Wat wordt vertaald:
 *   GREATEST(a, b, …)              → MAX(a, b, …)               (SQLite scalar)
 *   LEAST(a, b, …)                 → MIN(a, b, …)
 *   STRING_AGG(col, sep)           → GROUP_CONCAT(col, sep)
 *   ILIKE                          → LIKE                       (SQLite LIKE is al case-insensitief voor ASCII)
 *   EXTRACT(YEAR FROM expr)        → CAST(strftime('%Y', expr) AS INTEGER)
 *   EXTRACT(MONTH/DAY/HOUR/...)    → idem met juiste format-string
 *   NOW()                          → CURRENT_TIMESTAMP          (SQLite-equivalent)
 *
 * Niet vertaald (te complex / weinig gebruikt op examen):
 *   AGE(a, b)                      → laat staan; SQLite kent dit niet
 *   TO_CHAR / TO_DATE              → laat staan
 *   INTERVAL '1 day'               → laat staan
 *   AT TIME ZONE                   → laat staan
 *   RETURNING                      → laat staan
 */

const FMT_MAP: Record<string, string> = {
  YEAR: "%Y",
  MONTH: "%m",
  DAY: "%d",
  HOUR: "%H",
  MINUTE: "%M",
  SECOND: "%S",
  DOW: "%w",  // day-of-week (0=zondag)
  DOY: "%j",  // day-of-year
};

export function pgToSqlite(sql: string): string {
  if (!sql) return sql;

  // 1. Bescherm: ' literals ', " identifiers ", -- comments, /* ... */
  const stash: string[] = [];
  const protect = (s: string, re: RegExp) =>
    s.replace(re, (m) => {
      stash.push(m);
      return `__P${stash.length - 1}__`;
    });

  let s = sql;
  s = protect(s, /'(?:[^'\\]|\\.|'')*'/g);          // 'string'
  s = protect(s, /\/\*[\s\S]*?\*\//g);              // /* block */
  s = protect(s, /--[^\n]*/g);                      // -- line
  s = protect(s, /"(?:[^"]|"")*"/g);                // "identifier"

  // 2. EXTRACT(unit FROM expr)  ← eerst doen, anders pakt de EXTRACT regex potentieel later
  //    Niet-greedy, match tot eerste closing paren. Werkt voor enkelvoudige uitdrukkingen
  //    (geen nested EXTRACT/parens binnen `expr`).
  s = s.replace(
    /\bEXTRACT\s*\(\s*(\w+)\s+FROM\s+([^)]+?)\)/gi,
    (_, unit: string, expr: string) => {
      const fmt = FMT_MAP[unit.toUpperCase()];
      if (!fmt) return _;  // onbekende unit → laat origineel staan
      return `CAST(strftime('${fmt}', ${expr.trim()}) AS INTEGER)`;
    }
  );

  // 3. Eenvoudige keyword-substituties
  s = s.replace(/\bGREATEST\b/gi, "MAX");
  s = s.replace(/\bLEAST\b/gi, "MIN");
  s = s.replace(/\bSTRING_AGG\b/gi, "GROUP_CONCAT");
  s = s.replace(/\bILIKE\b/gi, "LIKE");
  s = s.replace(/\bNOW\s*\(\s*\)/gi, "CURRENT_TIMESTAMP");

  // 4. Herstel beschermde stukken
  s = s.replace(/__P(\d+)__/g, (_, i) => stash[+i]);
  return s;
}
