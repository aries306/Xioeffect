import { z } from "zod";
import { isPlan, paidPlans } from "@/lib/plans";
import { requireUser } from "@/lib/auth";
const bodySchema = z.object({ plan: z.string() });
export async function POST(request: Request) {
  try { await requireUser(); } catch { return Response.json({ error: "Authentication is required" }, { status: 401 }); }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !isPlan(body.data.plan) || !paidPlans.has(body.data.plan)) return Response.json({ error: "Invalid paid plan" }, { status: 400 });
  return Response.json({ error: "Stripe Checkout is not configured" }, { status: 503 });
}
