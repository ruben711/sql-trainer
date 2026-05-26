"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Notif = {
  id: string;
  ts: number;
  title: string;
  body: string;
  target: "all" | "uid" | "session";
  targetValue?: string;
  kind: "info" | "success" | "warning" | "error";
};

type S = {
  items: Notif[];
  readIds: Record<string, true>;
  lastFetchedAt: number;
  bellOpen: boolean;
  set: (items: Notif[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setBellOpen: (b: boolean) => void;
  unreadCount: () => number;
};

export const useNotifs = create<S>()(
  persist(
    (set, get) => ({
      items: [],
      readIds: {},
      lastFetchedAt: 0,
      bellOpen: false,
      set: (items) => {
        // Merge: behoud bekende items, voeg nieuwe toe (uniek op id)
        const map = new Map<string, Notif>();
        for (const n of get().items) map.set(n.id, n);
        for (const n of items) map.set(n.id, n);
        const merged = Array.from(map.values()).sort((a, b) => b.ts - a.ts).slice(0, 100);
        set({ items: merged, lastFetchedAt: Date.now() });
      },
      markRead: (id) => set({ readIds: { ...get().readIds, [id]: true } }),
      markAllRead: () => {
        const next = { ...get().readIds };
        for (const n of get().items) next[n.id] = true;
        set({ readIds: next });
      },
      setBellOpen: (b) => set({ bellOpen: b }),
      unreadCount: () => {
        const { items, readIds } = get();
        return items.filter((n) => !readIds[n.id]).length;
      },
    }),
    { name: "sql-trainer-notifs", partialize: (s) => ({ items: s.items, readIds: s.readIds }) }
  )
);

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("sql-trainer-session") || "";
}

/** Poll de server voor nieuwe notificaties. */
export async function fetchNotifications(uid: string) {
  try {
    const sid = getSessionId();
    const u = new URLSearchParams({ uid, sid });
    const r = await fetch(`/api/notifications?${u.toString()}`, { cache: "no-store" });
    const j = await r.json();
    if (j.ok && Array.isArray(j.items)) {
      useNotifs.getState().set(j.items);
    }
  } catch { /* niet kritiek */ }
}
