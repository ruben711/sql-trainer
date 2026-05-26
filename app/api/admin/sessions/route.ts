import { NextRequest } from "next/server";
import { getJson, mgetJson, isConfigured } from "@/lib/upstash";
import { isAdminRequest } from "@/lib/adminAuth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return new Response("Forbidden", { status: 403 });
  if (!isConfigured) {
    return Response.json({ ok: false, error: "storage_not_configured", sessions: [] }, { status: 503 });
  }

  const idx = (await getJson<Record<string, number>>("sess:index")) || {};
  const sorted = Object.entries(idx).sort((a, b) => b[1] - a[1]);
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 100), 200);
  const sids = sorted.slice(0, limit).map(([sid]) => sid);
  if (sids.length === 0) return Response.json({ ok: true, sessions: [], now: Date.now() });

  const keys = sids.map((sid) => `sess:${sid}`);
  const sessions = (await mgetJson(keys)).filter(Boolean);
  return Response.json({ ok: true, sessions, now: Date.now() });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return new Response("Forbidden", { status: 403 });
  if (!isConfigured) return new Response("storage_not_configured", { status: 503 });

  const sid = req.nextUrl.searchParams.get("sid");
  if (!sid) return new Response("Missing sid", { status: 400 });

  // We hebben geen DEL in onze upstash-helper, dus via raw fetch:
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return new Response("storage_not_configured", { status: 503 });

  await fetch(`${url}/DEL/${encodeURIComponent("sess:" + sid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Verwijder ook uit de index
  const { getJson, setJson } = await import("@/lib/upstash");
  const idx = (await getJson<Record<string, number>>("sess:index")) || {};
  delete idx[sid];
  await setJson("sess:index", idx);

  return Response.json({ ok: true });
}
