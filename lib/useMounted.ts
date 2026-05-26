"use client";
import { useEffect, useState } from "react";

/** Returns true zodra de component op de client gemount is.
 *  Gebruik om hydration-mismatches te vermijden bij persisted-zustand stores. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
