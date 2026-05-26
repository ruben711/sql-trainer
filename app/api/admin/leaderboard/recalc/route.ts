import { NextRequest } from "next/server";
import { getJson, setJson, isConfigured } from "@/lib/upstash";
import { isAdminRequest } from "@/lib/adminAuth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const KEY = "lb:v1";

/** Flat XP: 25 per opgeloste oefening, ongeacht moeilijkheid. */
const XP_PER_SOLVE = 25;

type ModeStats = { xp: number; solved: number };
type Entry = {
  uid: string;
  name: string;
  exam: ModeStats;
  general: ModeStats;
  updatedAt: number;
  admin?: boolean;
  customTag?: any;
};

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return new Response("Forbidden", { status: 403 });
  if (!isConfigured) return Response.json({ ok: false, error: "storage_not_configured" }, { status: 503 });

  const list = (await getJson<Entry[]>(KEY)) || [];
  let changed = 0;
  const sample: { uid: string; name: string; oldExam: number; newExam: number; oldGen: number; newGen: number }[] = [];

  for (const e of list) {
    const newExamXp = (e.exam?.solved ?? 0) * XP_PER_SOLVE;
    const newGenXp = (e.general?.solved ?? 0) * XP_PER_SOLVE;
    if (newExamXp !== e.exam?.xp || newGenXp !== e.general?.xp) {
      if (sample.length < 10) {
        sample.push({
          uid: e.uid, name: e.name,
          oldExam: e.exam?.xp ?? 0, newExam: newExamXp,
          oldGen: e.general?.xp ?? 0, newGen: newGenXp,
        });
      }
      e.exam = { ...e.exam, xp: newExamXp };
      e.general = { ...e.general, xp: newGenXp };
      e.updatedAt = Date.now();
      changed++;
    }
  }

  if (changed > 0) await setJson(KEY, list);

  return Response.json({
    ok: true,
    total: list.length,
    changed,
    xpPerSolve: XP_PER_SOLVE,
    sample,
  });
}
