import { NextRequest } from "next/server";
import { getJson, isConfigured } from "@/lib/upstash";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/** Publieke endpoint — gebruikers polleren hier voor hun notificaties.
 *  Filtert server-side op uid/session, zodat client niet alle notificaties ziet. */
export async function GET(req: NextRequest) {
  if (!isConfigured) return Response.json({ ok: true, items: [] });

  const uid = req.nextUrl.searchParams.get("uid") || "";
  const sid = req.nextUrl.searchParams.get("sid") || "";
  const sinceParam = Number(req.nextUrl.searchParams.get("since") || 0);

  const feed = (await getJson<any[]>("notif:feed")) || [];
  const items = feed.filter((n) => {
    if (sinceParam && n.ts <= sinceParam) return false;
    if (n.target === "all") return true;
    if (n.target === "uid" && uid && n.targetValue === uid) return true;
    if (n.target === "session" && sid && n.targetValue === sid) return true;
    return false;
  });
  return Response.json({ ok: true, items, now: Date.now() });
}
