"use client";
import { create } from "zustand";

type S = {
  tables: string[];
  set: (t: string[]) => void;
  clear: () => void;
};

export const useHighlight = create<S>((set) => ({
  tables: [],
  set: (t) => set({ tables: t }),
  clear: () => set({ tables: [] }),
}));
