import { NextRequest } from "next/server";
import { getJson, setJson, isConfigured } from "@/lib/upstash";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const SECRET = process.env.LOG_SECRET;

// Per-instance rate limit
const buckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS = 60 * 1000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= RATE_LIMIT) return false;
  b.count++;
  return true;
}

type EventBody = {
  event: string;
  sessionId: string;
  uid?: string | null;
  name?: string | null;
  data?: Record<string, any>;
};

const COLORS: Record<string, number> = {
  visitor: 0x3b82f6, mode_changed: 0x8b5cf6,
  exercise_view: 0x6b7280, exercise_completed: 0x22c55e, exercise_failed: 0xef4444,
  exam_started: 0xeab308, exam_completed: 0xf97316,
};
const TITLES: Record<string, string> = {
  visitor: "👤 Nieuwe bezoeker", mode_changed: "🔀 Modus gewisseld",
  exercise_view: "👁️ Oefening geopend",
  exercise_completed: "✅ Oefening opgelost", exercise_failed: "❌ Oefening fout",
  exam_started: "🏁 Examen gestart", exam_completed: "🎯 Examen voltooid",
};

function hashIp(ip: string): string {
  if (ip.includes(".")) return ip.split(".").slice(0, 2).join(".") + ".x.x";
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + "::xxxx";
  return ip;
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type SessionRecord = {
  sessionId: string;
  uid: string | null;
  name: string | null;
  firstSeenAt: number;
  lastEventAt: number;
  lastEvent: string;
  lastData: Record<string, any> | null;
  ip: string;
  geo: { country: string; region: string; city: string };
  ua: string;
  mode: "exam" | "general" | null;
  currentExercise: string | null;
  recentEvents: { event: string; data: Record<string, any> | null; ts: number }[];
};

async function persistSession(body: EventBody, ctx: { ip: string; ua: string; geo: any }) {
  if (!isConfigured) return;
  const key = `sess:${body.sessionId}`;
  const existing = (await getJson<SessionRecord>(key)) || null;

  const now = Date.now();
  const newEvent = { event: body.event, data: body.data ?? null, ts: now };
  const recentEvents = [...(existing?.recentEvents ?? []), newEvent].slice(-20);

  let mode = existing?.mode ?? null;
  let currentExercise = existing?.currentExercise ?? null;
  if (body.event === "mode_changed" && body.data?.mode) mode = body.data.mode;
  if (body.event === "exercise_view" && body.data?.id) currentExercise = body.data.id;
  if (body.event === "exercise_completed" || body.event === "exercise_failed") {
    if (body.data?.id) currentExercise = body.data.id;
    if (body.data?.mode) mode = body.data.mode;
  }

  const rec: SessionRecord = {
    sessionId: body.sessionId,
    uid: body.uid || existing?.uid || null,
    name: body.name || existing?.name || null,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastEventAt: now,
    lastEvent: body.event,
    lastData: body.data ?? null,
    ip: ctx.ip,
    geo: ctx.geo,
    ua: ctx.ua,
    mode,
    currentExercise,
    recentEvents,
  };
  await setJson(key, rec);

  // Update index voor admin-listing
  const idx = (await getJson<Record<string, number>>("sess:index")) || {};
  idx[body.sessionId] = now;
  const cutoff = now - SESSION_TTL_MS;
  // Snoei oude sessies + cap op 500 nieuwste
  const entries = Object.entries(idx).filter(([, ts]) => ts >= cutoff);
  entries.sort((a, b) => b[1] - a[1]);
  const trimmed: Record<string, number> = {};
  for (const [sid, ts] of entries.slice(0, 500)) trimmed[sid] = ts;
  await setJson("sess:index", trimmed);
}

export async function POST(req: NextRequest) {
  if (SECRET && req.headers.get("x-log-secret") !== SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "0.0.0.0";

  if (!rateLimit(ip)) {
    return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), { status: 429 });
  }

  let body: EventBody;
  try { body = await req.json(); }
  catch { return new Response("Bad JSON", { status: 400 }); }

  if (!body.event || !body.sessionId) {
    return new Response("Missing fields", { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "unknown";
  const ref = req.headers.get("referer") || "—";
  const country = req.headers.get("x-vercel-ip-country") || "";
  const city = req.headers.get("x-vercel-ip-city") || "";
  const region = req.headers.get("x-vercel-ip-country-region") || "";
  const geo = { country, region, city };
  const hashedIp = hashIp(ip);

  // 1) Persist sessie in Redis (best-effort, niet blocking voor Discord)
  try {
    await persistSession(body, { ip: hashedIp, ua, geo });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("persistSession failed", e);
  }

  // 2) Discord webhook (indien geconfigureerd)
  if (WEBHOOK) {
    const fields: { name: string; value: string; inline?: boolean }[] = [];
    if (body.data) {
      for (const [k, v] of Object.entries(body.data)) {
        fields.push({
          name: k,
          value: "```" + String(v).slice(0, 1000) + "```",
          inline: typeof v !== "object" && String(v).length < 30,
        });
      }
    }
    if (body.name) fields.push({ name: "Naam", value: body.name, inline: true });
    fields.push({ name: "IP (gehasht)", value: hashedIp, inline: true });
    const geoStr = [city, region, country].filter(Boolean).join(", ") || "—";
    fields.push({ name: "Locatie", value: geoStr, inline: true });
    fields.push({ name: "Sessie", value: body.sessionId.slice(0, 8), inline: true });
    fields.push({ name: "User-Agent", value: ua.slice(0, 200) });
    if (ref !== "—") fields.push({ name: "Referer", value: ref.slice(0, 200) });

    const embed = {
      title: TITLES[body.event] || body.event,
      color: COLORS[body.event] ?? 0x6b7280,
      timestamp: new Date().toISOString(),
      fields,
      footer: { text: "SQL Trainer · Vercel Edge" },
    };
    try {
      await fetch(WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch { /* niet kritiek */ }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
