import { NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await isAdminRequest(req);
  return Response.json({ admin });
}
