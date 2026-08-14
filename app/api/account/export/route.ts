import { requireUser } from "@/lib/auth";
export async function POST() {
  try { await requireUser(); } catch { return Response.json({ error: "Authentication is required" }, { status: 401 }); }
  return Response.json({ error: "Account export is not configured" }, { status: 503 });
}
