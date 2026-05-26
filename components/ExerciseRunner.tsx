"use client";
import { useEffect, useState } from "react";
import SqlEditor from "@/components/SqlEditor";
import ResultTable from "@/components/ResultTable";
import { runQuery, QueryResult } from "@/lib/db";
import { gradeQuery, GradingResult } from "@/lib/grader";
import { useProgress } from "@/lib/store";
import { useMode } from "@/lib/modes";
import { useHighlight } from "@/lib/highlight";
import { track } from "@/lib/logger";
import { syncIfJoined } from "@/lib/leaderboardSync";
import SolutionModal from "@/components/SolutionModal";
import { HighlightedSql } from "@/lib/sqlHighlight";
import { formatSql } from "@/lib/sqlFormat";
import type { Exercise } from "@/lib/exercises";

const diffLabel = { easy: "Makkelijk", medium: "Gemiddeld", hard: "Moeilijk", insane: "💀 Insane" } as const;

export default function ExerciseRunner({ exercise, onSolved }: { exercise: Exercise; onSolved?: () => void }) {
  const mode = useMode((s) => s.mode);
  const record = useProgress((s) => s.recordAttempt);
  const getSavedQuery = useProgress((s) => s.getSavedQuery);
  const solvedMap = useProgress((s) => s.byMode[mode].solved);
  const setHighlight = useHighlight((s) => s.set);
  const [sql, setSql] = useState("");
  const [studentResult, setStudentResult] = useState<QueryResult | null>(null);
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Start-inhoud van de editor:
    //  1) saved query (laatste ingediende poging — correct of fout)
    //  2) anders, als oefening al opgelost was vóór dit opslaan-systeem: de modeloplossing (mooi geformatteerd)
    //  3) anders: leeg
    const saved = getSavedQuery(mode, exercise.id);
    const wasSolved = !!solvedMap[exercise.id];
    if (saved) setSql(saved);
    else if (wasSolved) setSql(formatSql(exercise.solution));
    else setSql("");
    setStudentResult(null);
    setGrading(null);
    setAttempts(0);
    setShowSolution(false);
    setHighlight(exercise.relatedTables ?? []);
    track("exercise_view", { id: exercise.id, mode, chapter: exercise.chapter, difficulty: exercise.difficulty });
    return () => setHighlight([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  async function check() {
    setBusy(true);
    const { grading, student } = await gradeQuery(mode, sql, exercise.solution, {
      orderMatters: exercise.orderMatters,
      strictColumnNames: exercise.strictColumnNames,
    });
    setStudentResult(student);
    setGrading(grading);
    setAttempts((a) => a + 1);
    record(mode, { exerciseId: exercise.id, correct: grading.correct, query: sql });
    track(grading.correct ? "exercise_completed" : "exercise_failed", {
      id: exercise.id, mode, attempt: attempts + 1,
      difficulty: exercise.difficulty, chapter: exercise.chapter,
      query: sql.slice(0, 500),
    });
    if (grading.correct) {
      onSolved?.();
      // Best-effort: synchroon naar leaderboard (alleen als gebruiker meedoet)
      setTimeout(() => syncIfJoined(), 200);
    }
    setBusy(false);
  }

  async function runOnly() {
    setBusy(true);
    setGrading(null);
    setStudentResult(await runQuery(mode, sql));
    setBusy(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Titel + meta */}
      <div className="title-bar">
        <span className="text-fg-dim mr-2">{exercise.chapter}</span>
        <span className="text-fg-dim mr-2">›</span>
        <span className="text-fg normal-case font-medium">{exercise.title}</span>
        <span className="ml-2 font-mono text-fg-dim">[{exercise.id}]</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className={`diff-${exercise.difficulty}`}>{diffLabel[exercise.difficulty]}</span>
          {exercise.tags.map((t) => <span key={t} className="chip">{t}</span>)}
        </span>
      </div>

      {/* Opgave */}
      <div className="border-b border-line bg-panel">
        <div className="px-4 py-3">
          <p className="text-fg leading-relaxed">{exercise.prompt}</p>
          {exercise.relatedTables && exercise.relatedTables.length > 0 && (
            <div className="mt-2 text-2xs text-fg-muted flex items-center gap-1.5 flex-wrap">
              <span className="text-fg-dim uppercase tracking-wider">Tabellen:</span>
              {exercise.relatedTables.map((t) => (
                <code key={t} className="font-mono text-brand">{t}</code>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor | Resultaat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0">
        {/* Editor */}
        <div className="flex flex-col border-r border-line min-h-0">
          <div className="pane-header">
            <span>Query Editor</span>
            <span className="text-fg-dim normal-case font-normal">{sql.length} tekens</span>
          </div>
          <div className="flex-1 min-h-0">
            <SqlEditor value={sql} onChange={setSql} height={"100%"} onRun={check} />
          </div>
          <div className="toolbar">
            <button className="btn-primary" onClick={check} disabled={busy}>
              <span>▶</span> Uitvoeren & Verbeteren
              <span className="kbd ml-1">⌃⏎</span>
            </button>
            <button className="btn" onClick={runOnly} disabled={busy}>▶ Test uitvoeren</button>
            <div className="divider-v" />
            <button
              className="btn-ghost text-warn"
              onClick={() => setShowSolution(true)}
              title={attempts < 3 ? `Beschikbaar na ${3 - attempts} poging(en)` : "Open modeloplossing"}
              disabled={attempts < 3}
            >
              💡 Modeloplossing {attempts < 3 ? `(${3 - attempts} pogingen te gaan)` : ""}
            </button>
            <span className="ml-auto text-2xs text-fg-dim">{busy ? "Bezig…" : "Klaar"}</span>
          </div>
        </div>

        {/* Resultaat */}
        <div className="flex flex-col min-h-0">
          {grading && (
            <div className="border-b border-line">
              <div className={grading.correct ? "feedback-ok" : "feedback-err"}>
                <div className="font-semibold flex items-center gap-2">
                  <span>{grading.correct ? "✓" : "✗"}</span>
                  <span>{grading.message}</span>
                </div>
                {grading.hints.length > 0 && (
                  <ul className="mt-1.5 list-disc list-inside text-xs opacity-90 space-y-0.5">
                    {grading.hints.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                )}
                {grading.details?.expectedRowCount !== undefined && (
                  <div className="mt-1.5 text-2xs opacity-80 font-mono">
                    verwacht {grading.details.expectedRowCount} rijen · jij kreeg {grading.details.actualRowCount}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Modal-trigger: showSolution wordt nu via SolutionModal getoond, niet inline */}
          <div className="pane-header">
            <span>Resultaat</span>
            <span className="text-fg-dim normal-case font-normal">
              {studentResult?.ok ? `${studentResult.rowCount} rijen · ${studentResult.ms}ms` : ""}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <ResultTable result={studentResult} />
          </div>
        </div>
      </div>

      <SolutionModal
        open={showSolution}
        rawSolution={exercise.solution}
        currentQuery={sql}
        onClose={() => setShowSolution(false)}
        onApply={(formatted) => setSql(formatted)}
      />
    </div>
  );
}
