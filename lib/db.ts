"use client";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import type { Mode } from "./modes";
import { MODES } from "./modes";
import { pgToSqlite } from "./pgCompat";

let SQL: SqlJsStatic | null = null;
const dbCache: Partial<Record<Mode, Promise<Database>>> = {};

async function loadEngine(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  // Probeer eerst lokaal (snel + offline), val terug op CDN als /public/sql-wasm.wasm ontbreekt.
  try {
    const head = await fetch("/sql-wasm.wasm", { method: "HEAD" });
    if (head.ok) {
      SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
      return SQL!;
    }
  } catch { /* val door naar CDN */ }
  SQL = await initSqlJs({
    locateFile: () => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.11.0/sql-wasm.wasm",
  });
  return SQL!;
}

// Bump deze constante telkens als je seed.*.sql wijzigt — invalidates browser cache.
const SEED_VERSION = "3";

async function buildDatabase(mode: Mode): Promise<Database> {
  const sql = await loadEngine();
  const cfg = MODES[mode];
  const res = await fetch(`${cfg.seedUrl}?v=${SEED_VERSION}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Kon ${cfg.seedUrl} niet laden`);
  const ddl = await res.text();
  const db = new sql.Database();
  db.exec(ddl);
  return db;
}

export function getDatabase(mode: Mode): Promise<Database> {
  if (!dbCache[mode]) dbCache[mode] = buildDatabase(mode);
  return dbCache[mode]!;
}

export function resetDatabase(mode: Mode): Promise<Database> {
  dbCache[mode] = buildDatabase(mode);
  return dbCache[mode]!;
}

export type QueryResult =
  | { ok: true; columns: string[]; rows: unknown[][]; rowCount: number; ms: number; statements: number }
  | { ok: false; error: string };

const QUERY_TIMEOUT_MS = 5000;

export async function runQuery(mode: Mode, sqlText: string): Promise<QueryResult> {
  try {
    const db = await getDatabase(mode);
    const t0 = performance.now();

    // Transparante PG → SQLite vertaling (GREATEST/LEAST/EXTRACT/ILIKE/...)
    const translated = pgToSqlite(sqlText);

    const results = db.exec(translated);

    const ms = Math.round(performance.now() - t0);
    if (ms > QUERY_TIMEOUT_MS) {
      // eslint-disable-next-line no-console
      console.warn(`[db] Query duurde ${ms}ms — overweeg Worker-isolatie.`);
    }

    if (results.length === 0) {
      return { ok: true, columns: [], rows: [], rowCount: 0, ms, statements: 0 };
    }
    const last = results[results.length - 1];
    return {
      ok: true,
      columns: last.columns,
      rows: last.values as unknown[][],
      rowCount: last.values.length,
      ms,
      statements: results.length,
    };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
