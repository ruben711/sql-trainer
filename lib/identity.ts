"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Identity = {
  uid: string;            // permanent, gegenereerd op eerste bezoek
  name: string | null;    // gekozen naam; null = nog niet ingesteld
  hasJoinedBoard: boolean;
  set: (n: string) => void;
  ensure: () => void;
  randomName: () => string;
};

function genUid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function genName(): string {
  return "User" + Math.floor(1000 + Math.random() * 9000);
}

export const useIdentity = create<Identity>()(
  persist(
    (set, get) => ({
      uid: "",
      name: null,
      hasJoinedBoard: false,
      randomName: genName,
      ensure: () => {
        if (!get().uid) set({ uid: genUid() });
      },
      set: (n: string) => set({ name: n.trim().slice(0, 24), hasJoinedBoard: true }),
    }),
    { name: "sql-trainer-identity" }
  )
);
