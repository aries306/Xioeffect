import { requireUser } from "@/lib/auth";

export async function POST() {
  try { await requireUser(); } catch { return Response.json({ error: "Authentication is required" }, { status: 401 }); }
  // A Neon-backed subscription record is required to look up the verified Stripe customer ID.
  return Response.json({ error: "The billing portal will be enabled after webhook synchronization is configured" }, { status: 503 });
}
