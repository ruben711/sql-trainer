"use client";
import { useMemo, useState } from "react";
import test1Data from "@/data/theory.nosql.json";
import test2Data from "@/data/theory.nosql.test2.json";
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

type TestData = {
  title: string;
  intro: string;
  questions: Question[];
};

const TESTS: { id: "v1" | "v2"; label: string; data: TestData }[] = [
  { id: "v1", label: "Test 1", data: test1Data as TestData },
  { id: "v2", label: "Test 2", data: test2Data as TestData },
];

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, "").replace(/\s+/g, " ");
}

type AnswerState =
  | { status: "idle" }
  | { status: "correct" }
  | { status: "wrong"; given?: string };

export default function TheoryPage() {
  const [activeTest, setActiveTest] = useState<"v1" | "v2">("v1");
  // Aparte answer-state per test
  const [byTest, setByTest] = useState<Record<string, Record<string, AnswerState>>>({ v1: {}, v2: {} });
  const [inputsByTest, setInputsByTest] = useState<Record<string, Record<string, string>>>({ v1: {}, v2: {} });
  const [showAllExplanations, setShowAllExplanations] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "wrong" | "todo">("all");

  // Test 1 status om Test 2 te ontgrendelen
  const test1Done = useMemo(() => {
    const t1 = TESTS[0].data;
    const answers = byTest.v1 || {};
    return t1.questions.every((q) => {
      const st = answers[q.id]?.status;
      return st === "correct" || st === "wrong";
    });
  }, [byTest]);

  // Veilig: als gebruiker op v2 zit maar nog niet ontgrendeld → terug naar v1
  const effectiveTest = activeTest === "v2" && !test1Done ? "v1" : activeTest;
  const test = TESTS.find((t) => t.id === effectiveTest)!;
  const byId = byTest[effectiveTest] || {};
  const openInputs = inputsByTest[effectiveTest] || {};

  const sections = useMemo(() => {
    const map: Record<string, Question[]> = {};
    for (const q of test.data.questions) (map[q.section] ||= []).push(q);
    return map;
  }, [test]);

  function setAnswer(tid: string, qid: string, state: AnswerState) {
    setByTest((s) => ({ ...s, [tid]: { ...(s[tid] || {}), [qid]: state } }));
  }
  function setInput(tid: string, qid: string, v: string) {
    setInputsByTest((s) => ({ ...s, [tid]: { ...(s[tid] || {}), [qid]: v } }));
  }

  function checkMc(q: MCQuestion, choice: number) {
    const ok = choice === q.answer;
    setAnswer(effectiveTest, q.id, ok ? { status: "correct" } : { status: "wrong", given: q.choices[choice] });
  }
  function checkOpen(q: OpenQuestion) {
    const given = (openInputs[q.id] ?? "").trim();
    if (!given) return;
    const n = normalize(given);
    const ok = q.answer.some((a) => normalize(a) === n);
    setAnswer(effectiveTest, q.id, ok ? { status: "correct" } : { status: "wrong", given });
  }
  function resetQuestion(id: string) {
    setByTest((s) => {
      const t = { ...(s[effectiveTest] || {}) };
      delete t[id];
      return { ...s, [effectiveTest]: t };
    });
    setInputsByTest((s) => {
      const t = { ...(s[effectiveTest] || {}) };
      delete t[id];
      return { ...s, [effectiveTest]: t };
    });
  }
  function resetCurrent() {
    setByTest((s) => ({ ...s, [effectiveTest]: {} }));
    setInputsByTest((s) => ({ ...s, [effectiveTest]: {} }));
  }

  const total = test.data.questions.length;
  const correct = Object.values(byId).filter((s) => s.status === "correct").length;
  const wrong = Object.values(byId).filter((s) => s.status === "wrong").length;
  const todo = total - correct - wrong;

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
        <span>Theorie · {test.data.title}</span>
        <span className="normal-case font-normal text-fg-dim">
          {correct}/{total} juist · {wrong} fout · {todo} open
        </span>
      </div>

      {/* Test-switcher */}
      <div className="tabbar">
        {TESTS.map((t) => {
          const locked = t.id === "v2" && !test1Done;
          const active = effectiveTest === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (locked) return;
                setActiveTest(t.id);
              }}
              disabled={locked}
              className={clsx("tab", active && "tab-active", locked && "opacity-50 cursor-not-allowed")}
              title={locked ? "Voltooi eerst alle vragen van Test 1" : undefined}
            >
              {locked ? "🔒 " : ""}{t.label}
              {t.id === "v2" && !test1Done && <span className="ml-2 text-2xs text-fg-dim">(lock — Test 1 eerst)</span>}
              {t.id === "v1" && test1Done && <span className="ml-2 text-2xs text-ok">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Intro */}
      <div className="pane">
        <div className="pane-header"><span>Info</span></div>
        <div className="p-3 text-sm text-fg-muted">
          {test.data.intro}
          <div className="mt-2 text-2xs text-fg-dim">
            💡 Geen XP, geen leaderboard — gewoon oefenen.
            {!test1Done && effectiveTest === "v1" && (
              <span className="ml-1 text-warn">Beantwoord alle vragen om Test 2 vrij te spelen.</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="toolbar gap-2 flex-wrap">
        <span className="text-2xs uppercase tracking-wider text-fg-dim">Filter:</span>
        {([
          ["all", `Alle (${total})`],
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
        <button onClick={resetCurrent} className="btn-sm btn-ghost normal-case ml-auto">
          ↺ Reset deze test
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
              {visible.map((q) => {
                const state = byId[q.id]?.status ?? "idle";
                return (
                  <div key={q.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <code className="font-mono text-2xs text-fg-dim shrink-0 w-12">{q.id}</code>
                      <div className="flex-1">
                        <div className="text-sm text-fg">
                          {q.question}
                          {q.type === "open" && <span className="ml-1 text-2xs text-fg-dim">(typ je antwoord)</span>}
                        </div>

                        {q.type === "mc" ? (
                          <div className="mt-2 space-y-1">
                            {q.choices.map((c, i) => {
                              const givenChoice = byId[q.id]?.status === "wrong" ? (byId[q.id] as any).given : null;
                              const isChosen = givenChoice === c;
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
                              onChange={(e) => setInput(effectiveTest, q.id, e.target.value)}
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

      {/* Footer melding bij voltooien test 1 */}
      {effectiveTest === "v1" && test1Done && (
        <div className="pane border-l-2 border-l-ok">
          <div className="p-3 text-sm">
            <strong className="text-ok">🎉 Test 1 voltooid!</strong> Test 2 is nu ontgrendeld — klik bovenaan op het tweede tabblad voor andere vragen op dezelfde stof.
          </div>
        </div>
      )}
    </div>
  );
}
