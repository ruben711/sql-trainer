"use client";
import { useEffect, useRef } from "react";
import { useMode } from "@/lib/modes";
import { useTheme } from "@/lib/theme";
import { useProgress } from "@/lib/store";
import { track, trackVisitorOnce } from "@/lib/logger";

/** Zet data-mode op <html>, past theme toe, logt visitor + mode changes,
 *  en triggert een XP-herrekening wanneer de XP-regels veranderd zijn. */
export default function ModeProvider({ children }: { children: React.ReactNode }) {
  const mode = useMode((s) => s.mode);
  const apply = useTheme((s) => s.apply);
  const firstRun = useRef(true);

  useEffect(() => { apply(); }, [apply]);

  // Eenmalig: als XP-regels gewijzigd zijn → recalc met huidige tabel.
  useEffect(() => {
    const TARGET = 5; // moet overeenkomen met XP_RULES_VERSION in store.ts
    const cur = useProgress.getState().xpRulesVersion ?? 0;
    if (cur < TARGET) {
      useProgress.getState().recalcXp();
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    if (firstRun.current) {
      firstRun.current = false;
      trackVisitorOnce();
    } else {
      track("mode_changed", { mode });
    }
  }, [mode]);

  return <>{children}</>;
}
