"use client";
import { useEffect, useRef } from "react";
import { useMode } from "@/lib/modes";
import { useTheme } from "@/lib/theme";
import { track, trackVisitorOnce } from "@/lib/logger";

/** Zet data-mode op <html>, past theme toe en logt visitor + mode changes. */
export default function ModeProvider({ children }: { children: React.ReactNode }) {
  const mode = useMode((s) => s.mode);
  const apply = useTheme((s) => s.apply);
  const firstRun = useRef(true);

  useEffect(() => { apply(); }, [apply]);

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
