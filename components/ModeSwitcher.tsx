"use client";
import { MODES, useMode, type Mode } from "@/lib/modes";
import clsx from "clsx";

export default function ModeSwitcher({ compact = false }: { compact?: boolean }) {
  const mode = useMode((s) => s.mode);
  const setMode = useMode((s) => s.setMode);

  if (compact) {
    return (
      <div className="inline-flex rounded-full border border-line bg-bg-soft p-1">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              "px-3 py-1 text-xs rounded-full transition",
              mode === m ? "bg-accent text-white" : "text-slate-300 hover:text-white"
            )}
            title={MODES[m].description}
          >
            <span className="mr-1">{MODES[m].icon}</span>
            {MODES[m].label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {(Object.keys(MODES) as Mode[]).map((m) => {
        const cfg = MODES[m];
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              "text-left rounded-2xl border p-4 transition relative overflow-hidden",
              active ? "border-accent shadow-glow bg-bg-card" : "border-line bg-bg-card/60 hover:bg-bg-card"
            )}
          >
            <div className={clsx("absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl", cfg.color)} />
            <div className="text-2xl">{cfg.icon}</div>
            <div className="mt-1 font-semibold">{cfg.label} <span className="text-muted font-normal">· {cfg.sublabel}</span></div>
            <div className="mt-1 text-sm text-muted">{cfg.description}</div>
            {active && <div className="mt-3 chip">✓ Actief</div>}
          </button>
        );
      })}
    </div>
  );
}
