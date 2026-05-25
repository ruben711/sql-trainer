"use client";
import { useEffect, useState } from "react";
import SqlEditor from "@/components/SqlEditor";
import ResultTable from "@/components/ResultTable";
import { runQuery, QueryResult } from "@/lib/db";
import { gradeQuery, GradingResult } from "@/lib/grader";
import { useProgress } from "@/lib/store";
import { useMode } from "@/lib/modes";
import { useHighlight } from "@/lib/highlight";
import type { Exercise } from "@/lib/exercises";

const diffLabel = { easy: "Makkelijk", medium: "Gemiddeld", hard: "Moeilijk" } as const;

export default function ExerciseRunner({ exercise, onSolved }: { exercise: Exercise; onSolved?: () => void }) {
  const mode = useMode((s) => s.mode);
  const record = useProgress((s) => s.recordAttempt);
  const setHighlight = useHighlight((s) => s.set);
  const [sql, setSql] = useState("");
  const [studentResult, setStudentResult] = useState<QueryResult | null>(null);
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSql("");
    setStudentResult(null);
    setGrading(null);
    setAttempts(0);
    setShowSolution(false);
    setRevealedHints(0);
    setHighlight(exercise.relatedTables ?? []);
    return () => setHighlight([]);
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
    if (grading.correct) onSolved?.();
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
              className="btn-ghost"
              disabled={!exercise.hints?.length || revealedHints >= (exercise.hints?.length ?? 0)}
              onClick={() => setRevealedHints((n) => n + 1)}
            >
              💡 Hint ({revealedHints}/{exercise.hints?.length ?? 0})
            </button>
            {attempts >= 3 && !showSolution && (
              <button className="btn-ghost text-warn" onClick={() => setShowSolution(true)}>
                Toon oplossing
              </button>
            )}
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
          {revealedHints > 0 && exercise.hints && (
            <div className="border-b border-line">
              <div className="feedback-warn">
                <div className="font-semibold mb-1">Hints</div>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {exercise.hints.slice(0, revealedHints).map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            </div>
          )}
          {showSolution && (
            <div className="border-b border-line">
              <div className="pane-header"><span>Modeloplossing</span></div>
              <pre className="code m-0 border-0 whitespace-pre-wrap">{exercise.solution}</pre>
            </div>
          )}
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
    </div>
  );
}
