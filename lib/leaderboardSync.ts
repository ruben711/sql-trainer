"use client";
import { useIdentity } from "./identity";
import { useProgress } from "./store";

/** Stuur huidige scores naar de server. Doet niets als gebruiker geen naam gekozen heeft. */
export async function syncIfJoined() {
  if (typeof window === "undefined") return;
  const id = useIdentity.getState();
  if (!id.uid || !id.hasJoinedBoard || !id.name) return;
  const p = useProgress.getState().byMode;
  try {
    await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: id.uid,
        name: id.name,
        exam: { xp: p.exam.xp, solved: Object.keys(p.exam.solved).length },
        general: { xp: p.general.xp, solved: Object.keys(p.general.solved).length },
      }),
      keepalive: true,
    });
  } catch { /* stil falen */ }
}
