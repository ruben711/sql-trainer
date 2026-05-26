import { NextRequest } from "next/server";
import { getJson, setJson, isConfigured } from "@/lib/upstash";
import { isAdminRequest } from "@/lib/adminAuth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const KEY = "lb:v1";

// Nieuwe XP-tabel (moet matchen met lib/store.ts)
const XP_TABLE = { easy: 15, medium: 25, hard: 40, insane: 0 } as const;

// Pre-computed gemiddelden uit de exercise-pool. Bumpen wanneer pool flink wijzigt.
const AVG_PER_SOLVE = {
  exam: 24.4,      // (37×15 + 58×25 + 28×40 + 5×0) / 128
  general: 22.2,   // 18 oefeningen
} as const;

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
  const before: { uid: string; name: string; oldExam: number; newExam: number; oldGen: number; newGen: number }[] = [];

  for (const e of list) {
    const newExamXp = Math.round((e.exam?.solved ?? 0) * AVG_PER_SOLVE.exam);
    const newGenXp = Math.round((e.general?.solved ?? 0) * AVG_PER_SOLVE.general);
    if (newExamXp !== e.exam?.xp || newGenXp !== e.general?.xp) {
      before.push({
        uid: e.uid, name: e.name,
        oldExam: e.exam?.xp ?? 0, newExam: newExamXp,
        oldGen: e.general?.xp ?? 0, newGen: newGenXp,
      });
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
    avgPerSolve: AVG_PER_SOLVE,
    sample: before.slice(0, 10),
  });
}
