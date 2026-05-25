"use client";
import { create } from "zustand";

type S = {
  isAdmin: boolean;
  checked: boolean;
  check: () => Promise<void>;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

export const useAdmin = create<S>((set) => ({
  isAdmin: false,
  checked: false,
  check: async () => {
    try {
      const r = await fetch("/api/admin/me", { cache: "no-store" });
      const j = await r.json();
      set({ isAdmin: !!j.admin, checked: true });
    } catch {
      set({ isAdmin: false, checked: true });
    }
  },
  login: async (password) => {
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) {
      set({ isAdmin: true, checked: true });
      return { ok: true };
    }
    return { ok: false, error: j.error || `HTTP ${r.status}` };
  },
  logout: async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    set({ isAdmin: false });
  },
}));
