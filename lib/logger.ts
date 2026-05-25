"use client";

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
  const payload = JSON.stringify({ event, sessionId: getSessionId(), data });
  // Bij voorkeur sendBeacon (vuurt ook bij page-unload, blocking-free)
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/log", blob);
    return;
  }
  // Fallback
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/** Eenmalige visitor-log per browser per ~24u (lichte deduplicatie). */
export function trackVisitorOnce() {
  if (typeof window === "undefined") return;
  const last = Number(localStorage.getItem(VISITED_KEY) || 0);
  const now = Date.now();
  if (now - last < 24 * 60 * 60 * 1000) return;
  localStorage.setItem(VISITED_KEY, String(now));
  track("visitor", { url: location.pathname });
}
