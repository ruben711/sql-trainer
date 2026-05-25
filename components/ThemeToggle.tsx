"use client";
import { useEffect } from "react";
import { useTheme, type Theme } from "@/lib/theme";

const options: { v: Theme; label: string; icon: string }[] = [
  { v: "light", label: "Licht", icon: "☀" },
  { v: "dark", label: "Donker", icon: "☾" },
  { v: "system", label: "Systeem", icon: "⚙" },
];

export default function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  const apply = useTheme((s) => s.apply);

  useEffect(() => {
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const h = () => apply();
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [apply]);

  return (
    <div className="inline-flex h-7 border border-line rounded-sm overflow-hidden bg-pane">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => setTheme(o.v)}
          className={`px-2 h-full text-2xs inline-flex items-center gap-1 transition-colors ${
            theme === o.v ? "bg-hover text-fg" : "text-fg-muted hover:text-fg hover:bg-hover"
          }`}
          title={`Thema: ${o.label}`}
        >
          <span>{o.icon}</span>
          <span className="hidden lg:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
