"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/adminClient";

type Entry = {
  uid: string;
  name: string;
  exam: { xp: number; solved: number };
  general: { xp: number; solved: number };
  updatedAt: number;
  admin?: boolean;
};

export default function AdminPage() {
  const admin = useAdmin();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { admin.check(); }, []);

  if (!admin.checked) {
    return <div className="p-6 text-fg-dim">Sessie controleren…</div>;
  }

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
                autoFocus
                type="password"
                value={pw}
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

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Entry>>({});

  async function load() {
    setLoading(true);
    setError(null);
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
    if (r.ok) load();
    else alert("Verwijderen mislukt: " + r.status);
  }

  async function save(uid: string) {
    const r = await fetch("/api/leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, ...draft }),
    });
    if (r.ok) {
      setEditing(null);
      setDraft({});
      load();
    } else {
      alert("Wijzigen mislukt: " + r.status);
    }
  }

  async function toggleAdmin(uid: string, current: boolean) {
    const r = await fetch("/api/leaderboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, admin: !current }),
    });
    if (r.ok) load();
  }

  return (
    <div className="p-4 space-y-3">
      <div className="title-bar -m-4 mb-0 justify-between">
        <span>🔐 Admin · Leaderboard beheer</span>
        <button onClick={onLogout} className="btn-sm btn normal-case font-normal">Uitloggen</button>
      </div>

      <div className="pane">
        <div className="pane-header">
          <span>Spelers ({entries.length})</span>
          <button onClick={load} className="normal-case font-normal text-fg-muted hover:text-fg">↻ Refresh</button>
        </div>
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
                <th>Tag</th>
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
                        <input
                          className="input h-6"
                          defaultValue={e.name}
                          onChange={(ev) => setDraft({ ...draft, name: ev.target.value })}
                        />
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
                      <button
                        onClick={() => toggleAdmin(e.uid, !!e.admin)}
                        className={e.admin ? "admin-tag" : "chip"}
                        title="Toggle admin-flag"
                      >
                        {e.admin ? "👑 ADMIN" : "speler"}
                      </button>
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

      <div className="pane">
        <div className="pane-header"><span>Info</span></div>
        <ul className="p-3 text-xs text-fg-muted list-disc list-inside space-y-1">
          <li>Wanneer jij (als admin) op het leaderboard synct krijg je automatisch de <span className="admin-tag">👑 ADMIN</span> tag.</li>
          <li>Je kan andere spelers ook handmatig promoten/demoten via de tag-knop.</li>
          <li>Sessie verloopt na 7 dagen.</li>
          <li>Na 5 foute logins: 15 min IP-lockout.</li>
        </ul>
      </div>
    </div>
  );
}
