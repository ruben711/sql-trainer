import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const SECRET = process.env.LOG_SECRET; // optioneel — voorkomt random POSTs van anderen

// Simpele in-memory rate limit per Edge instance (geen perfecte oplossing,
// maar genoeg om misbruik te dempen op hobbyschaal).
const buckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;        // requests per window
const WINDOW_MS = 60 * 1000;  // 1 minuut

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
  event:
    | "visitor"
    | "mode_changed"
    | "exercise_view"
    | "exercise_completed"
    | "exercise_failed"
    | "exam_started"
    | "exam_completed";
  sessionId: string;
  data?: Record<string, any>;
};

const COLORS = {
  visitor: 0x3b82f6,
  mode_changed: 0x8b5cf6,
  exercise_view: 0x6b7280,
  exercise_completed: 0x22c55e,
  exercise_failed: 0xef4444,
  exam_started: 0xeab308,
  exam_completed: 0xf97316,
} as const;

const TITLES = {
  visitor: "👤 Nieuwe bezoeker",
  mode_changed: "🔀 Modus gewisseld",
  exercise_view: "👁️ Oefening geopend",
  exercise_completed: "✅ Oefening opgelost",
  exercise_failed: "❌ Oefening fout",
  exam_started: "🏁 Examen gestart",
  exam_completed: "🎯 Examen voltooid",
} as const;

function hashIp(ip: string): string {
  // Lichte privacy: alleen eerste 2 octets (IPv4) of /48 (IPv6)
  if (ip.includes(".")) return ip.split(".").slice(0, 2).join(".") + ".x.x";
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + "::xxxx";
  return ip;
}

export async function POST(req: NextRequest) {
  if (!WEBHOOK) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_webhook_configured" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
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
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!body.event || !body.sessionId) {
    return new Response("Missing fields", { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "unknown";
  const ref = req.headers.get("referer") || "—";
  const country = req.headers.get("x-vercel-ip-country") || "";
  const city = req.headers.get("x-vercel-ip-city") || "";
  const region = req.headers.get("x-vercel-ip-country-region") || "";
  const geo = [city, region, country].filter(Boolean).join(", ") || "—";

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
  fields.push({ name: "IP (gehasht)", value: hashIp(ip), inline: true });
  fields.push({ name: "Locatie", value: geo, inline: true });
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
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: `discord_${res.status}` }), { status: 502 });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
