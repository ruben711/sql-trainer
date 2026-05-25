import { NextRequest } from "next/server";
import { signAdminToken, setCookieHeader } from "@/lib/adminAuth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const PASSWORD = process.env.ADMIN_PASSWORD;

// Eenvoudige in-memory anti-brute-force per IP
const attempts = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!PASSWORD || !process.env.ADMIN_SECRET) {
    return Response.json({ ok: false, error: "admin_not_configured" }, { status: 503 });
  }

  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "0.0.0.0";

  const rec = attempts.get(ip);
  const now = Date.now();
  if (rec && rec.lockUntil > now) {
    return Response.json({ ok: false, error: "locked", retryAfter: rec.lockUntil - now }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  if (typeof body?.password !== "string" || body.password !== PASSWORD) {
    const next = (rec?.count ?? 0) + 1;
    attempts.set(ip, {
      count: next,
      lockUntil: next >= MAX_ATTEMPTS ? now + LOCK_MS : 0,
    });
    // Subtiele random delay
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    return Response.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  attempts.delete(ip);
  const token = await signAdminToken();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": setCookieHeader(token),
    },
  });
}
