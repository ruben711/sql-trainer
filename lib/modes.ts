"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import zoekertjeExercises from "../data/exercises.zoekertje.json";
import classicsExercises from "../data/exercises.classics.json";
import type { Exercise } from "./exercises";

export type Mode = "exam" | "general";

export const MODES = {
  exam: {
    id: "exam" as const,
    label: "Examen-modus",
    sublabel: "Zoekertje",
    description: "Oefen op de échte examen-database — Zoekertje (Belgisch classifieds-platform).",
    seedUrl: "/seed.zoekertje.sql",
    exercises: zoekertjeExercises as Exercise[],
    color: "from-accent to-pink-500",
    icon: "🎓",
  },
  general: {
    id: "general" as const,
    label: "Algemene SQL",
    sublabel: "Classics",
    description: "Generieke oefendatabase (Engelse tabellen, e-commerce). Train basis tot gevorderd.",
    seedUrl: "/seed.classics.sql",
    exercises: classicsExercises as Exercise[],
    color: "from-emerald-500 to-cyan-500",
    icon: "🧠",
  },
} as const;

type ModeState = {
  mode: Mode;
  setMode: (m: Mode) => void;
};

export const useMode = create<ModeState>()(
  persist(
    (set) => ({
      mode: "exam",
      setMode: (m) => set({ mode: m }),
    }),
    { name: "sql-trainer-mode" }
  )
);

export function currentConfig(mode: Mode) {
  return MODES[mode];
}
