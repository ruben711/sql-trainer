"use client";
import { useEffect, useMemo, useState } from "react";
import { runQuery } from "@/lib/db";
import { useMode } from "@/lib/modes";
import clsx from "clsx";

type Col = { name: string; type: string; notnull: number; pk: number };
type Tbl = { name: string; cols: Col[] };

export default function SchemaPanel({
  highlight = [],
  defaultOpen = true,
  compact = false,
}: {
  highlight?: string[];
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const mode = useMode((s) => s.mode);
  const [tables, setTables] = useState<Tbl[]>([]);
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const r = await runQuery(mode, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
      if (!r.ok) return;
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
      setTables(out);
      // Highlight-tabellen meteen openklappen
      if (highlight.length) {
        const map: Record<string, boolean> = {};
        highlight.forEach((h) => (map[h] = true));
        setExpanded(map);
      } else if (out.length <= 4) {
        setExpanded(Object.fromEntries(out.map((t) => [t.name, true])));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const filtered = useMemo(() => {
    if (!filter) return tables;
    const q = filter.toLowerCase();
    return tables.filter(
      (t) => t.name.toLowerCase().includes(q) || t.cols.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [tables, filter]);

  const highlightSet = new Set(highlight.map((h) => h.toLowerCase()));

  return (
    <div className={clsx("card", compact && "p-3")}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <h2 className="font-semibold flex items-center gap-2">
          📚 Schema-referentie
          <span className="chip">{tables.length} tabellen</span>
        </h2>
        <span className="text-muted group-hover:text-white text-sm">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="🔎 Filter tabel of kolom…"
            className="w-full bg-bg-soft border border-line rounded-lg px-3 py-1.5 text-sm mb-3"
          />
          {highlight.length > 0 && (
            <p className="text-xs text-muted mb-2">
              💡 Relevant voor deze oefening: <span className="text-accent-soft">{highlight.join(", ")}</span>
            </p>
          )}
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {filtered.map((t) => {
              const isHi = highlightSet.has(t.name.toLowerCase());
              const isOpen = expanded[t.name];
              return (
                <div
                  key={t.name}
                  className={clsx(
                    "rounded-lg border",
                    isHi ? "border-accent/50 bg-accent/5" : "border-line bg-bg-soft/50"
                  )}
                >
                  <button
                    onClick={() => setExpanded({ ...expanded, [t.name]: !isOpen })}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left"
                  >
                    <span className="font-mono text-sm">
                      {isHi && <span className="text-accent-soft mr-1">●</span>}
                      {t.name}
                      <span className="text-muted text-xs ml-2">({t.cols.length})</span>
                    </span>
                    <span className="text-muted text-xs">{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-2.5 pb-2 border-t border-line/60">
                      <table className="w-full text-xs mt-1">
                        <tbody>
                          {t.cols.map((c) => (
                            <tr key={c.name} className="border-b border-line/40 last:border-0">
                              <td className="py-1 font-mono text-slate-200">
                                {c.pk ? <span title="Primary key" className="text-warn mr-1">🔑</span> : null}
                                {c.name}
                              </td>
                              <td className="py-1 text-muted text-right whitespace-nowrap pl-2">
                                {c.type}
                                {c.notnull ? <span className="ml-1 text-[10px] text-slate-500">NN</span> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted">Geen tabellen gevonden.</p>}
          </div>
          <p className="text-[11px] text-muted mt-3 leading-relaxed">
            🔑 = primary key · NN = NOT NULL · klik op een tabel om kolommen te tonen
          </p>
        </>
      )}
    </div>
  );
}
