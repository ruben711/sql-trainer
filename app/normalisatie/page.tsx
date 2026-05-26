"use client";
import { useMemo, useState } from "react";
import data from "@/data/normalisatie.json";
import clsx from "clsx";

type Step = {
  id: string;
  title: string;
  prompt: string;
  model: string;
};

type Exercise = {
  id: string;
  title: string;
  context: string;
  remarks?: string[];
  sampleData?: [string, string][];
  sampleTable?: { headers: string[]; rows: string[][] };
  steps: Step[];
};

const exercises = (data.exercises as Exercise[]);

export default function NormalisatiePage() {
  const [activeId, setActiveId] = useState(exercises[0]?.id);
  const ex = exercises.find((e) => e.id === activeId)!;
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  // State per oefening — reset bij wisselen
  const stateKey = (sid: string) => `${ex.id}::${sid}`;

  const completed = ex.steps.filter((s) => done[stateKey(s.id)]).length;

  function setInput(sid: string, v: string) {
    setInputs((s) => ({ ...s, [stateKey(sid)]: v }));
  }
  function reveal(sid: string) {
    setRevealed((s) => ({ ...s, [stateKey(sid)]: true }));
  }
  function toggleDone(sid: string) {
    setDone((s) => ({ ...s, [stateKey(sid)]: !s[stateKey(sid)] }));
  }
  function resetAll() {
    const prefix = ex.id + "::";
    const filter = <T,>(obj: Record<string, T>) =>
      Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith(prefix)));
    setInputs((s) => filter(s));
    setRevealed((s) => filter(s));
    setDone((s) => filter(s));
  }

  return (
    <div className="p-4 space-y-3">
      <div className="title-bar -m-4 mb-0 justify-between">
        <span>Normalisatie · 0NF → 3NF</span>
        <span className="normal-case font-normal text-fg-dim">
          {completed}/{ex.steps.length} stappen gedaan
        </span>
      </div>

      {/* Oefening-switcher */}
      <div className="tabbar">
        {exercises.map((e) => (
          <button
            key={e.id}
            onClick={() => setActiveId(e.id)}
            className={clsx("tab", activeId === e.id && "tab-active")}
          >
            {e.title}
          </button>
        ))}
      </div>

      {/* Opgave-context */}
      <div className="pane">
        <div className="pane-header"><span>Opgave — {ex.title}</span></div>
        <div className="p-4 space-y-3 text-sm">
          <p className="text-fg">{ex.context}</p>
          {ex.remarks && ex.remarks.length > 0 && (
            <div>
              <div className="text-2xs uppercase tracking-wider text-fg-dim mb-1">Opmerkingen vooraf</div>
              <ul className="list-disc list-inside text-fg-muted space-y-0.5">
                {ex.remarks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {ex.sampleData && ex.sampleData.length > 0 && (
            <div>
              <div className="text-2xs uppercase tracking-wider text-fg-dim mb-1">Voorbeeld (lezer)</div>
              <table className="result">
                <tbody>
                  {ex.sampleData.map(([k, v], i) => (
                    <tr key={i}>
                      <td className="font-mono text-fg-dim w-32">{k}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ex.sampleTable && (
            <div>
              <div className="text-2xs uppercase tracking-wider text-fg-dim mb-1">Voorbeelddata</div>
              <div className="overflow-x-auto">
                <table className="result">
                  <thead>
                    <tr>{ex.sampleTable.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {ex.sampleTable.rows.map((row, i) => (
                      <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stappen */}
      <div className="pane">
        <div className="pane-header">
          <span>Stappen</span>
          <button onClick={resetAll} className="normal-case font-normal text-fg-muted hover:text-fg">↺ Reset oefening</button>
        </div>
        <div className="divide-y divide-line">
          {ex.steps.map((s, i) => {
            const k = stateKey(s.id);
            const isRevealed = !!revealed[k];
            const isDone = !!done[k];
            return (
              <div key={s.id} className="p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <span className={clsx(
                    "w-6 h-6 rounded-full inline-flex items-center justify-center text-2xs font-mono shrink-0",
                    isDone ? "bg-ok/20 text-ok border border-ok/40" : "bg-pane text-fg-dim border border-line"
                  )}>
                    {isDone ? "✓" : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{s.title}</div>
                    <div className="text-xs text-fg-muted mt-0.5">{s.prompt}</div>

                    <textarea
                      value={inputs[k] ?? ""}
                      onChange={(e) => setInput(s.id, e.target.value)}
                      placeholder="Typ hier je antwoord — geen automatische correctie, klik later 'Toon oplossing' om te vergelijken…"
                      rows={3}
                      className="w-full mt-2 bg-sunken text-fg p-2 text-xs font-mono resize-y focus:outline-none focus:border-brand border border-line rounded-sm"
                    />

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {!isRevealed ? (
                        <button className="btn-sm btn-primary" onClick={() => reveal(s.id)}>
                          💡 Toon oplossing
                        </button>
                      ) : (
                        <button
                          className={clsx("btn-sm", isDone ? "btn" : "btn-primary")}
                          onClick={() => toggleDone(s.id)}
                        >
                          {isDone ? "↺ Markeer onafgewerkt" : "✓ Ik heb dit correct"}
                        </button>
                      )}
                      {isRevealed && (
                        <button
                          className="btn-sm btn-ghost normal-case"
                          onClick={() => setRevealed((st) => ({ ...st, [k]: false }))}
                        >
                          Verberg oplossing
                        </button>
                      )}
                    </div>

                    {isRevealed && (
                      <div className="mt-2 bg-sunken border-l-2 border-brand/60 px-3 py-2">
                        <div className="text-2xs uppercase tracking-wider text-fg-dim mb-1">Modeloplossing</div>
                        <pre className="font-mono text-xs text-fg whitespace-pre-wrap leading-relaxed">{s.model}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cheat-sheet onderaan */}
      <div className="pane">
        <div className="pane-header"><span>📋 Normalisatie cheat-sheet</span></div>
        <div className="p-4 text-xs text-fg-muted space-y-2">
          <div>
            <strong className="text-fg">0NF</strong> — alle data kan in tabelvorm.
          </div>
          <div>
            <strong className="text-fg">1NF</strong> — alle attributen zijn <em>atomair</em> (geen lijsten of samengestelde waarden).
          </div>
          <div>
            <strong className="text-fg">2NF</strong> — 1NF + geen <em>partiële functionele afhankelijkheden</em> van de kandidaatsleutel.
            <br />→ Probleem alleen bij <em>samengestelde</em> kandidaatsleutels.
          </div>
          <div>
            <strong className="text-fg">3NF</strong> — 2NF + geen <em>transitieve functionele afhankelijkheden</em>.
            <br />→ Geen niet-sleutelattribuut mag een ander niet-sleutelattribuut bepalen.
          </div>
          <div className="pt-2 border-t border-line text-2xs text-fg-dim">
            Stappenplan: attributen oplijsten → 0/1NF check → f.a. bepalen → kandidaatsleutel → 2NF check + splits → 3NF check elke tabel + splits → finale tabellen + PK/FK + ERD.
          </div>
        </div>
      </div>
    </div>
  );
}
