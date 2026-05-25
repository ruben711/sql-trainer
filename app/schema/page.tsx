"use client";
import { useEffect, useState } from "react";
import { runQuery } from "@/lib/db";
import { useMode, MODES } from "@/lib/modes";
import ResultTable from "@/components/ResultTable";

type Col = { name: string; type: string; notnull: number; pk: number };
type TableInfo = { name: string; ddl: string; columns: Col[] };

export default function SchemaPage() {
  const mode = useMode((s) => s.mode);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    setSelected(null);
    setPreview(null);
    (async () => {
      const r = await runQuery(mode, "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;");
      if (!r.ok) return;
      const all: TableInfo[] = [];
      for (const [name, ddl] of r.rows as [string, string][]) {
        const info = await runQuery(mode, `PRAGMA table_info("${name}");`);
        const cols: Col[] = info.ok ? info.rows.map((row) => ({ name: row[1] as string, type: row[2] as string, notnull: row[3] as number, pk: row[5] as number })) : [];
        all.push({ name, ddl, columns: cols });
      }
      setTables(all);
      if (all.length) setSelected(all[0].name);
    })();
  }, [mode]);

  useEffect(() => {
    if (!selected) return;
    (async () => setPreview(await runQuery(mode, `SELECT * FROM "${selected}" LIMIT 50;`)))();
  }, [selected, mode]);

  const cur = tables.find((t) => t.name === selected);

  return (
    <div className="h-full flex flex-col">
      <div className="title-bar">
        <span>Schema</span>
        <span className="ml-2 text-fg-dim normal-case">— {MODES[mode].label}</span>
      </div>
      <div className="flex-1 grid grid-cols-[220px_1fr] min-h-0">
        <aside className="border-r border-line overflow-y-auto bg-panel">
          <div className="title-bar"><span>Tabellen</span></div>
          {tables.map((t) => (
            <div
              key={t.name}
              onClick={() => setSelected(t.name)}
              className={`tree-item ${selected === t.name ? "active" : ""}`}
            >
              <span className="text-fg-dim">▦</span>
              <span className="font-mono">{t.name}</span>
              <span className="ml-auto text-2xs text-fg-dim">{t.columns.length}</span>
            </div>
          ))}
        </aside>
        <div className="overflow-y-auto">
          {cur && (
            <>
              <div className="title-bar">
                <span>Definitie</span>
                <span className="ml-2 font-mono normal-case text-fg">{cur.name}</span>
              </div>
              <table className="result">
                <thead><tr><th>#</th><th>Kolom</th><th>Type</th><th>NOT NULL</th><th>PK</th></tr></thead>
                <tbody>
                  {cur.columns.map((c, i) => (
                    <tr key={c.name}>
                      <td className="text-fg-dim text-right">{i + 1}</td>
                      <td className="font-mono">{c.name}</td>
                      <td className="text-brand">{c.type}</td>
                      <td>{c.notnull ? "✓" : ""}</td>
                      <td>{c.pk ? "🔑" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="title-bar"><span>DDL</span></div>
              <pre className="code m-0 border-x-0 whitespace-pre-wrap">{cur.ddl};</pre>

              <div className="title-bar"><span>Voorbeelddata</span><span className="ml-2 normal-case text-fg-dim">eerste 50 rijen</span></div>
              <div className="p-2">
                <ResultTable result={preview} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
