"use client";
import { useMemo, useState } from "react";
import data from "@/data/theory.nosql.json";
import clsx from "clsx";

type MCQuestion = {
  id: string;
  section: string;
  type: "mc";
  question: string;
  choices: string[];
  answer: number;
  explanation?: string;
};
type OpenQuestion = {
  id: string;
  section: string;
  type: "open";
  question: string;
  answer: string[];
  explanation?: string;
};
type Question = MCQuestion | OpenQuestion;

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, "").replace(/\s+/g, " ");
}

type AnswerState =
  | { status: "idle" }
  | { status: "correct" }
  | { status: "wrong"; given?: string };

export default function TheoryPage() {
  const questions = data.questions as Question[];
  const [byId, setById] = useState<Record<string, AnswerState>>({});
  const [openInputs, setOpenInputs] = useState<Record<string, string>>({});
  const [showAllExplanations, setShowAllExplanations] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "wrong" | "todo">("all");

  const sections = useMemo(() => {
    const map: Record<string, Question[]> = {};
    for (const q of questions) (map[q.section] ||= []).push(q);
    return map;
  }, [questions]);

  function checkMc(q: MCQuestion, choice: number) {
    const ok = choice === q.answer;
    setById((s) => ({ ...s, [q.id]: ok ? { status: "correct" } : { status: "wrong", given: q.choices[choice] } }));
  }

  function checkOpen(q: OpenQuestion) {
    const given = (openInputs[q.id] ?? "").trim();
    if (!given) return;
    const n = normalize(given);
    const ok = q.answer.some((a) => normalize(a) === n);
    setById((s) => ({ ...s, [q.id]: ok ? { status: "correct" } : { status: "wrong", given } }));
  }

  function resetQuestion(id: string) {
    setById((s) => { const c = { ...s }; delete c[id]; return c; });
    setOpenInputs((s) => { const c = { ...s }; delete c[id]; return c; });
  }

  // Stats
  const correct = Object.values(byId).filter((s) => s.status === "correct").length;
  const wrong = Object.values(byId).filter((s) => s.status === "wrong").length;
  const todo = questions.length - correct - wrong;

  function matchesFilter(q: Question): boolean {
    const st = byId[q.id]?.status ?? "idle";
    if (filter === "all") return true;
    if (filter === "open") return q.type === "open";
    if (filter === "wrong") return st === "wrong";
    if (filter === "todo") return st === "idle";
    return true;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="title-bar -m-4 mb-0 justify-between">
        <span>Theorie · {data.title}</span>
        <span className="normal-case font-normal text-fg-dim">
          {correct}/{questions.length} juist · {wrong} fout · {todo} open
        </span>
      </div>

      {/* Intro */}
      <div className="pane">
        <div className="pane-header"><span>Info</span></div>
        <div className="p-3 text-sm text-fg-muted">
          {data.intro}
          <div className="mt-2 text-2xs text-fg-dim">
            💡 Geen XP, geen leaderboard — gewoon oefenen. Vragen zijn gebaseerd op de cursus.
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="toolbar gap-2 flex-wrap">
        <span className="text-2xs uppercase tracking-wider text-fg-dim">Filter:</span>
        {([
          ["all", `Alle (${questions.length})`],
          ["todo", `Onbeantwoord (${todo})`],
          ["wrong", `Fout (${wrong})`],
          ["open", "Open vragen"],
        ] as const).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={clsx("btn-sm", filter === k ? "btn-primary" : "btn")}
          >
            {lbl}
          </button>
        ))}
        <div className="divider-v" />
        <label className="flex items-center gap-1.5 text-2xs text-fg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showAllExplanations}
            onChange={(e) => setShowAllExplanations(e.target.checked)}
          />
          Toon alle verklaringen
        </label>
        <button
          onClick={() => { setById({}); setOpenInputs({}); }}
          className="btn-sm btn-ghost normal-case ml-auto"
        >
          ↺ Reset alles
        </button>
      </div>

      {Object.entries(sections).map(([section, qs]) => {
        const visible = qs.filter(matchesFilter);
        if (visible.length === 0) return null;
        return (
          <div key={section} className="pane">
            <div className="pane-header">
              <span>{section}</span>
              <span className="text-fg-dim normal-case font-normal">{visible.length} vragen</span>
            </div>
            <div className="divide-y divide-line">
              {visible.map((q, idx) => {
                const state = byId[q.id]?.status ?? "idle";
                return (
                  <div key={q.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <code className="font-mono text-2xs text-fg-dim shrink-0 w-10">{q.id}</code>
                      <div className="flex-1">
                        <div className="text-sm text-fg">
                          {q.question}
                          {q.type === "open" && <span className="ml-1 text-2xs text-fg-dim">(typ je antwoord)</span>}
                        </div>

                        {q.type === "mc" ? (
                          <div className="mt-2 space-y-1">
                            {q.choices.map((c, i) => {
                              const isChosen = state !== "idle" && byId[q.id]?.status === "wrong" && byId[q.id] && (byId[q.id] as any).given === c;
                              const isCorrect = state !== "idle" && i === q.answer;
                              const isWrongChoice = state === "wrong" && isChosen;
                              return (
                                <button
                                  key={i}
                                  disabled={state !== "idle"}
                                  onClick={() => checkMc(q, i)}
                                  className={clsx(
                                    "w-full text-left px-3 py-1.5 text-sm border rounded-sm transition-colors flex items-center gap-2",
                                    state === "idle" && "border-line bg-pane hover:bg-hover cursor-pointer",
                                    isCorrect && "border-ok/60 bg-ok/10 text-ok",
                                    isWrongChoice && "border-err/60 bg-err/10 text-red-300",
                                    state !== "idle" && !isCorrect && !isWrongChoice && "border-line bg-pane opacity-60"
                                  )}
                                >
                                  <span className="font-mono text-2xs text-fg-dim w-4">{String.fromCharCode(65 + i)}</span>
                                  <span className="flex-1">{c}</span>
                                  {isCorrect && <span>✓</span>}
                                  {isWrongChoice && <span>✗</span>}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={openInputs[q.id] ?? ""}
                              onChange={(e) => setOpenInputs((s) => ({ ...s, [q.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && checkOpen(q)}
                              disabled={state !== "idle"}
                              className={clsx("input max-w-xs", state === "correct" && "border-ok", state === "wrong" && "border-err")}
                              placeholder="Typ je antwoord…"
                            />
                            {state === "idle" && (
                              <button className="btn-sm btn-primary" onClick={() => checkOpen(q)}>Verbeter</button>
                            )}
                            {state === "correct" && <span className="chip-ok">✓ Juist</span>}
                            {state === "wrong" && (
                              <span className="chip-err">
                                ✗ Fout — juist: <strong className="ml-1">{q.answer[0]}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        {(state !== "idle" || showAllExplanations) && q.explanation && (
                          <div className="mt-2 text-2xs text-fg-muted bg-sunken border-l-2 border-brand/50 px-2 py-1.5">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-sm btn-ghost shrink-0 normal-case text-fg-dim"
                        onClick={() => resetQuestion(q.id)}
                        title="Reset deze vraag"
                      >↺</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
