"use client";
import { useIdentity } from "./identity";

const SESSION_KEY = "sql-trainer-session";
const VISITED_KEY = "sql-trainer-visited";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

type Event =
  | "visitor"
  | "mode_changed"
  | "exercise_view"
  | "exercise_completed"
  | "exercise_failed"
  | "exam_started"
  | "exam_completed";

export function track(event: Event, data?: Record<string, any>) {
  if (typeof window === "undefined") return;
  const id = useIdentity.getState();
  const payload = JSON.stringify({
    event,
    sessionId: getSessionId(),
    uid: id.uid || null,
    name: id.name || null,
    data,
  });
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/log", blob);
    return;
  }
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

export function trackVisitorOnce() {
  if (typeof window === "undefined") return;
  const last = Number(localStorage.getItem(VISITED_KEY) || 0);
  const now = Date.now();
  if (now - last < 24 * 60 * 60 * 1000) return;
  localStorage.setItem(VISITED_KEY, String(now));
  track("visitor", { url: location.pathname });
}
