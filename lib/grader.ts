import { runQuery, resetDatabase, QueryResult } from "./db";
import type { Mode } from "./modes";

/** Detecteert of de query state in de DB verandert (DDL of DML).
 *  Voor zulke queries moeten we de DB resetten tussen student & model runs. */
function hasSideEffects(sql: string): boolean {
  return /\b(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|REPLACE|TRUNCATE)\b/i.test(sql);
}

export type GradingResult = {
  correct: boolean;
  reason: "match" | "wrong-rows" | "wrong-columns" | "error" | "empty";
  message: string;
  hints: string[];
  details?: {
    expectedColumns?: string[];
    actualColumns?: string[];
    expectedRowCount?: number;
    actualRowCount?: number;
    missingRows?: unknown[][];
    extraRows?: unknown[][];
  };
};

export function compareResults(
  student: QueryResult,
  expected: QueryResult,
  opts: { orderMatters?: boolean; strictColumnNames?: boolean } = {}
): GradingResult {
  if (!expected.ok) {
    return { correct: false, reason: "error", message: "Modeloplossing geeft een fout (interne config-fout).", hints: [] };
  }
  if (!student.ok) {
    return { correct: false, reason: "error", message: `SQL-fout: ${student.error}`, hints: hintFromError(student.error) };
  }
  // Kolomnamen worden default NIET streng vergeleken; alleen wanneer de oefening
  // expliciet om een alias vraagt (strictColumnNames: true) wordt dit afgedwongen.
  if (opts.strictColumnNames) {
    const a = student.columns.map(norm);
    const b = expected.columns.map(norm);
    if (a.join("|") !== b.join("|")) {
      return {
        correct: false, reason: "wrong-columns",
        message: `Verwachte kolomnamen: ${expected.columns.join(", ")}.`,
        hints: ["Deze oefening vraagt een specifieke alias — gebruik `AS naam`."],
        details: { expectedColumns: expected.columns, actualColumns: student.columns },
      };
    }
  }
  if (student.columns.length !== expected.columns.length) {
    return {
      correct: false, reason: "wrong-columns",
      message: `Je query geeft ${student.columns.length} kolommen, verwacht: ${expected.columns.length}.`,
      hints: ["Controleer welke kolommen de opgave vraagt.", "Te veel? Gebruik specifieke kolommen i.p.v. `SELECT *`."],
      details: { expectedColumns: expected.columns, actualColumns: student.columns },
    };
  }
  const a = student.rows.map(rowKey);
  const b = expected.rows.map(rowKey);

  if (opts.orderMatters) {
    if (a.length !== b.length || a.some((r, i) => r !== b[i])) {
      return {
        correct: false, reason: "wrong-rows",
        message: `De rijen of hun volgorde komen niet overeen (verwacht ${b.length}, kreeg ${a.length}).`,
        hints: ["De volgorde is hier belangrijk — gebruik `ORDER BY` exact zoals gevraagd.", "Controleer `ASC`/`DESC`."],
        details: { expectedRowCount: b.length, actualRowCount: a.length },
      };
    }
  } else {
    const aS = [...a].sort();
    const bS = [...b].sort();
    if (aS.length !== bS.length || aS.some((r, i) => r !== bS[i])) {
      const missing = bS.filter((r) => !aS.includes(r)).slice(0, 5);
      const extra = aS.filter((r) => !bS.includes(r)).slice(0, 5);
      return {
        correct: false,
        reason: a.length === 0 ? "empty" : "wrong-rows",
        message: a.length === 0
          ? "Je query geeft 0 rijen terug, maar er werden rijen verwacht."
          : `Resultaat klopt niet (verwacht ${b.length} rijen, kreeg ${a.length}).`,
        hints: hintsForRows(student, expected),
        details: {
          expectedRowCount: b.length, actualRowCount: a.length,
          missingRows: missing.map((s) => JSON.parse(s)), extraRows: extra.map((s) => JSON.parse(s)),
        },
      };
    }
  }
  return { correct: true, reason: "match", message: "Correct! 🎉", hints: [] };
}

function rowKey(row: unknown[]): string {
  return JSON.stringify(row.map((v) => {
    if (v === null) return null;
    if (typeof v === "number") return v;
    const s = String(v);
    // Numerieke strings (bv. '2024' vs 2024) gelijk behandelen — anders mismatcht
    // SUBSTR(...) vs CAST(strftime(...) AS INTEGER) bij dezelfde semantische output.
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return s;
  }));
}
function norm(s: string) { return s.trim().toLowerCase().replace(/["`]/g, ""); }

function hintsForRows(student: QueryResult, expected: QueryResult): string[] {
  if (!student.ok || !expected.ok) return [];
  if (student.rowCount > expected.rowCount) return ["Te veel rijen — mis je een filter in `WHERE`?", "Vergat je `DISTINCT` of een te brede JOIN-conditie?"];
  if (student.rowCount < expected.rowCount) return ["Te weinig rijen — `WHERE` te strikt?", "Bij joins: `INNER` waar `LEFT JOIN` nodig is?"];
  return ["Aantal rijen klopt, maar inhoud niet — controleer kolommen + expressies."];
}

function hintFromError(err: string): string[] {
  const e = err.toLowerCase();
  if (e.includes("already exists")) return [
    "Een tabel of view met die naam bestaat al — gebruik `DROP VIEW IF EXISTS naam;` ervóór, of klik ↺ Reset database in de Playground.",
  ];
  if (e.includes("no such column")) return ["Tikfout in een kolomnaam? Of een tabel die je vergat te joinen?"];
  if (e.includes("no such table")) return ["Tabel of view niet gevonden — let op hoofdletters."];
  if (e.includes("syntax error")) return ["Syntaxfout — let op puntkomma's, haakjes en SQL-keywords."];
  if (e.includes("ambiguous")) return ["Kolomnaam komt in meerdere tabellen voor — qualificeer met `tabel.kolom`."];
  if (e.includes("group by")) return ["Bij `GROUP BY`: alle niet-aggregaten moeten in de GROUP BY staan."];
  return [];
}

export async function gradeQuery(
  mode: Mode,
  studentSql: string,
  expectedSql: string,
  opts: { orderMatters?: boolean; strictColumnNames?: boolean } = {}
): Promise<{ grading: GradingResult; student: QueryResult; expected: QueryResult }> {
  const needsIsolation = hasSideEffects(studentSql) || hasSideEffects(expectedSql);

  let student: QueryResult;
  let expected: QueryResult;

  if (needsIsolation) {
    // DDL/DML in spel — sequentieel uitvoeren met DB-reset ertussen,
    // zodat student en model elkaar niet beïnvloeden.
    await resetDatabase(mode);
    student = await runQuery(mode, studentSql);

    await resetDatabase(mode);
    expected = await runQuery(mode, expectedSql);

    // Achteraf opruimen zodat volgende oefening / playground proper start
    await resetDatabase(mode);
  } else {
    // Pure SELECT — parallel mag, idempotent
    [student, expected] = await Promise.all([
      runQuery(mode, studentSql),
      runQuery(mode, expectedSql),
    ]);
  }

  const grading = compareResults(student, expected, opts);
  return { grading, student, expected };
}
