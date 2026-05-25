"use client";
import { useMode, MODES, type Mode } from "@/lib/modes";

export default function ModeSwitch() {
  const mode = useMode((s) => s.mode);
  const setMode = useMode((s) => s.setMode);

  return (
    <div className="mode-switch" role="tablist" aria-label="Modus">
      {(Object.keys(MODES) as Mode[]).map((m) => {
        const cfg = MODES[m];
        const active = mode === m;
        return (
          <button
            key={m}
            data-m={m}
            className={active ? "active" : ""}
            onClick={() => setMode(m)}
            title={cfg.description}
            role="tab"
            aria-selected={active}
          >
            <span aria-hidden>{cfg.icon}</span>
            <span>{m === "exam" ? "Examen DB" : "Algemene SQL"}</span>
          </button>
        );
      })}
    </div>
  );
}
