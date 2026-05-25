"use client";
import { useEffect } from "react";
import { useMode } from "@/lib/modes";
import { useTheme } from "@/lib/theme";

/** Zet data-mode op <html> en zorgt dat theme bij eerste paint toegepast wordt. */
export default function ModeProvider({ children }: { children: React.ReactNode }) {
  const mode = useMode((s) => s.mode);
  const apply = useTheme((s) => s.apply);

  useEffect(() => {
    apply();
  }, [apply]);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode]);

  return <>{children}</>;
}
