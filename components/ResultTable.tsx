"use client";
import { QueryResult } from "@/lib/db";

export default function ResultTable({ result }: { result: QueryResult | null }) {
  if (!result) {
    return (
      <div className="text-2xs text-fg-dim font-mono px-2 py-3">
        -- nog geen resultaat · druk <span className="kbd">⌃⏎</span> om uit te voeren
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div className="feedback-err font-mono text-2xs">
        <div className="font-semibold mb-1">SQL-fout</div>
        <div className="whitespace-pre-wrap">{result.error}</div>
      </div>
    );
  }
  if (result.columns.length === 0) {
    return <div className="text-2xs text-fg-dim font-mono">-- query uitgevoerd ({result.ms}ms) · geen rijen terug</div>;
  }
  return (
    <div className="table-wrap max-h-[60vh]">
      <table className="result">
        <thead>
          <tr>
            <th className="w-10 text-right text-fg-dim">#</th>
            {result.columns.map((c) => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r, i) => (
            <tr key={i}>
              <td className="text-right text-fg-dim">{i + 1}</td>
              {r.map((v, j) => (
                <td key={j} className={v === null ? "null" : typeof v === "number" ? "num" : "str"}>
                  {v === null ? "NULL" : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
