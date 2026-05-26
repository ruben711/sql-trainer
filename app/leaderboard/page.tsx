"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIdentity } from "@/lib/identity";
import { useProgress } from "@/lib/store";
import { useMode, MODES } from "@/lib/modes";
import { useAdmin } from "@/lib/adminClient";
import CustomTag from "@/components/CustomTag";
import clsx from "clsx";

type ModeKey = "exam" | "general";
type Entry = {
  uid: string;
  name: string;
  exam: { xp: number; solved: number };
  general: { xp: number; solved: number };
  updatedAt: number;
  admin?: boolean;
  customTag?: { label: string; color: string; emoji?: string } | null;
};

function levelOf(xp: number) {
  let lvl = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.25); }
  return lvl;
}

export default function LeaderboardPage() {
  const mode = useMode((s) => s.mode);
  const byMode = useProgress((s) => s.byMode);
  const id = useIdentity();
  const admin = useAdmin();
  useEffect(() => { id.ensure(); admin.check(); }, []);

  const [tab, setTab] = useState<ModeKey>(mode);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [serverState, setServerState] = useState<"ok" | "unconfigured" | "error" | "loading">("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [askName, setAskName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [syncing, setSyncing] = useState(false);

  // ─── Server data ophalen ────────────────────────────────────────
  const fetchBoard = useCallback(async (m: ModeKey) => {
    setServerState("loading");
    try {
      const r = await fetch(`/api/leaderboard?mode=${m}`, { cache: "no-store" });
      const j = await r.json();
      if (j.error === "storage_not_configured") {
        setServerState("unconfigured");
        return;
      }
      if (!j.ok) {
        setErrMsg(j.error || "unknown");
        setServerState("error");
        return;
      }
      setEntries(j.entries);
      setServerState("ok");
    } catch (e: any) {
      setErrMsg(String(e?.message ?? e));
      setServerState("error");
    }
  }, []);

  useEffect(() => { fetchBoard(tab); }, [tab, fetchBoard]);

  // ─── Eerste keer? Vraag naam ─────────────────────────────────────
  useEffect(() => {
    if (!id.uid) return;
    if (!id.hasJoinedBoard) {
      setNameDraft(id.randomName());
      setAskName(true);
    }
  }, [id.uid]);

  async function syncMyScore(nameOverride?: string) {
    setSyncing(true);
    try {
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: id.uid,
          name: nameOverride ?? id.name ?? id.randomName(),
          exam: { xp: byMode.exam.xp, solved: Object.keys(byMode.exam.solved).length },
          general: { xp: byMode.general.xp, solved: Object.keys(byMode.general.solved).length },
        }),
      });
      await fetchBoard(tab);
    } finally {
      setSyncing(false);
    }
  }

  function confirmName() {
    const n = (nameDraft.trim() || id.randomName()).slice(0, 24);
    id.set(n);
    setAskName(false);
    syncMyScore(n);
  }
  function skipName() {
    const n = id.randomName();
    id.set(n);
    setAskName(false);
    syncMyScore(n);
  }

  // ─── Render ──────────────────────────────────────────────────────
  const myEntry = useMemo(() => entries?.find((e) => e.uid === id.uid), [entries, id.uid]);
  const myXp = byMode[tab].xp;
  const mySolved = Object.keys(byMode[tab].solved).length;
  const myRank = useMemo(() => {
    if (!entries) return null;
    const rank = entries.findIndex((e) => e.uid === id.uid);
    return rank >= 0 ? rank + 1 : null;
  }, [entries, id.uid]);

  return (
    <div className="p-4 space-y-3">
      <div className="title-bar -m-4 mb-0 justify-between">
        <span>Leaderboard</span>
        <span className="normal-case font-normal text-fg-dim">
          {entries ? `${entries.length} spelers` : ""}
        </span>
      </div>

      {/* Mode-tabs */}
      <div className="tabbar -mx-4">
        {(["exam", "general"] as ModeKey[]).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={`tab ${tab === m ? "tab-active" : ""}`}
          >
            <span>{MODES[m].icon}</span>
            <span>{m === "exam" ? "Examen DB" : "Algemene SQL"}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-2">
          {id.name && (
            <span className="text-2xs text-fg-dim">
              jij speelt als <span className="font-mono text-fg">{id.name}</span>
            </span>
          )}
          <button className="btn-sm btn" onClick={() => syncMyScore()} disabled={syncing || serverState !== "ok"}>
            {syncing ? "Bezig…" : "↻ Sync mijn score"}
          </button>
          <button
            className="btn-sm btn-ghost"
            onClick={() => { setNameDraft(id.name || id.randomName()); setAskName(true); }}
          >
            Naam wijzigen
          </button>
        </div>
      </div>

      {/* Mijn score */}
      <div className="pane">
        <div className="pane-header">
          <span>Mijn score · {tab === "exam" ? "Examen DB" : "Algemene SQL"}</span>
          {myRank && <span className="normal-case font-normal text-fg">positie #{myRank}</span>}
        </div>
        <div className="grid grid-cols-4 text-center divide-x divide-line">
          <div className="px-2 py-3"><div className="text-2xs uppercase text-fg-dim">Naam</div><div className="font-mono text-fg mt-1">{id.name ?? "—"}</div></div>
          <div className="px-2 py-3"><div className="text-2xs uppercase text-fg-dim">XP</div><div className="font-mono text-fg text-lg mt-1">{myXp}</div></div>
          <div className="px-2 py-3"><div className="text-2xs uppercase text-fg-dim">Niveau</div><div className="font-mono text-fg text-lg mt-1">{levelOf(myXp)}</div></div>
          <div className="px-2 py-3"><div className="text-2xs uppercase text-fg-dim">Opgelost</div><div className="font-mono text-fg text-lg mt-1">{mySolved}</div></div>
        </div>
        {myEntry && (myEntry[tab].xp !== myXp || myEntry[tab].solved !== mySolved) && (
          <div className="feedback-warn">
            Je server-score wijkt af van je lokale score — klik <strong>↻ Sync mijn score</strong> om bij te werken.
          </div>
        )}
      </div>

      {/* Ranking-tabel */}
      <div className="pane">
        <div className="pane-header"><span>Top spelers</span></div>
        {serverState === "loading" && (
          <p className="p-4 text-sm text-fg-dim">Leaderboard laden…</p>
        )}
        {serverState === "unconfigured" && (
          <div className="feedback-warn m-0">
            <strong>Leaderboard nog niet actief.</strong> De server-storage (Upstash Redis) is niet
            geconfigureerd. Zet <code className="font-mono">UPSTASH_REDIS_REST_URL</code> en
            <code className="font-mono"> UPSTASH_REDIS_REST_TOKEN</code> in Vercel-env vars en redeploy.
            Lokaal: zet ze in <code className="font-mono">.env.local</code>.
          </div>
        )}
        {serverState === "error" && (
          <div className="feedback-err m-0">Kon leaderboard niet laden: {errMsg}</div>
        )}
        {serverState === "ok" && entries && entries.length === 0 && (
          <p className="p-4 text-sm text-fg-dim">Nog geen scores. Wees de eerste!</p>
        )}
        {serverState === "ok" && entries && entries.length > 0 && (
          <table className="result">
            <thead>
              <tr>
                <th className="w-12 text-right">#</th>
                <th>Speler</th>
                <th className="text-right">XP</th>
                <th className="text-right">Niveau</th>
                <th className="text-right">Opgelost</th>
                <th className="text-right">Laatst actief</th>
                {admin.isAdmin && <th>Admin</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const me = e.uid === id.uid;
                const xp = e[tab].xp;
                const solved = e[tab].solved;
                return (
                  <tr key={e.uid} className={me ? "bg-brand/10" : ""}>
                    <td className="text-right text-fg-dim">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className={clsx("str", me && "font-bold")}>
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        {e.name}
                        {e.admin && <span className="admin-tag">👑 ADMIN</span>}
                        {e.customTag && <CustomTag tag={e.customTag} />}
                        {me && <span className="chip">jij</span>}
                      </span>
                    </td>
                    <td className="num">{xp}</td>
                    <td className="num">{levelOf(xp)}</td>
                    <td className="num">{solved}</td>
                    <td className="text-right text-fg-dim">{new Date(e.updatedAt).toLocaleString("nl-BE")}</td>
                    {admin.isAdmin && (
                      <td>
                        <span className="flex gap-1">
                          <button
                            className="btn-sm btn"
                            title="Naam wijzigen"
                            onClick={async () => {
                              const n = prompt("Nieuwe naam:", e.name);
                              if (!n) return;
                              await fetch("/api/leaderboard", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ uid: e.uid, name: n }),
                              });
                              fetchBoard(tab);
                            }}
                          >✎</button>
                          <button
                            className="btn-sm btn"
                            style={{ borderColor: "rgb(var(--err) / 0.4)", color: "rgb(var(--err))" }}
                            title="Verwijderen"
                            onClick={async () => {
                              if (!confirm(`Verwijder "${e.name}"?`)) return;
                              await fetch(`/api/leaderboard?uid=${encodeURIComponent(e.uid)}`, { method: "DELETE" });
                              fetchBoard(tab);
                            }}
                          >🗑</button>
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Naam-modal */}
      {askName && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm" onClick={skipName}>
          <div
            className="pane max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pane-header"><span>Welkom op het leaderboard</span></div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-fg-muted">
                Kies een naam die op het leaderboard zal verschijnen. Laat leeg of druk
                <em> Annuleren</em> om een willekeurige naam te krijgen.
              </p>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmName()}
                maxLength={24}
                className="input text-base h-9"
                placeholder={id.randomName()}
              />
              <div className="flex items-center gap-2">
                <button className="btn-primary" onClick={confirmName}>Doe mee</button>
                <button className="btn" onClick={skipName}>Annuleren (random naam)</button>
                <span className="text-2xs text-fg-dim ml-auto">max 24 tekens</span>
              </div>
              <p className="text-2xs text-fg-dim">
                Je bestaande XP en opgeloste oefeningen worden meteen geüpload.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
