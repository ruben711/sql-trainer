"use client";
import { useProgress } from "@/lib/store";
import { useMode, MODES } from "@/lib/modes";
import { getExercises } from "@/lib/exercises";
import Link from "next/link";

export default function Dashboard() {
  const mode = useMode((s) => s.mode);
  const state = useProgress((s) => s.byMode[mode]);
  const level = useProgress((s) => s.level(mode));
  const badges = useProgress((s) => s.badges(mode));
  const reset = useProgress((s) => s.reset);
  const all = getExercises(mode);
  const solved = Object.keys(state.solved).length;

  // Moeilijkheidsverdeling
  const byDiff = all.reduce(
    (acc, e) => {
      acc[e.difficulty].total++;
      if (state.solved[e.id]) acc[e.difficulty].done++;
      return acc;
    },
    { easy: { done: 0, total: 0 }, medium: { done: 0, total: 0 }, hard: { done: 0, total: 0 } }
  );

  return (
    <div className="p-4 space-y-3">
      <div className="title-bar -m-4 mb-0">
        <span>Dashboard</span>
        <span className="ml-2 text-fg-dim normal-case">— {mode === "exam" ? "Examen DB" : "Algemene SQL"}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 -mx-px">
        <Stat label="XP" value={state.xp.toString()} sub={`Niveau ${level.level}`} />
        <Stat label="Reeks" value={`${state.streakDays}d`} sub={state.lastActiveDate ?? "geen activiteit"} />
        <Stat label="Opgelost" value={`${solved} / ${all.length}`} sub={`${Math.round((solved / Math.max(all.length, 1)) * 100)}%`} />
        <Stat label="Pogingen" value={state.attempts.length.toString()} sub="totaal" />
      </div>

      <div className="pane">
        <div className="pane-header">
          <span>Voortgang naar niveau {level.level + 1}</span>
          <span className="text-fg-dim normal-case font-normal">{state.xp} / {level.nextAt} XP</span>
        </div>
        <div className="p-3">
          <div className="h-1.5 bg-sunken">
            <div className="h-full bg-brand" style={{ width: `${Math.min(100, level.progress * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="pane">
        <div className="pane-header"><span>Voortgang per moeilijkheid</span></div>
        <div className="p-3 space-y-2">
          {(["easy", "medium", "hard"] as const).map((d) => {
            const { done, total } = byDiff[d];
            const pct = total > 0 ? (done / total) * 100 : 0;
            const label = d === "easy" ? "Makkelijk" : d === "medium" ? "Gemiddeld" : "Moeilijk";
            return (
              <div key={d} className="flex items-center gap-3">
                <span className={`diff-${d} w-24 justify-center`}>{label}</span>
                <div className="flex-1 h-1.5 bg-sunken relative">
                  <div className="h-full" style={{ width: `${pct}%`, background: `rgb(var(--diff-${d}))` }} />
                </div>
                <span className="text-2xs font-mono text-fg-muted w-16 text-right">{done} / {total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {badges.length > 0 && (
        <div className="pane">
          <div className="pane-header"><span>Badges</span></div>
          <div className="p-3 flex flex-wrap gap-1.5">
            {badges.map((b) => <span key={b} className="chip text-fg">{b}</span>)}
          </div>
        </div>
      )}

      <div className="pane">
        <div className="pane-header">
          <span>Recente pogingen</span>
          <Link href="/exercises" className="link normal-case font-normal">→ Alle oefeningen</Link>
        </div>
        {state.attempts.length === 0 ? (
          <p className="px-3 py-3 text-xs text-fg-dim">
            Nog geen pogingen. <Link className="link" href="/exercises">Start je eerste oefening</Link>.
          </p>
        ) : (
          <table className="result">
            <thead>
              <tr><th className="w-8"></th><th>Oefening</th><th>Wanneer</th></tr>
            </thead>
            <tbody>
              {state.attempts.slice(0, 12).map((a, i) => (
                <tr key={i}>
                  <td className={a.correct ? "text-ok" : "text-err"}>{a.correct ? "✓" : "✗"}</td>
                  <td><Link href={`/exercises/${a.exerciseId}`} className="link">{a.exerciseId}</Link></td>
                  <td className="text-fg-dim">{new Date(a.ts).toLocaleString("nl-BE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pane" style={{ borderColor: "rgb(var(--err) / 0.4)" }}>
        <div className="pane-header"><span className="text-err">Gevarenzone</span></div>
        <div className="p-3 flex items-center gap-3">
          <p className="text-2xs text-fg-dim flex-1">
            Reset alle voortgang voor de modus <strong>{MODES[mode].label}</strong>. De andere modus blijft onaangetast.
          </p>
          <button
            className="btn"
            style={{ borderColor: "rgb(var(--err) / 0.4)", color: "rgb(var(--err))" }}
            onClick={() => confirm("Zeker dat je alle voortgang wil resetten?") && reset(mode)}
          >
            Reset voortgang
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="pane -m-px">
      <div className="px-3 py-2">
        <div className="text-2xs uppercase tracking-wider text-fg-dim">{label}</div>
        <div className="text-xl font-mono font-semibold mt-0.5 text-fg">{value}</div>
        {sub && <div className="text-2xs text-fg-dim mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
