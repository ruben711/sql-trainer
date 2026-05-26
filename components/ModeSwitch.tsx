"use client";
import { useMode, MODES, type Mode } from "@/lib/modes";
import { useMounted } from "@/lib/useMounted";

export default function ModeSwitch() {
  const mounted = useMounted();
  const mode = useMode((s) => s.mode);
  const setMode = useMode((s) => s.setMode);

  // SSR-safe: default tonen op server, na hydration de echte
  const activeMode = mounted ? mode : "exam";

  return (
    <div className="mode-switch" role="tablist" aria-label="Modus">
      {(Object.keys(MODES) as Mode[]).map((m) => {
        const cfg = MODES[m];
        const active = activeMode === m;
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
