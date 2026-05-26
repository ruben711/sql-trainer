import { NextRequest } from "next/server";
import { getJson, setJson, isConfigured } from "@/lib/upstash";
import { isAdminRequest } from "@/lib/adminAuth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const KEY = "lb:v1";
const MAX_ENTRIES = 500;
const MAX_NAME_LEN = 24;

type ModeStats = { xp: number; solved: number };
type CustomTag = { label: string; color: string; emoji?: string };
type NameStyle = {
  color?: string;
  gradient?: { from: string; to: string; angle?: number };
  glow?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  font?: "default" | "mono" | "serif" | "cursive" | "display" | "minecraft" | "terminal";
  sparkle?: boolean;
  rainbow?: boolean;
  pulse?: boolean;
  shake?: boolean;
  snow?: boolean;
  orbit?: boolean;
  fire?: boolean;
  stars?: boolean;
  hearts?: boolean;
};
type Entry = {
  uid: string;
  name: string;
  exam: ModeStats;
  general: ModeStats;
  updatedAt: number;
  admin?: boolean;
  customTag?: CustomTag | null;
  nameStyle?: NameStyle | null;
};

function sanitizeName(s: string): string {
  return String(s || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, MAX_NAME_LEN) || "Anoniem";
}

function isHex(s: any): boolean {
  return typeof s === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
}

function sanitizeNameStyle(s: any): NameStyle | null {
  if (!s) return null;
  const out: NameStyle = {};
  if (isHex(s.color)) out.color = s.color;
  if (s.gradient && isHex(s.gradient.from) && isHex(s.gradient.to)) {
    out.gradient = {
      from: s.gradient.from,
      to: s.gradient.to,
      angle: Number.isFinite(Number(s.gradient.angle)) ? Math.max(0, Math.min(360, Math.floor(Number(s.gradient.angle)))) : 90,
    };
  }
  if (isHex(s.glow)) out.glow = s.glow;
  if (s.bold)      out.bold = true;
  if (s.italic)    out.italic = true;
  if (s.underline) out.underline = true;
  if (s.strike)    out.strike = true;
  if (["default", "mono", "serif", "cursive", "display", "minecraft", "terminal"].includes(s.font)) out.font = s.font;
  if (s.sparkle) out.sparkle = true;
  if (s.rainbow) out.rainbow = true;
  if (s.pulse)   out.pulse = true;
  if (s.shake)   out.shake = true;
  if (s.snow)    out.snow = true;
  if (s.orbit)   out.orbit = true;
  if (s.fire)    out.fire = true;
  if (s.stars)   out.stars = true;
  if (s.hearts)  out.hearts = true;
  return Object.keys(out).length === 0 ? null : out;
}

function sanitizeTag(t: any): CustomTag | null {
  if (!t) return null;
  const label = String(t.label || "").replace(/[<>]/g, "").trim().slice(0, 16);
  if (!label) return null;
  // Hex kleur valideren (#fff of #ffffff)
  const colorRaw = String(t.color || "#3b82f6").trim();
  const color = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorRaw) ? colorRaw : "#3b82f6";
  // Emoji: max 4 code units (volstaat voor 1-2 emoji's incl. ZWJ-sequenties beperkt)
  const emoji = String(t.emoji || "").trim().slice(0, 8) || undefined;
  return { label, color, emoji };
}

function clampStats(o: any): ModeStats {
  return {
    xp: Math.max(0, Math.floor(Number(o?.xp) || 0)),
    solved: Math.max(0, Math.floor(Number(o?.solved) || 0)),
  };
}

// ─── GET ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isConfigured) {
    return Response.json({ ok: false, error: "storage_not_configured", entries: [] }, { status: 503 });
  }
  const list = (await getJson<Entry[]>(KEY)) || [];
  const sortMode = (req.nextUrl.searchParams.get("mode") || "exam") as "exam" | "general";
  const sorted = [...list].sort(
    (a, b) => (b[sortMode]?.xp ?? 0) - (a[sortMode]?.xp ?? 0)
  );
  return Response.json({
    ok: true,
    total: list.length,
    entries: sorted.slice(0, 200),
    updatedAt: Date.now(),
  });
}

// ─── POST (upsert eigen score) ─────────────────────────────────────
const submissions = new Map<string, number>();

export async function POST(req: NextRequest) {
  if (!isConfigured) {
    return Response.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  }
  let body: any;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const uid: string = String(body?.uid || "").trim();
  const name = sanitizeName(body?.name);
  if (!uid || uid.length < 8 || uid.length > 64) return new Response("Invalid uid", { status: 400 });

  const now = Date.now();
  const last = submissions.get(uid) || 0;
  if (now - last < 5_000) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  submissions.set(uid, now);

  const exam = clampStats(body?.exam);
  const general = clampStats(body?.general);

  const isAdmin = await isAdminRequest(req);

  const list = (await getJson<Entry[]>(KEY)) || [];
  const idx = list.findIndex((e) => e.uid === uid);
  const existing = idx >= 0 ? list[idx] : null;
  const entry: Entry = {
    uid, name, exam, general, updatedAt: now,
    admin: isAdmin || existing?.admin || false,
    // Belangrijk: customTag bewaren bij re-sync, anders wordt admin-toegekende tag overschreven.
    customTag: existing?.customTag ?? null,
    nameStyle: existing?.nameStyle ?? null,
  };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);

  if (list.length > MAX_ENTRIES) {
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    list.length = MAX_ENTRIES;
  }
  await setJson(KEY, list);
  return Response.json({ ok: true, entry });
}

// ─── PATCH (admin only — edit naam / stats / admin-flag) ──────────
export async function PATCH(req: NextRequest) {
  if (!isConfigured) return Response.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  if (!(await isAdminRequest(req))) return new Response("Forbidden", { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const uid = String(body?.uid || "").trim();
  if (!uid) return new Response("Missing uid", { status: 400 });

  const list = (await getJson<Entry[]>(KEY)) || [];
  const idx = list.findIndex((e) => e.uid === uid);
  if (idx < 0) return new Response("Not found", { status: 404 });

  const cur = list[idx];
  list[idx] = {
    ...cur,
    name: body.name !== undefined ? sanitizeName(body.name) : cur.name,
    exam: body.exam !== undefined ? clampStats(body.exam) : cur.exam,
    general: body.general !== undefined ? clampStats(body.general) : cur.general,
    admin: body.admin !== undefined ? Boolean(body.admin) : cur.admin,
    customTag:
      body.customTag === null ? null :
      body.customTag !== undefined ? sanitizeTag(body.customTag) :
      cur.customTag,
    nameStyle:
      body.nameStyle === null ? null :
      body.nameStyle !== undefined ? sanitizeNameStyle(body.nameStyle) :
      cur.nameStyle,
    updatedAt: Date.now(),
  };
  await setJson(KEY, list);
  return Response.json({ ok: true, entry: list[idx] });
}

// ─── DELETE (admin only) ──────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!isConfigured) return Response.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
  if (!(await isAdminRequest(req))) return new Response("Forbidden", { status: 403 });

  const uid = req.nextUrl.searchParams.get("uid");
  if (!uid) return new Response("Missing uid", { status: 400 });

  const list = (await getJson<Entry[]>(KEY)) || [];
  const next = list.filter((e) => e.uid !== uid);
  if (next.length === list.length) return new Response("Not found", { status: 404 });
  await setJson(KEY, next);
  return Response.json({ ok: true, removed: uid });
}
