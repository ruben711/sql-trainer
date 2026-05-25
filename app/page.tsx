"use client";
import Link from "next/link";
import { useMode, MODES } from "@/lib/modes";

const sections = [
  { title: "Oefeningen", desc: "Per hoofdstuk opgedeeld, auto-verbetering op basis van resultaat.", href: "/exercises", icon: "📝" },
  { title: "SQL Playground", desc: "Vrije editor met meerdere query-tabbladen.", href: "/playground", icon: "⚡" },
  { title: "Examensimulatie", desc: "Random vragen, timer, score en modeloplossingen achteraf.", href: "/exam", icon: "⏱" },
  { title: "Schema", desc: "Tabellen, kolommen, DDL en voorbeelddata.", href: "/schema", icon: "📊" },
];

export default function Home() {
  const mode = useMode((s) => s.mode);
  const cfg = MODES[mode];

  return (
    <div className="p-4 space-y-4">
      <div className="title-bar -m-4 mb-0"><span>Welkom</span></div>

      <div className="pane">
        <div className="pane-header">
          <span>Over deze werkplaats</span>
        </div>
        <div className="px-4 py-4 space-y-2">
          <h1 className="text-lg font-semibold text-fg">
            <span className="text-brand">SQL.</span>Trainer{" "}
            <span className="text-fg-dim font-normal">— Examen Voorbereiding</span>
          </h1>
          <p className="text-fg-muted max-w-3xl">
            Een IDE-stijl SQL-oefenomgeving die volledig in de browser draait via SQLite-WASM.
            Twee modi: <strong>Examen DB</strong> (Zoekertje) en <strong>Algemene SQL</strong> (Classics).
            Schakel met de switcher bovenaan.
          </p>
          <div className="flex items-center gap-2 text-2xs text-fg-dim font-mono">
            <span className="kbd">Ctrl</span>+<span className="kbd">↵</span> uitvoeren
            <span className="text-fg-faint">·</span>
            <span className="kbd">Ctrl</span>+<span className="kbd">/</span> regel commentaar
            <span className="text-fg-faint">·</span>
            <span>per gebruiker geïsoleerd</span>
          </div>
        </div>
      </div>

      {/* Mode-status banner */}
      <div
        className="pane border-l-2 px-4 py-2.5 flex items-center gap-3"
        style={{
          borderLeftColor: `rgb(var(--mode-${mode}))`,
          background: `rgb(var(--mode-${mode}) / 0.05)`,
        }}
      >
        <span className="text-2xl">{cfg.icon}</span>
        <div className="flex-1">
          <div className="text-2xs uppercase tracking-wider text-fg-dim">Actieve modus</div>
          <div className="text-sm font-semibold" style={{ color: `rgb(var(--mode-${mode}))` }}>
            {mode === "exam" ? "Examen Database Training" : "Algemene SQL Training"}
          </div>
          <div className="text-xs text-fg-muted mt-0.5">{cfg.description}</div>
        </div>
        <div className="text-2xs text-fg-dim font-mono">{cfg.exercises.length} oefeningen</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="pane hover:bg-hover transition-colors group">
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-fg">{s.title}</h3>
                <p className="text-fg-muted text-xs mt-0.5">{s.desc}</p>
              </div>
              <span className="text-fg-dim group-hover:text-fg">→</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="pane">
        <div className="pane-header"><span>Cursus dekking</span></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 px-4 py-3 text-xs text-fg-muted font-mono">
          <span>H4.1-2 · SELECT, DISTINCT, ORDER BY</span>
          <span>H4.3 · WHERE, LIKE, IN, BETWEEN</span>
          <span>H4.4 · JOIN (INNER/LEFT/RIGHT/FULL)</span>
          <span>H4.5 · Functies (string, num, datum)</span>
          <span>H4.6 · Aggregatie · GROUP BY · HAVING</span>
          <span>H4.7 · UNION / INTERSECT / EXCEPT</span>
          <span>H4.8 · CASE WHEN</span>
          <span>H4.9 · Subqueries + WITH (CTE)</span>
          <span>Reeks 8 · Views</span>
        </div>
      </div>
    </div>
  );
}
