"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/adminClient";
import CustomTag from "@/components/CustomTag";

type CustomTagData = { label: string; color: string; emoji?: string };
type Entry = {
  uid: string;
  name: string;
  exam: { xp: number; solved: number };
  general: { xp: number; solved: number };
  updatedAt: number;
  admin?: boolean;
  customTag?: CustomTagData | null;
};

type Notif = {
  id: string;
  ts: number;
  title: string;
  body: string;
  target: "all" | "uid" | "session";
  targetValue?: string;
  kind: "info" | "success" | "warning" | "error";
};

type Session = {
  sessionId: string;
  uid: string | null;
  name: string | null;
  firstSeenAt: number;
  lastEventAt: number;
  lastEvent: string;
  lastData: any;
  ip: string;
  geo: { country: string; region: string; city: string };
  ua: string;
  mode: "exam" | "general" | null;
  currentExercise: string | null;
  recentEvents: { event: string; data: any; ts: number }[];
};

export default function AdminPage() {
  const admin = useAdmin();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { admin.check(); }, []);

  if (!admin.checked) return <div className="p-6 text-fg-dim">Sessie controleren…</div>;

  if (!admin.isAdmin) {
    return (
      <div className="min-h-[80vh] grid place-items-center p-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            const r = await admin.login(pw);
            if (!r.ok) {
              setErr(r.error === "invalid" ? "Verkeerd wachtwoord" :
                     r.error === "locked" ? "Te veel pogingen — 15 min wachten" :
                     r.error === "admin_not_configured" ? "Admin niet geconfigureerd op de server" :
                     "Onbekende fout");
            }
            setBusy(false);
            setPw("");
          }}
          className="pane w-full max-w-sm"
        >
          <div className="pane-header"><span>🔐 Admin Login</span></div>
          <div className="p-4 space-y-3">
            <label className="block">
              <span className="text-2xs uppercase tracking-wider text-fg-dim">Wachtwoord</span>
              <input
                autoFocus type="password" value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="input mt-1 h-9 text-base font-mono"
                placeholder="••••••••"
              />
            </label>
            {err && <div className="feedback-err m-0">{err}</div>}
            <button className="btn-primary w-full justify-center" disabled={busy || !pw}>
              {busy ? "Verifiëren…" : "Inloggen"}
            </button>
            <p className="text-2xs text-fg-dim">
              Pad <code className="font-mono">/admin</code> · niet gelinkt in nav.
            </p>
          </div>
        </form>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => admin.logout()} />;
}

// ──────────────────────────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"sessions" | "leaderboard" | "notify">("sessions");
  return (
    <div className="flex flex-col">
      <div className="title-bar justify-between">
        <span>🔐 Admin</span>
        <button onClick={onLogout} className="btn-sm btn normal-case font-normal">Uitloggen</button>
      </div>
      <div className="tabbar">
        <button onClick={() => setTab("sessions")} className={`tab ${tab === "sessions" ? "tab-active" : ""}`}>
          🟢 Live sessies
        </button>
        <button onClick={() => setTab("leaderboard")} className={`tab ${tab === "leaderboard" ? "tab-active" : ""}`}>
          🏆 Leaderboard beheer
        </button>
        <button onClick={() => setTab("notify")} className={`tab ${tab === "notify" ? "tab-active" : ""}`}>
          📢 Meldingen
        </button>
      </div>
      {tab === "sessions" && <SessionsPanel />}
      {tab === "leaderboard" && <LeaderboardPanel />}
      {tab === "notify" && <NotifyPanel />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Live sessies
// ──────────────────────────────────────────────────────────────────
function timeAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

const EVENT_LABELS: Record<string, string> = {
  visitor: "👤 Net binnen",
  mode_changed: "🔀 Wisselde modus",
  exercise_view: "👁️ Bekijkt oefening",
  exercise_completed: "✅ Loste oefening op",
  exercise_failed: "❌ Foute query",
  exam_started: "🏁 Examen gestart",
  exam_completed: "🎯 Examen voltooid",
};

function describeActivity(s: Session): string {
  const ev = EVENT_LABELS[s.lastEvent] || s.lastEvent;
  if (s.currentExercise && (s.lastEvent.startsWith("exercise") || s.lastEvent === "mode_changed")) {
    return `${ev} ${s.currentExercise}`;
  }
  if (s.lastEvent === "exam_completed" && s.lastData?.percent != null) {
    return `${ev} (${s.lastData.percent}%)`;
  }
  return ev;
}

function SessionsPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/admin/sessions", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) setError(j.error || "load_failed");
      else { setSessions(j.sessions); setNow(j.now); setError(null); }
    } catch (e: any) { setError(String(e?.message ?? e)); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Auto-refresh elke 5s als niet gepauzeerd en tab visible
  useEffect(() => {
    if (paused) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") load();
    };
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [paused]);

  // Klok updaten voor "time ago" weergave
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function delSession(sid: string) {
    if (!confirm("Sessie verwijderen uit overzicht?")) return;
    await fetch(`/api/admin/sessions?sid=${encodeURIComponent(sid)}`, { method: "DELETE" });
    load();
  }

  // Categoriseer: actief (<2 min), idle (<15 min), oud (>15 min)
  const active = sessions.filter((s) => now - s.lastEventAt < 2 * 60_000);
  const idle = sessions.filter((s) => now - s.lastEventAt >= 2 * 60_000 && now - s.lastEventAt < 15 * 60_000);
  const old = sessions.filter((s) => now - s.lastEventAt >= 15 * 60_000);

  return (
    <div className="p-4 space-y-3">
      <div className="pane">
        <div className="pane-header">
          <span>Live sessies</span>
          <span className="normal-case font-normal flex items-center gap-2">
            <span className="text-2xs text-fg-dim">
              <span className="text-ok">●</span> {active.length} actief ·
              <span className="text-warn"> ●</span> {idle.length} idle ·
              <span className="text-fg-dim"> ●</span> {old.length} oud
            </span>
            <button
              onClick={() => setPaused((p) => !p)}
              className="btn-sm btn-ghost normal-case"
              title="Pauzeer/hervat auto-refresh"
            >
              {paused ? "▶ Hervat" : "⏸ Pauzeer"}
            </button>
            <button onClick={load} className="btn-sm btn-ghost normal-case">↻</button>
          </span>
        </div>
        {error && <div className="feedback-err m-0">{error}</div>}
        {loading && <p className="p-4 text-sm text-fg-dim">Laden…</p>}
        {!loading && !error && sessions.length === 0 && (
          <p className="p-4 text-sm text-fg-dim">
            Nog geen sessies. Wanneer iemand de app gebruikt verschijnen hier real-time updates.
          </p>
        )}
        {!loading && sessions.length > 0 && (
          <table className="result">
            <thead>
              <tr>
                <th className="w-2"></th>
                <th>Laatst</th>
                <th>Naam</th>
                <th>Sessie</th>
                <th>Modus</th>
                <th>Activiteit</th>
                <th>Locatie</th>
                <th>IP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const ageMs = now - s.lastEventAt;
                const dotColor =
                  ageMs < 2 * 60_000 ? "rgb(var(--ok))" :
                  ageMs < 15 * 60_000 ? "rgb(var(--warn))" :
                  "rgb(var(--fg-dim))";
                const modeStyle = s.mode === "exam"
                  ? "rgb(var(--mode-exam))"
                  : s.mode === "general"
                  ? "rgb(var(--mode-general))"
                  : "rgb(var(--fg-dim))";
                const geoStr = [s.geo?.city, s.geo?.country].filter(Boolean).join(", ") || "—";
                const isExp = expanded === s.sessionId;
                return (
                  <>
                    <tr
                      key={s.sessionId}
                      onClick={() => setExpanded(isExp ? null : s.sessionId)}
                      className="cursor-pointer"
                    >
                      <td><span style={{ color: dotColor }}>●</span></td>
                      <td className="text-fg-dim" title={new Date(s.lastEventAt).toLocaleString("nl-BE")}>
                        {timeAgo(ageMs)} geleden
                      </td>
                      <td className="str">{s.name || <span className="text-fg-dim italic">anoniem</span>}</td>
                      <td className="font-mono text-fg-dim">{s.sessionId.slice(0, 8)}</td>
                      <td>
                        {s.mode && (
                          <span className="chip" style={{ color: modeStyle, borderColor: modeStyle + "55" }}>
                            {s.mode === "exam" ? "Examen DB" : "Algemene SQL"}
                          </span>
                        )}
                      </td>
                      <td>{describeActivity(s)}</td>
                      <td className="text-fg-dim">{geoStr}</td>
                      <td className="font-mono text-fg-dim text-2xs">{s.ip}</td>
                      <td>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); delSession(s.sessionId); }}
                          className="btn-sm btn"
                          style={{ borderColor: "rgb(var(--err) / 0.4)", color: "rgb(var(--err))" }}
                          title="Sessie verwijderen"
                        >🗑</button>
                      </td>
                    </tr>
                    {isExp && (
                      <tr key={s.sessionId + "-exp"}>
                        <td colSpan={9} className="bg-sunken">
                          <div className="p-3 text-2xs space-y-2 font-mono">
                            <div>
                              <span className="text-fg-dim">UID:</span> {s.uid ?? "—"}
                              <span className="text-fg-dim ml-4">Session:</span> {s.sessionId}
                              <span className="text-fg-dim ml-4">Eerste activiteit:</span>{" "}
                              {new Date(s.firstSeenAt).toLocaleString("nl-BE")}
                            </div>
                            <div className="text-fg-dim truncate">UA: {s.ua}</div>
                            <div>
                              <div className="text-fg-dim uppercase tracking-wider mb-1">
                                Laatste {Math.min(s.recentEvents.length, 20)} events
                              </div>
                              <div className="space-y-0.5">
                                {[...s.recentEvents].reverse().map((e, i) => (
                                  <div key={i} className="flex gap-2">
                                    <span className="text-fg-dim w-20 shrink-0">
                                      {timeAgo(now - e.ts)} geleden
                                    </span>
                                    <span className="w-44 shrink-0">{EVENT_LABELS[e.event] || e.event}</span>
                                    <span className="text-fg-dim truncate">
                                      {e.data ? JSON.stringify(e.data).slice(0, 180) : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="pane">
        <div className="pane-header"><span>Info</span></div>
        <ul className="p-3 text-xs text-fg-muted list-disc list-inside space-y-1">
          <li>Sessies worden 24u bewaard (auto-cleanup).</li>
          <li><span className="text-ok">●</span> actief (laatste 2 min) · <span className="text-warn">●</span> idle (2-15 min) · <span className="text-fg-dim">●</span> oud (&gt;15 min).</li>
          <li>Klik een rij open voor de volledige event-historie van die sessie.</li>
          <li>Auto-refresh elke 5s. Pauzeer als het stoort.</li>
        </ul>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Leaderboard beheer
// ──────────────────────────────────────────────────────────────────
function LeaderboardPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Entry>>({});
  const [tagEditor, setTagEditor] = useState<{ uid: string; name: string; tag: CustomTagData } | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/leaderboard?mode=exam", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) setError(j.error || "load_failed");
      else setEntries(j.entries);
    } catch (e: any) { setError(String(e?.message ?? e)); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(uid: string, name: string) {
    if (!confirm(`Verwijder speler "${name}"? Dit is onomkeerbaar.`)) return;
    const r = await fetch(`/api/leaderboard?uid=${encodeURIComponent(uid)}`, { method: "DELETE" });
    if (r.ok) load(); else alert("Verwijderen mislukt: " + r.status);
  }
  async function save(uid: string) {
    const r = await fetch("/api/leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, ...draft }),
    });
    if (r.ok) { setEditing(null); setDraft({}); load(); }
    else alert("Wijzigen mislukt: " + r.status);
  }
  async function toggleAdmin(uid: string, current: boolean) {
    const r = await fetch("/api/leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, admin: !current }),
    });
    if (r.ok) load();
  }

  const [recalcing, setRecalcing] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);

  async function recalcAllXp() {
    if (!confirm(
      "Alle XP op het leaderboard herberekenen?\n\n" +
      "Formule: solved × 25 XP per oefening (flat, ongeacht moeilijkheid).\n\n" +
      "Lokale clients krijgen de exacte waarde bij hun volgende sync."
    )) return;
    setRecalcing(true);
    setRecalcResult(null);
    try {
      const r = await fetch("/api/admin/leaderboard/recalc", { method: "POST" });
      const j = await r.json();
      if (!j.ok) { setRecalcResult("❌ " + (j.error || r.status)); }
      else {
        setRecalcResult(`✓ ${j.changed} van ${j.total} spelers bijgewerkt`);
        load();
      }
    } catch (e: any) {
      setRecalcResult("❌ " + String(e?.message ?? e));
    } finally {
      setRecalcing(false);
    }
  }

  async function saveTag(uid: string, tag: CustomTagData | null) {
    const r = await fetch("/api/leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, customTag: tag }),
    });
    if (r.ok) { setTagEditor(null); load(); }
    else alert("Tag opslaan mislukt: " + r.status);
  }

  return (
    <div className="p-4 space-y-3">
      <div className="pane">
        <div className="pane-header">
          <span>Spelers ({entries.length})</span>
          <span className="normal-case font-normal flex items-center gap-2">
            <button
              onClick={recalcAllXp}
              disabled={recalcing}
              className="btn-sm btn"
              title="Herbereken XP voor alle spelers via solved-count × gemiddelde XP per oefening"
            >
              {recalcing ? "Bezig…" : "🧮 Recalc XP"}
            </button>
            <button onClick={load} className="text-fg-muted hover:text-fg">↻ Refresh</button>
          </span>
        </div>
        {recalcResult && (
          <div className={recalcResult.startsWith("✓") ? "feedback-ok m-0" : "feedback-err m-0"}>
            {recalcResult}
          </div>
        )}
        {loading && <p className="p-4 text-sm text-fg-dim">Laden…</p>}
        {error && <div className="feedback-err m-0">{error}</div>}
        {!loading && !error && (
          <table className="result">
            <thead>
              <tr>
                <th>Naam</th>
                <th>UID</th>
                <th className="text-right">Exam XP / Opgelost</th>
                <th className="text-right">General XP / Opgelost</th>
                <th>Admin</th>
                <th>Custom tag</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isEd = editing === e.uid;
                return (
                  <tr key={e.uid}>
                    <td className="str">
                      {isEd ? (
                        <input className="input h-6" defaultValue={e.name}
                          onChange={(ev) => setDraft({ ...draft, name: ev.target.value })} />
                      ) : e.name}
                    </td>
                    <td className="font-mono text-fg-dim">{e.uid.slice(0, 8)}…</td>
                    <td className="num">
                      {isEd ? (
                        <span className="flex gap-1 justify-end">
                          <input className="input h-6 w-16" defaultValue={e.exam.xp}
                            onChange={(ev) => setDraft({ ...draft, exam: { xp: +ev.target.value, solved: e.exam.solved } })} />
                          /
                          <input className="input h-6 w-16" defaultValue={e.exam.solved}
                            onChange={(ev) => setDraft({ ...draft, exam: { xp: draft.exam?.xp ?? e.exam.xp, solved: +ev.target.value } })} />
                        </span>
                      ) : `${e.exam.xp} / ${e.exam.solved}`}
                    </td>
                    <td className="num">
                      {isEd ? (
                        <span className="flex gap-1 justify-end">
                          <input className="input h-6 w-16" defaultValue={e.general.xp}
                            onChange={(ev) => setDraft({ ...draft, general: { xp: +ev.target.value, solved: e.general.solved } })} />
                          /
                          <input className="input h-6 w-16" defaultValue={e.general.solved}
                            onChange={(ev) => setDraft({ ...draft, general: { xp: draft.general?.xp ?? e.general.xp, solved: +ev.target.value } })} />
                        </span>
                      ) : `${e.general.xp} / ${e.general.solved}`}
                    </td>
                    <td>
                      <button onClick={() => toggleAdmin(e.uid, !!e.admin)}
                        className={e.admin ? "admin-tag" : "chip"} title="Toggle admin-flag">
                        {e.admin ? "👑 ADMIN" : "speler"}
                      </button>
                    </td>
                    <td>
                      {e.customTag ? (
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => setTagEditor({ uid: e.uid, name: e.name, tag: e.customTag! })}
                          title="Tag bewerken"
                        >
                          <CustomTag tag={e.customTag} />
                        </button>
                      ) : (
                        <button
                          className="btn-sm btn-ghost normal-case text-fg-dim"
                          onClick={() => setTagEditor({ uid: e.uid, name: e.name, tag: { label: "", color: "#3b82f6", emoji: "" } })}
                          title="Nieuwe tag toekennen"
                        >
                          + tag
                        </button>
                      )}
                    </td>
                    <td>
                      <span className="flex gap-1">
                        {isEd ? (
                          <>
                            <button className="btn-sm btn-primary" onClick={() => save(e.uid)}>✓</button>
                            <button className="btn-sm btn" onClick={() => { setEditing(null); setDraft({}); }}>✕</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-sm btn" onClick={() => { setEditing(e.uid); setDraft({}); }}>✎</button>
                            <button className="btn-sm btn" style={{ borderColor: "rgb(var(--err) / 0.4)", color: "rgb(var(--err))" }}
                              onClick={() => del(e.uid, e.name)}>🗑</button>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {tagEditor && (
        <TagEditorModal
          uid={tagEditor.uid}
          name={tagEditor.name}
          initial={tagEditor.tag}
          onCancel={() => setTagEditor(null)}
          onSave={(t) => saveTag(tagEditor.uid, t)}
          onClear={() => saveTag(tagEditor.uid, null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Tag-editor modal
// ──────────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444",
  "#a855f7", "#ec4899", "#06b6d4", "#10b981", "#737373",
];
const PRESET_EMOJIS = ["⭐", "🔥", "💎", "🚀", "🎓", "🧠", "🏆", "⚡", "🥇", "💀", "👑", "🦄", "🐺", "🦊", "🎯", "🪄", "✨"];

function TagEditorModal({
  uid, name, initial, onCancel, onSave, onClear,
}: {
  uid: string;
  name: string;
  initial: CustomTagData;
  onCancel: () => void;
  onSave: (t: CustomTagData) => void;
  onClear: () => void;
}) {
  const [label, setLabel] = useState(initial.label || "");
  const [color, setColor] = useState(initial.color || "#3b82f6");
  const [emoji, setEmoji] = useState(initial.emoji || "");

  const preview: CustomTagData = { label: label || "TAG", color, emoji };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="pane w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="pane-header justify-between">
          <span>Custom tag voor <code className="font-mono normal-case text-fg">{name}</code></span>
          <button onClick={onCancel} className="text-fg-dim hover:text-fg normal-case font-normal text-sm">✕</button>
        </div>
        <div className="p-4 space-y-3">
          {/* Live preview */}
          <div className="text-center py-3 bg-sunken border border-line rounded-sm">
            <div className="text-2xs text-fg-dim uppercase tracking-wider mb-2">Voorbeeld</div>
            <div className="inline-flex items-center gap-2">
              <span className="text-fg">{name}</span>
              <CustomTag tag={preview} />
            </div>
          </div>

          <label className="block">
            <span className="text-2xs uppercase tracking-wider text-fg-dim block mb-1">Naam (max 16)</span>
            <input
              autoFocus
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={16}
              placeholder="VIP"
            />
          </label>

          <div>
            <span className="text-2xs uppercase tracking-wider text-fg-dim block mb-1">Kleur</span>
            <div className="flex items-center gap-2">
              <input
                type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 bg-transparent border border-line rounded-sm cursor-pointer"
              />
              <input
                type="text" value={color} onChange={(e) => setColor(e.target.value)}
                className="input font-mono w-28" maxLength={7}
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-sm border border-line"
                    style={{ background: c, outline: color === c ? "2px solid white" : "none", outlineOffset: 1 }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="text-2xs uppercase tracking-wider text-fg-dim block mb-1">Emoji (optioneel)</span>
            <div className="flex items-center gap-2">
              <input
                type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)}
                className="input w-20 text-center text-base" maxLength={4}
                placeholder="⭐"
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_EMOJIS.map((em) => (
                  <button
                    key={em} type="button"
                    onClick={() => setEmoji(em)}
                    className={`w-7 h-7 rounded-sm border text-base ${emoji === em ? "border-brand" : "border-line"}`}
                  >{em}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-line">
            <button
              className="btn-primary"
              onClick={() => onSave({ label, color, emoji: emoji || undefined })}
              disabled={!label.trim()}
            >✓ Opslaan</button>
            <button className="btn" onClick={onCancel}>Annuleren</button>
            {initial.label && (
              <button
                className="btn ml-auto"
                style={{ borderColor: "rgb(var(--err) / 0.4)", color: "rgb(var(--err))" }}
                onClick={() => confirm("Tag verwijderen?") && onClear()}
              >🗑 Tag verwijderen</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Meldingen versturen
// ──────────────────────────────────────────────────────────────────
function NotifyPanel() {
  const [feed, setFeed] = useState<Notif[]>([]);
  const [players, setPlayers] = useState<{ uid: string; name: string }[]>([]);
  const [sessions, setSessions] = useState<{ sessionId: string; name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Formulier
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "uid" | "session">("all");
  const [targetValue, setTargetValue] = useState("");
  const [kind, setKind] = useState<Notif["kind"]>("info");

  async function load() {
    setLoading(true);
    try {
      const [fRes, pRes, sRes] = await Promise.all([
        fetch("/api/admin/notify", { cache: "no-store" }),
        fetch("/api/leaderboard?mode=exam", { cache: "no-store" }),
        fetch("/api/admin/sessions", { cache: "no-store" }),
      ]);
      const f = await fRes.json();
      const p = await pRes.json();
      const s = await sRes.json();
      if (f.ok) setFeed(f.feed);
      if (p.ok) setPlayers(p.entries.map((e: any) => ({ uid: e.uid, name: e.name })));
      if (s.ok) setSessions(s.sessions.map((x: any) => ({ sessionId: x.sessionId, name: x.name })));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim() && !body.trim()) return;
    if (target !== "all" && !targetValue) {
      alert("Kies een ontvanger.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          target,
          targetValue: target === "all" ? undefined : targetValue,
          kind,
        }),
      });
      if (!r.ok) { alert("Versturen mislukt: " + r.status); return; }
      setTitle(""); setBody("");
      await load();
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Melding verwijderen?")) return;
    await fetch(`/api/admin/notify?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  const KINDS: { v: Notif["kind"]; label: string; color: string }[] = [
    { v: "info",    label: "ℹ Info",     color: "rgb(var(--brand))" },
    { v: "success", label: "✓ Succes",   color: "rgb(var(--ok))" },
    { v: "warning", label: "⚠ Let op",   color: "rgb(var(--warn))" },
    { v: "error",   label: "✕ Fout",     color: "rgb(var(--err))" },
  ];

  return (
    <div className="p-4 grid lg:grid-cols-2 gap-3">
      {/* Compose */}
      <form className="pane" onSubmit={send}>
        <div className="pane-header"><span>Nieuwe melding</span></div>
        <div className="p-4 space-y-3">
          <div>
            <span className="text-2xs uppercase tracking-wider text-fg-dim block mb-1">Ontvanger</span>
            <div className="flex gap-2">
              <select className="input w-32" value={target} onChange={(e) => { setTarget(e.target.value as any); setTargetValue(""); }}>
                <option value="all">📢 Alle gebruikers</option>
                <option value="uid">👤 Speler (UID)</option>
                <option value="session">🔗 Sessie</option>
              </select>
              {target === "uid" && (
                <select className="input flex-1" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
                  <option value="">— kies speler —</option>
                  {players.map((p) => (
                    <option key={p.uid} value={p.uid}>{p.name} ({p.uid.slice(0, 8)})</option>
                  ))}
                </select>
              )}
              {target === "session" && (
                <select className="input flex-1" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
                  <option value="">— kies sessie —</option>
                  {sessions.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      {s.name ?? "anoniem"} · {s.sessionId.slice(0, 8)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <span className="text-2xs uppercase tracking-wider text-fg-dim block mb-1">Type</span>
            <div className="flex gap-1">
              {KINDS.map((k) => (
                <button
                  key={k.v} type="button"
                  onClick={() => setKind(k.v)}
                  className="px-2 h-7 text-xs rounded-sm border transition-colors"
                  style={{
                    color: k.color,
                    borderColor: kind === k.v ? k.color : "rgb(var(--line))",
                    background: kind === k.v ? `${k.color.replace("rgb", "rgba").replace(")", " / 0.10)")}` : "transparent",
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-2xs uppercase tracking-wider text-fg-dim block mb-1">Titel (optioneel · max 80)</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
              placeholder="Bv. Nieuwe oefeningen toegevoegd!" />
          </label>

          <label className="block">
            <span className="text-2xs uppercase tracking-wider text-fg-dim block mb-1">Bericht (max 500)</span>
            <textarea
              className="w-full bg-sunken border border-line text-fg p-2 text-xs font-mono focus:outline-none focus:border-brand rounded-sm"
              rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500}
              placeholder="Stuur een bericht naar je gebruikers…"
            />
            <div className="text-2xs text-fg-dim text-right mt-0.5">{body.length}/500</div>
          </label>

          <div className="flex gap-2 items-center">
            <button type="submit" className="btn-primary" disabled={busy || (!title.trim() && !body.trim())}>
              {busy ? "Versturen…" : "📨 Versturen"}
            </button>
            <span className="text-2xs text-fg-dim">
              {target === "all" ? "Iedereen krijgt deze melding" :
               target === "uid" ? "Enkel deze speler krijgt het" :
               "Enkel deze sessie krijgt het"}
            </span>
          </div>
        </div>
      </form>

      {/* Recente meldingen */}
      <div className="pane">
        <div className="pane-header">
          <span>Recente meldingen ({feed.length})</span>
          <button onClick={load} className="normal-case font-normal text-fg-muted hover:text-fg">↻</button>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-fg-dim">Laden…</p>
        ) : feed.length === 0 ? (
          <p className="p-4 text-sm text-fg-dim">Nog geen meldingen verstuurd.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-line">
            {feed.map((n) => {
              const color = n.kind === "info" ? "rgb(var(--brand))" :
                            n.kind === "success" ? "rgb(var(--ok))" :
                            n.kind === "warning" ? "rgb(var(--warn))" :
                            "rgb(var(--err))";
              const icon = n.kind === "info" ? "ℹ" : n.kind === "success" ? "✓" : n.kind === "warning" ? "⚠" : "✕";
              const targetLabel = n.target === "all"
                ? "📢 alle gebruikers"
                : n.target === "uid"
                ? `👤 ${players.find((p) => p.uid === n.targetValue)?.name ?? n.targetValue?.slice(0, 8)}`
                : `🔗 sessie ${n.targetValue?.slice(0, 8)}`;
              return (
                <div key={n.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <span style={{ color }} className="text-base shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      {n.title && <div className="font-semibold text-sm">{n.title}</div>}
                      {n.body && <div className="text-2xs text-fg-muted whitespace-pre-wrap">{n.body}</div>}
                      <div className="text-2xs text-fg-dim mt-1 font-mono">
                        {new Date(n.ts).toLocaleString("nl-BE")} · {targetLabel}
                      </div>
                    </div>
                    <button
                      onClick={() => del(n.id)}
                      className="btn-sm btn shrink-0"
                      style={{ borderColor: "rgb(var(--err) / 0.4)", color: "rgb(var(--err))" }}
                      title="Verwijderen"
                    >🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
