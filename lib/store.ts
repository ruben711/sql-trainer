"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Mode } from "./modes";

export type Attempt = { exerciseId: string; ts: number; correct: boolean; query: string };

type PerMode = {
  xp: number;
  streakDays: number;
  lastActiveDate: string | null;
  solved: Record<string, { firstSolvedAt: number; attempts: number }>;
  attempts: Attempt[];
  /** De query die jij correct hebt ingediend per oefening (laatst correcte poging). */
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
  recordAttempt: (mode: Mode, a: Omit<Attempt, "ts">) => void;
  getSavedQuery: (mode: Mode, exerciseId: string) => string | null;
  badges: (mode: Mode) => string[];
  level: (mode: Mode) => { level: number; nextAt: number; progress: number };
  reset: (mode: Mode) => void;
};

const XP_FIRST = 25;
const XP_RETRY = 5;
const todayStr = () => new Date().toISOString().slice(0, 10);

export const useProgress = create<State>()(
  persist(
    (set, get) => ({
      byMode: { exam: { ...empty }, general: { ...empty } },

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
        const xpGain = a.correct ? (isFirst ? XP_FIRST : XP_RETRY) : 0;

        // Sla iedere ingediende query op (ook foutieve) — laatste poging telt.
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
      },

      getSavedQuery: (mode, exerciseId) => {
        const q = (get().byMode[mode]?.savedQueries ?? {})[exerciseId];
        return q ?? null;
      },

      badges: (mode) => {
        const st = get().byMode[mode] ?? empty;
        const out: string[] = [];
        const n = Object.keys(st.solved).length;
        if (n >= 1) out.push("🎯 Eerste juiste antwoord");
        if (n >= 10) out.push("🔟 10 opgelost");
        if (n >= 25) out.push("🥈 25 opgelost");
        if (n >= 50) out.push("🥇 50 opgelost");
        if (st.streakDays >= 3) out.push("🔥 3-dagen streak");
        if (st.streakDays >= 7) out.push("🔥🔥 7-dagen streak");
        if (st.xp >= 500) out.push("⭐ 500 XP");
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
    }),
    {
      name: "sql-trainer-progress",
      version: 3,
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        const ensureFields = (pm: any) => ({ ...empty, ...(pm || {}) });
        if (version < 2 && persisted.solved) {
          return { byMode: { exam: ensureFields(persisted), general: { ...empty } } };
        }
        if (version < 3 && persisted.byMode) {
          // Voeg savedQueries: {} toe per mode (oude data heeft dat veld niet)
          return {
            byMode: {
              exam: ensureFields(persisted.byMode.exam),
              general: ensureFields(persisted.byMode.general),
            },
          };
        }
        return persisted;
      },
    }
  )
);
