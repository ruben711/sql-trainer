"use client";
import { useEffect, useMemo, useState } from "react";
import { randomSample, type Exercise } from "@/lib/exercises";
import { gradeQuery } from "@/lib/grader";
import SqlEditor from "@/components/SqlEditor";
import ResultTable from "@/components/ResultTable";
import { runQuery, QueryResult } from "@/lib/db";
import { useMode, MODES } from "@/lib/modes";
import { useHighlight } from "@/lib/highlight";
import { track } from "@/lib/logger";
import { syncIfJoined } from "@/lib/leaderboardSync";
import { HighlightedSql } from "@/lib/sqlHighlight";
import { formatSql } from "@/lib/sqlFormat";
import Link from "next/link";

const DEFAULT_MINUTES = 30;
const DEFAULT_N = 8;

const diffLabel = { easy: "Makkelijk", medium: "Gemiddeld", hard: "Moeilijk", insane: "💀 Insane" } as const;

type Answer = { exerciseId: string; sql: string; correct: boolean };

export default function ExamPage() {
  const mode = useMode((s) => s.mode);
  const setHighlight = useHighlight((s) => s.set);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questions, setQuestions] = useState<Exercise[]>([]);
  const [idx, setIdx] = useState(0);
  const [sql, setSql] = useState("");
  const [preview, setPreview] = useState<QueryResult | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [n, setN] = useState(DEFAULT_N);

  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [started, finished]);

  useEffect(() => {
    if (deadline && Date.now() >= deadline) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  useEffect(() => {
    const cur = questions[idx];
    setHighlight(cur?.relatedTables ?? []);
    return () => setHighlight([]);
  }, [idx, questions]);

  const cur = questions[idx];
  const remaining = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : 0;
  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  function start() {
    const qs = randomSample(mode, n);
    setQuestions(qs);
    setAnswers([]);
    setIdx(0);
    setSql("");
    setPreview(null);
    setStarted(true);
    setFinished(false);
    setDeadline(Date.now() + minutes * 60_000);
    track("exam_started", { mode, questions: qs.length, minutes });
  }
  async function runPreview() { setPreview(await runQuery(mode, sql)); }
  async function submitAnswer() {
    if (!cur) return;
    const { grading } = await gradeQuery(mode, sql, cur.solution, {
      orderMatters: cur.orderMatters, strictColumnNames: cur.strictColumnNames,
    });
    setAnswers((p) => [...p, { exerciseId: cur.id, sql, correct: grading.correct }]);
    if (idx + 1 >= questions.length) finish();
    else { setIdx(idx + 1); setSql(""); setPreview(null); }
  }
  function finish() {
    setFinished(true);
    setStarted(false);
    const correct = answers.filter((a) => a.correct).length;
    track("exam_completed", {
      mode, total: questions.length, correct, percent: Math.round((correct / Math.max(questions.length, 1)) * 100),
    });
    syncIfJoined();
  }
  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers]);

  // ─── Pre-exam config ───────────────────────────────────────────────
  if (!started && !finished) {
    return (
      <div className="p-4 space-y-3">
        <div className="title-bar -m-4 mb-0"><span>Examensimulatie</span></div>
        <div className="pane">
          <div className="pane-header"><span>Instellingen</span></div>
          <div className="p-4 grid sm:grid-cols-2 gap-3 max-w-xl">
            <label className="block">
              <span className="text-2xs uppercase tracking-wider text-fg-dim">Aantal vragen</span>
              <input type="number" min={3} max={20} value={n} onChange={(e) => setN(+e.target.value)} className="input mt-1" />
            </label>
            <label className="block">
              <span className="text-2xs uppercase tracking-wider text-fg-dim">Tijdslimiet (minuten)</span>
              <input type="number" min={5} max={120} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="input mt-1" />
            </label>
            <div className="sm:col-span-2">
              <button className="btn-primary" onClick={start}>▶ Start examen</button>
            </div>
          </div>
        </div>
        <div className="pane">
          <div className="pane-header"><span>Spelregels</span></div>
          <ul className="p-4 text-xs text-fg-muted list-disc list-inside space-y-1">
            <li>Random selectie uit <strong>{MODES[mode].label}</strong>.</li>
            <li>Schema-explorer links blijft beschikbaar — geen valsspelen, gewoon referentie.</li>
            <li>Geen hints, geen modeloplossing tijdens het examen.</li>
            <li>Modeloplossingen + overzicht per vraag na afloop.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ─── Resultaat ────────────────────────────────────────────────────
  if (finished) {
    const pct = Math.round((score / Math.max(questions.length, 1)) * 100);
    return (
      <div className="p-4 space-y-3">
        <div className="title-bar -m-4 mb-0"><span>Examenresultaat</span></div>
        <div className="pane">
          <div className="pane-header"><span>Eindscore</span></div>
          <div className="p-4 flex items-baseline gap-4">
            <div className="text-4xl font-mono font-bold text-fg">
              {score} <span className="text-xl text-fg-dim">/ {questions.length}</span>
            </div>
            <div className={pct >= 60 ? "chip-ok" : "chip-err"}>{pct}%</div>
          </div>
        </div>
        <div className="pane">
          <div className="pane-header"><span>Per vraag</span></div>
          <table className="result">
            <thead><tr><th className="w-8"></th><th>ID</th><th>Titel</th><th>Moeilijkheid</th><th>Modeloplossing</th></tr></thead>
            <tbody>
              {questions.map((q, i) => {
                const a = answers[i];
                return (
                  <tr key={q.id}>
                    <td className={a?.correct ? "text-ok" : "text-err"}>{a?.correct ? "✓" : "✗"}</td>
                    <td className="font-mono">{q.id}</td>
                    <td className="str">{q.title}</td>
                    <td><span className={`diff-${q.difficulty}`}>{diffLabel[q.difficulty]}</span></td>
                    <td className="text-2xs"><HighlightedSql sql={formatSql(q.solution)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => { setFinished(false); setStarted(false); }}>↺ Nieuw examen</button>
          <Link href="/dashboard" className="btn">Naar dashboard</Link>
        </div>
      </div>
    );
  }

  // ─── In progress ───────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <div className="title-bar justify-between">
        <span>Examen bezig · vraag {idx + 1} van {questions.length}</span>
        <span className="flex items-center gap-3">
          <span className={remaining < 60 ? "text-err font-mono text-base" : "text-fg font-mono text-base"}>
            {mm}:{ss}
          </span>
          <button className="btn-sm btn" onClick={finish}>Examen stoppen</button>
        </span>
      </div>

      <div className="border-b border-line bg-panel">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xs uppercase tracking-wider text-fg-dim">{cur?.chapter}</span>
            {cur && <span className={`diff-${cur.difficulty}`}>{diffLabel[cur.difficulty]}</span>}
          </div>
          <p className="text-fg leading-relaxed">{cur?.prompt}</p>
          {cur?.relatedTables && cur.relatedTables.length > 0 && (
            <div className="mt-2 text-2xs text-fg-muted flex items-center gap-1.5 flex-wrap">
              <span className="text-fg-dim uppercase tracking-wider">Tabellen:</span>
              {cur.relatedTables.map((t) => <code key={t} className="font-mono text-brand">{t}</code>)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0">
        <div className="flex flex-col border-r border-line min-h-0">
          <div className="pane-header"><span>Query Editor</span></div>
          <div className="flex-1 min-h-0">
            <SqlEditor value={sql} onChange={setSql} height={"100%"} onRun={runPreview} />
          </div>
          <div className="toolbar">
            <button className="btn" onClick={runPreview}>▶ Test uitvoeren</button>
            <button className="btn-primary ml-auto" onClick={submitAnswer}>
              Antwoord indienen & volgende →
            </button>
          </div>
        </div>
        <div className="flex flex-col min-h-0">
          <div className="pane-header"><span>Voorbeeld resultaat</span></div>
          <div className="flex-1 overflow-auto p-2">
            <ResultTable result={preview} />
          </div>
        </div>
      </div>
    </div>
  );
}
