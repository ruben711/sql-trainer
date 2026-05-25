"use client";
import { useMode, MODES } from "@/lib/modes";
import { useProgress } from "@/lib/store";

export default function StatusBar() {
  const mode = useMode((s) => s.mode);
  const state = useProgress((s) => s.byMode[mode]);
  const level = useProgress((s) => s.level(mode));
  const solved = Object.keys(state.solved).length;
  const cfg = MODES[mode];

  return (
    <footer className="statusbar">
      <span className="seg font-medium">
        <span aria-hidden>{cfg.icon}</span>
        <span>{mode === "exam" ? "Examen DB" : "Algemene SQL"}</span>
      </span>
      <span className="seg">DB: <span className="font-mono">{cfg.sublabel}</span></span>
      <span className="seg">SQLite WASM</span>
      <span className="seg ml-auto">XP {state.xp}</span>
      <span className="seg">Niveau {level.level}</span>
      <span className="seg">Reeks {state.streakDays}d</span>
      <span className="seg">Opgelost {solved}</span>
    </footer>
  );
}
