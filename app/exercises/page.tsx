"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { byChapter, type Difficulty } from "@/lib/exercises";
import { useProgress } from "@/lib/store";
import { useMode, MODES } from "@/lib/modes";
import clsx from "clsx";

const diffLabel = { easy: "Makkelijk", medium: "Gemiddeld", hard: "Moeilijk", insane: "💀 Insane" } as const;
const diffXp: Record<Difficulty, number> = { easy: 25, medium: 25, hard: 25, insane: 25 };

export default function ExercisesIndex() {
  const mode = useMode((s) => s.mode);
  const chs = byChapter(mode);
  const solved = useProgress((s) => s.byMode[mode].solved);
  const [filter, setFilter] = useState<Set<Difficulty>>(new Set(["easy", "medium", "hard", "insane"]));
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  function toggleDiff(d: Difficulty) {
    const n = new Set(filter);
    if (n.has(d)) n.delete(d);
    else n.add(d);
    setFilter(n);
  }

  const filtered = useMemo(() => {
    const out: typeof chs = {};
    for (const [ch, list] of Object.entries(chs)) {
      const kept = list.filter((e) => {
        if (!filter.has(e.difficulty)) return false;
        if (onlyOpen && solved[e.id]) return false;
        if (search && !(e.title.toLowerCase() + " " + e.id).includes(search.toLowerCase())) return false;
        return true;
      });
      if (kept.length) out[ch] = kept;
    }
    return out;
  }, [chs, filter, onlyOpen, search, solved]);

  return (
    <div className="flex flex-col">
      <div className="title-bar justify-between">
        <span>Oefeningen — {mode === "exam" ? "Examen DB" : "Algemene SQL"}</span>
        <span className="normal-case font-normal text-fg-dim">
          {Object.values(filtered).reduce((n, l) => n + l.length, 0)} resultaten
        </span>
      </div>

      {/* Filterbalk */}
      <div className="toolbar gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op titel of ID…"
          className="input max-w-xs"
        />
        <div className="divider-v" />
        <span className="text-2xs uppercase tracking-wider text-fg-dim">Moeilijkheid:</span>
        {(["easy", "medium", "hard", "insane"] as const).map((d) => (
          <button
            key={d}
            onClick={() => toggleDiff(d)}
            title={`+${diffXp[d]} XP bij eerste correcte oplossing`}
            className={clsx(
              "diff-" + d,
              "transition-opacity",
              !filter.has(d) && "opacity-30"
            )}
          >
            {diffLabel[d]} <span className="ml-1 text-2xs opacity-70">+{diffXp[d]}</span>
          </button>
        ))}
        <div className="divider-v" />
        <label className="flex items-center gap-1.5 text-2xs text-fg-muted cursor-pointer">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          Enkel openstaande
        </label>
      </div>

      <div className="p-3 space-y-3">
        {Object.entries(filtered).map(([chapter, list]) => {
          const done = list.filter((e) => solved[e.id]).length;
          return (
            <section key={chapter} className="pane">
              <div className="pane-header">
                <span>{chapter}</span>
                <span className="text-fg-dim normal-case font-normal flex items-center gap-2">
                  <span className="font-mono">{done} / {list.length}</span>
                  <span className="w-16 h-1 bg-sunken">
                    <span className="block h-full bg-ok" style={{ width: `${(done / list.length) * 100}%` }} />
                  </span>
                </span>
              </div>
              <div className="divide-y divide-line">
                {list.map((ex) => {
                  const isDone = !!solved[ex.id];
                  return (
                    <Link
                      key={ex.id}
                      href={`/exercises/${ex.id}`}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-1.5 hover:bg-hover transition-colors group",
                        isDone && "bg-ok/5"
                      )}
                    >
                      <span className={clsx("w-4 text-center", isDone ? "text-ok" : "text-fg-faint")}>
                        {isDone ? "✓" : "○"}
                      </span>
                      <code className="font-mono text-2xs text-fg-dim w-14">{ex.id}</code>
                      <span className={`diff-dot ${ex.difficulty}`} />
                      <span className="flex-1 text-xs">{ex.title}</span>
                      <span className={`diff-${ex.difficulty}`}>{diffLabel[ex.difficulty]}</span>
                      <span
                        className={clsx("xp-chip", ex.difficulty)}
                        title={`+${diffXp[ex.difficulty]} XP bij eerste correcte oplossing`}
                      >
                        +{diffXp[ex.difficulty]} XP
                      </span>
                      <div className="hidden md:flex gap-1">
                        {ex.tags.slice(0, 2).map((t) => <span key={t} className="chip">{t}</span>)}
                      </div>
                      <span className="text-fg-dim group-hover:text-fg">→</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
        {Object.keys(filtered).length === 0 && (
          <div className="pane p-4 text-center text-fg-dim text-sm">
            Geen oefeningen voldoen aan de filters.
          </div>
        )}
      </div>
    </div>
  );
}
