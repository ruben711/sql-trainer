"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Mode } from "./modes";
import { MODES } from "./modes";
import { getExercises, type Difficulty } from "./exercises";

export type Attempt = {
  exerciseId: string;
  ts: number;
  correct: boolean;
  query: string;
  difficulty?: Difficulty;
};

type PerMode = {
  xp: number;
  streakDays: number;
  lastActiveDate: string | null;
  solved: Record<string, { firstSolvedAt: number; attempts: number }>;
  attempts: Attempt[];
  savedQueries: Record<string, string>;
};

const empty: PerMode = {
  xp: 0,
  streakDays: 0,
  lastActiveDate: null,
  solved: {},
  attempts: [],
  savedQueries: {},
};

type State = {
  byMode: Record<Mode, PerMode>;
  /** Welke versie van de XP-regels staat opgeslagen — bumpen forceert recalc. */
  xpRulesVersion: number;
  /** Geeft de XP-winst terug zodat de UI dat kan tonen. */
  recordAttempt: (mode: Mode, a: Omit<Attempt, "ts">) => number;
  getSavedQuery: (mode: Mode, exerciseId: string) => string | null;
  badges: (mode: Mode) => string[];
  level: (mode: Mode) => { level: number; nextAt: number; progress: number };
  reset: (mode: Mode) => void;
  /** Herbereken XP op basis van de huidige solved + difficulty-tabel. */
  recalcXp: () => void;
};

/** XP per moeilijkheid: eerste correcte poging.
 *  Insane = 0 (echt voor de fun / tryhards). Retry-XP overal 0 om gaming te ontmoedigen. */
export const XP_TABLE: Record<Difficulty, number> = {
  easy:   15,
  medium: 25,
  hard:   40,
  insane: 0,
};
const XP_RULES_VERSION = 4;

const todayStr = () => new Date().toISOString().slice(0, 10);

function recalcForMode(mode: Mode, state: PerMode): number {
  const exercises = getExercises(mode);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  let xp = 0;
  for (const id of Object.keys(state.solved)) {
    const ex = byId.get(id);
    if (!ex) continue;
    xp += XP_TABLE[ex.difficulty] ?? 0;
  }
  return xp;
}

export const useProgress = create<State>()(
  persist(
    (set, get) => ({
      byMode: { exam: { ...empty }, general: { ...empty } },
      xpRulesVersion: XP_RULES_VERSION,

      recordAttempt: (mode, a) => {
        const st = get().byMode[mode] ?? { ...empty };
        const isFirst = a.correct && !st.solved[a.exerciseId];
        const today = todayStr();
        let streak = st.streakDays;
        if (st.lastActiveDate !== today) {
          if (st.lastActiveDate) {
            const diff = Math.round((+new Date(today) - +new Date(st.lastActiveDate)) / 86400000);
            streak = diff === 1 ? streak + 1 : 1;
          } else streak = 1;
        }

        // XP enkel bij EERSTE correcte oplossing; retries geven 0.
        const xpGain = a.correct && isFirst && a.difficulty
          ? (XP_TABLE[a.difficulty] ?? 0)
          : 0;

        const nextSavedQueries = a.query
          ? { ...st.savedQueries, [a.exerciseId]: a.query }
          : st.savedQueries;

        const next: PerMode = {
          ...st,
          xp: st.xp + xpGain,
          streakDays: streak,
          lastActiveDate: today,
          attempts: [{ ...a, ts: Date.now() }, ...st.attempts].slice(0, 200),
          solved: a.correct
            ? {
                ...st.solved,
                [a.exerciseId]: {
                  firstSolvedAt: st.solved[a.exerciseId]?.firstSolvedAt ?? Date.now(),
                  attempts: (st.solved[a.exerciseId]?.attempts ?? 0) + 1,
                },
              }
            : st.solved,
          savedQueries: nextSavedQueries,
        };
        set({ byMode: { ...get().byMode, [mode]: next } });
        return xpGain;
      },

      getSavedQuery: (mode, exerciseId) => {
        const q = (get().byMode[mode]?.savedQueries ?? {})[exerciseId];
        return q ?? null;
      },

      badges: (mode) => {
        const st = get().byMode[mode] ?? empty;
        const all = getExercises(mode);
        const solvedIds = Object.keys(st.solved);
        const n = solvedIds.length;
        const out: string[] = [];

        // Volume
        if (n >= 1) out.push("🎯 Eerste oplossing");
        if (n >= 10) out.push("🔟 10 opgelost");
        if (n >= 25) out.push("🥈 25 opgelost");
        if (n >= 50) out.push("🥇 50 opgelost");
        if (n >= 100) out.push("💯 100 opgelost");

        // XP-mijlpalen
        if (st.xp >= 250) out.push("⭐ 250 XP");
        if (st.xp >= 500) out.push("⭐⭐ 500 XP");
        if (st.xp >= 1000) out.push("✨ 1000 XP");
        if (st.xp >= 2000) out.push("🌟 2000 XP");
        if (st.xp >= 3000) out.push("💫 3000 XP");

        // Streaks
        if (st.streakDays >= 3) out.push("🔥 3-dagen streak");
        if (st.streakDays >= 7) out.push("🔥🔥 7-dagen streak");
        if (st.streakDays >= 14) out.push("🔥🔥🔥 14-dagen streak");
        if (st.streakDays >= 30) out.push("🌋 30-dagen streak");

        // Moeilijkheid-mastery
        const byDiff: Record<Difficulty, { done: number; total: number }> = {
          easy: { done: 0, total: 0 }, medium: { done: 0, total: 0 },
          hard: { done: 0, total: 0 }, insane: { done: 0, total: 0 },
        };
        for (const e of all) {
          byDiff[e.difficulty].total++;
          if (st.solved[e.id]) byDiff[e.difficulty].done++;
        }
        if (byDiff.easy.total > 0 && byDiff.easy.done === byDiff.easy.total) out.push("🟢 Alle makkelijke");
        if (byDiff.medium.total > 0 && byDiff.medium.done === byDiff.medium.total) out.push("🟡 Alle gemiddelde");
        if (byDiff.hard.total > 0 && byDiff.hard.done === byDiff.hard.total) out.push("🔴 Alle moeilijke");
        if (byDiff.insane.total > 0 && byDiff.insane.done === byDiff.insane.total) out.push("💀 Tryhard — alle insane");

        // Hoofdstuk-mastery
        const ch: Record<string, { done: number; total: number }> = {};
        for (const e of all) {
          if (!ch[e.chapter]) ch[e.chapter] = { done: 0, total: 0 };
          ch[e.chapter].total++;
          if (st.solved[e.id]) ch[e.chapter].done++;
        }
        const compleetChapters = Object.entries(ch).filter(([, v]) => v.total > 0 && v.done === v.total);
        if (compleetChapters.length >= 1) out.push("📚 Hoofdstuk compleet");
        if (compleetChapters.length >= 5) out.push("📚📚 5 hoofdstukken compleet");
        if (compleetChapters.length >= 10) out.push("📚📚📚 10 hoofdstukken compleet");

        // Speciale tags
        if (n === all.length && all.length > 0) out.push("🏆 100% — alle oefeningen");
        if (st.attempts.length >= 100) out.push("👨‍💻 100 pogingen");
        if (st.attempts.length >= 500) out.push("🧑‍🔬 500 pogingen");

        // Examen-DB specifiek
        if (mode === "exam") {
          const dmlAll = all.filter((e) => e.chapter.includes("DML"));
          const dmlDone = dmlAll.filter((e) => st.solved[e.id]).length;
          if (dmlAll.length > 0 && dmlDone === dmlAll.length) out.push("✍️ DML meester");
        }

        return out;
      },

      level: (mode) => {
        const xp = (get().byMode[mode] ?? empty).xp;
        let lvl = 1, need = 100, acc = 0;
        while (xp >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.25); }
        return { level: lvl, nextAt: acc + need, progress: (xp - acc) / need };
      },

      reset: (mode) =>
        set({ byMode: { ...get().byMode, [mode]: { ...empty } } }),

      recalcXp: () => {
        const cur = get().byMode;
        const next: Record<Mode, PerMode> = {
          exam:    { ...cur.exam,    xp: recalcForMode("exam",    cur.exam) },
          general: { ...cur.general, xp: recalcForMode("general", cur.general) },
        };
        set({ byMode: next, xpRulesVersion: XP_RULES_VERSION });
      },
    }),
    {
      name: "sql-trainer-progress",
      version: 4,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        const ensureFields = (pm: any) => ({ ...empty, ...(pm || {}) });
        if (version < 2 && persisted.solved) {
          return { byMode: { exam: ensureFields(persisted), general: { ...empty } }, xpRulesVersion: 0 };
        }
        if (version < 3 && persisted.byMode) {
          return {
            byMode: {
              exam: ensureFields(persisted.byMode.exam),
              general: ensureFields(persisted.byMode.general),
            },
            xpRulesVersion: 0,
          };
        }
        if (version < 4) {
          // XP-tabel veranderd — markeer voor recalc bij eerste mount
          return { ...persisted, xpRulesVersion: 0 };
        }
        return persisted;
      },
    }
  )
);
