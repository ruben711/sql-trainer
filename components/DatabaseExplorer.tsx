"use client";
import { useEffect, useMemo, useState } from "react";
import { runQuery } from "@/lib/db";
import { useMode, MODES } from "@/lib/modes";
import { useHighlight } from "@/lib/highlight";
import clsx from "clsx";

type Col = { name: string; type: string; notnull: number; pk: number };
type Tbl = { name: string; cols: Col[] };

export default function DatabaseExplorer() {
  const mode = useMode((s) => s.mode);
  const highlight = useHighlight((s) => s.tables);
  const [tables, setTables] = useState<Tbl[]>([]);
  const [filter, setFilter] = useState("");
  const [openTbl, setOpenTbl] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setTables([]);
      const r = await runQuery(mode, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
      if (cancelled) return;
      if (!r.ok) { setError(r.error); return; }
      const out: Tbl[] = [];
      for (const [name] of r.rows as [string][]) {
        const info = await runQuery(mode, `PRAGMA table_info("${name}");`);
        const cols: Col[] = info.ok
          ? info.rows.map((row) => ({
              name: row[1] as string, type: row[2] as string,
              notnull: row[3] as number, pk: row[5] as number,
            }))
          : [];
        out.push({ name, cols });
      }
      if (!cancelled) {
        setTables(out);
        if (highlight.length) {
          setOpenTbl(Object.fromEntries(highlight.map((h) => [h, true])));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    if (highlight.length) {
      setOpenTbl((cur) => ({ ...cur, ...Object.fromEntries(highlight.map((h) => [h, true])) }));
    }
  }, [highlight.join(",")]);

  const filtered = useMemo(() => {
    if (!filter) return tables;
    const q = filter.toLowerCase();
    return tables.filter((t) => t.name.toLowerCase().includes(q) || t.cols.some((c) => c.name.toLowerCase().includes(q)));
  }, [tables, filter]);

  const highlightSet = new Set(highlight.map((h) => h.toLowerCase()));
  const cfg = MODES[mode];

  return (
    <div className="h-full flex flex-col bg-panel border-r border-line">
      {/* Mode-label header */}
      <div
        className="px-3 h-9 border-b border-line flex items-center gap-2"
        style={{
          background: `rgb(var(--mode-${mode}) / 0.10)`,
          borderBottomColor: `rgb(var(--mode-${mode}) / 0.35)`,
        }}
      >
        <span className="text-base">{cfg.icon}</span>
        <div className="leading-tight">
          <div className="text-2xs uppercase tracking-wider text-fg-dim">Actieve database</div>
          <div className="text-xs font-semibold" style={{ color: `rgb(var(--mode-${mode}))` }}>
            {cfg.sublabel}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="px-2 py-1.5 border-b border-line">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Zoek tabel of kolom…"
          className="input"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="px-3 py-2 text-2xs feedback-err">
            DB-fout: {error}
          </div>
        )}
        <div className="py-1">
          <div className="px-2 py-1 text-2xs uppercase tracking-wider text-fg-dim flex items-center gap-1.5">
            <span className="opacity-60">▾</span> Tabellen ({tables.length})
          </div>
          {filtered.map((t) => {
            const isHi = highlightSet.has(t.name.toLowerCase());
            const isOpen = !!openTbl[t.name];
            return (
              <div key={t.name}>
                <div
                  onClick={() => setOpenTbl({ ...openTbl, [t.name]: !isOpen })}
                  className={clsx("tree-item", isHi && "active")}
                >
                  <span className="icon">{isOpen ? "▾" : "▸"}</span>
                  <span className="text-fg-dim">▦</span>
                  <span className={clsx("font-mono", isHi && "font-semibold")}>{t.name}</span>
                  <span className="ml-auto text-fg-dim text-2xs">{t.cols.length}</span>
                </div>
                {isOpen && (
                  <div>
                    {t.cols.map((c) => (
                      <div key={c.name} className="tree-col" title={`${c.type}${c.notnull ? " NOT NULL" : ""}${c.pk ? " PK" : ""}`}>
                        <span className="text-fg-dim w-3 inline-block text-center">
                          {c.pk
                            ? <span className="text-warn">🔑</span>
                            : c.notnull
                              ? <span className="text-fg-faint">●</span>
                              : <span className="text-fg-faint">○</span>}
                        </span>
                        <span>{c.name}</span>
                        <span className="col-type">{c.type.toLowerCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {tables.length === 0 && !error && (
            <div className="px-3 py-2 text-2xs text-fg-dim">Schema laden…</div>
          )}
        </div>
      </div>

      <div className="px-2 py-1.5 border-t border-line text-2xs text-fg-dim">
        🔑 primary key · ● not null · ○ nullable
      </div>
    </div>
  );
}
