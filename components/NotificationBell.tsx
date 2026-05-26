"use client";
import { useEffect, useRef } from "react";
import { useIdentity } from "@/lib/identity";
import { useNotifs, fetchNotifications, type Notif } from "@/lib/notifications";
import { useMounted } from "@/lib/useMounted";

const KIND_STYLE: Record<Notif["kind"], { color: string; bg: string; icon: string }> = {
  info:    { color: "rgb(var(--brand))",  bg: "rgb(var(--brand) / 0.10)",  icon: "ℹ" },
  success: { color: "rgb(var(--ok))",     bg: "rgb(var(--ok) / 0.10)",     icon: "✓" },
  warning: { color: "rgb(var(--warn))",   bg: "rgb(var(--warn) / 0.10)",   icon: "⚠" },
  error:   { color: "rgb(var(--err))",    bg: "rgb(var(--err) / 0.10)",    icon: "✕" },
};

function timeAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s geleden`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u geleden`;
  return `${Math.floor(h / 24)}d geleden`;
}

export default function NotificationBell() {
  const mounted = useMounted();
  const id = useIdentity();
  const items = useNotifs((s) => s.items);
  const readIds = useNotifs((s) => s.readIds);
  const bellOpen = useNotifs((s) => s.bellOpen);
  const setBellOpen = useNotifs((s) => s.setBellOpen);
  const markRead = useNotifs((s) => s.markRead);
  const markAllRead = useNotifs((s) => s.markAllRead);
  const unread = mounted ? items.filter((n) => !readIds[n.id]).length : 0;
  const wrapRef = useRef<HTMLDivElement>(null);

  // Init uid + poll loop
  useEffect(() => { id.ensure(); }, []);
  useEffect(() => {
    if (!id.uid) return;
    fetchNotifications(id.uid);
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications(id.uid);
      }
    }, 20_000);
    return () => clearInterval(t);
  }, [id.uid]);

  // Klik buiten = dropdown sluiten
  useEffect(() => {
    if (!bellOpen) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [bellOpen, setBellOpen]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => {
          setBellOpen(!bellOpen);
          if (!bellOpen && unread > 0) {
            // Mark all read na 1s viewing (zodat je de badge nog even ziet)
            setTimeout(() => markAllRead(), 1200);
          }
        }}
        className="relative h-7 w-7 inline-flex items-center justify-center text-fg-muted hover:text-fg hover:bg-hover rounded-sm border border-line"
        title="Meldingen"
        aria-label="Meldingen"
      >
        <span>🔔</span>
        {mounted && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold font-mono inline-flex items-center justify-center text-white"
            style={{ background: "rgb(var(--err))" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {bellOpen && (
        <div className="absolute right-0 top-9 z-50 w-80 max-h-[70vh] overflow-hidden pane shadow-2xl flex flex-col">
          <div className="pane-header justify-between">
            <span>Meldingen</span>
            {items.length > 0 && (
              <button className="normal-case font-normal text-fg-muted hover:text-fg" onClick={() => markAllRead()}>
                Alles als gelezen
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-fg-dim">Geen meldingen.</p>
            ) : (
              items.map((n) => {
                const st = KIND_STYLE[n.kind] || KIND_STYLE.info;
                const isUnread = !readIds[n.id];
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`px-3 py-2 border-b border-line cursor-pointer ${isUnread ? "" : "opacity-70"}`}
                    style={{ background: isUnread ? st.bg : undefined }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0" style={{ color: st.color }}>{st.icon}</span>
                      <div className="flex-1 min-w-0">
                        {n.title && <div className="font-semibold text-sm">{n.title}</div>}
                        {n.body && <div className="text-2xs text-fg-muted whitespace-pre-wrap">{n.body}</div>}
                        <div className="text-2xs text-fg-dim mt-1 font-mono">{timeAgo(Date.now() - n.ts)}</div>
                      </div>
                      {isUnread && <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: st.color }} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
