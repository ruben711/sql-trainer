"use client";
import { useState } from "react";
import SqlEditor from "@/components/SqlEditor";
import ResultTable from "@/components/ResultTable";
import { runQuery, resetDatabase, QueryResult } from "@/lib/db";
import { useMode, MODES } from "@/lib/modes";

type Tab = { id: string; name: string; sql: string };

const initialFor = (mode: "exam" | "general"): string =>
  mode === "exam"
    ? "-- Voorbeeld: gebruikers uit Gent\nSELECT * FROM Gebruiker WHERE plaats = 'Gent';"
    : "-- Voorbeeld: producten goedkoper dan 50\nSELECT * FROM products WHERE price < 50;";

export default function PlaygroundPage() {
  const mode = useMode((s) => s.mode);
  const [tabs, setTabs] = useState<Tab[]>([{ id: "1", name: "query1.sql", sql: initialFor(mode) }]);
  const [activeId, setActiveId] = useState("1");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [busy, setBusy] = useState(false);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  function updateActive(sql: string) {
    setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, sql } : t)));
  }
  function newTab() {
    const id = String(Date.now());
    const n = tabs.length + 1;
    setTabs([...tabs, { id, name: `query${n}.sql`, sql: "-- nieuwe query\n" }]);
    setActiveId(id);
  }
  function closeTab(id: string) {
    const ts = tabs.filter((t) => t.id !== id);
    setTabs(ts.length ? ts : [{ id: "1", name: "query1.sql", sql: "" }]);
    if (id === activeId && ts.length) setActiveId(ts[0].id);
  }
  async function run() {
    setBusy(true);
    setResult(await runQuery(mode, active.sql));
    setBusy(false);
  }
  async function reset() {
    setBusy(true);
    await resetDatabase(mode);
    setResult({ ok: true, columns: [], rows: [], rowCount: 0, ms: 0, statements: 0 });
    setBusy(false);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="tabbar">
        {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`tab ${t.id === activeId ? "tab-active" : ""}`}
          >
            <span className="font-mono text-fg-dim text-2xs">SQL</span>
            <span>{t.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
              className="text-fg-dim hover:text-fg ml-1"
              title="Tab sluiten"
            >×</button>
          </div>
        ))}
        <button onClick={newTab} className="tab text-fg-dim hover:text-fg">+ nieuw</button>
        <div className="ml-auto flex items-center gap-1 px-2 text-2xs text-fg-dim">
          Database: <span className="font-mono text-brand">{MODES[mode].sublabel}</span>
        </div>
      </div>

      <div className="flex-1 grid grid-rows-[1fr_auto_auto_1fr] min-h-0">
        <div className="border-b border-line min-h-0">
          <SqlEditor value={active.sql} onChange={updateActive} height={"100%"} onRun={run} />
        </div>
        <div className="toolbar">
          <button className="btn-primary" onClick={run} disabled={busy}>
            ▶ Uitvoeren <span className="kbd ml-1">⌃⏎</span>
          </button>
          <button className="btn" onClick={reset} title="DB opnieuw opbouwen vanuit seed">
            ↺ Reset database
          </button>
          <div className="divider-v" />
          <span className="text-2xs text-fg-dim">
            {busy ? "Bezig…" : result?.ok ? `OK · ${result.rowCount} rijen · ${result.ms}ms` : result && !result.ok ? "Fout" : "Klaar"}
          </span>
          <span className="ml-auto text-2xs text-fg-dim">
            Per gebruiker geïsoleerd · in-browser SQLite
          </span>
        </div>
        <div className="pane-header">
          <span>Resultaat</span>
          <span className="text-fg-dim normal-case font-normal">
            {result?.ok ? `${result.rowCount} rijen` : ""}
          </span>
        </div>
        <div className="overflow-auto p-2">
          <ResultTable result={result} />
        </div>
      </div>
    </div>
  );
}
