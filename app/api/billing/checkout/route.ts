import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isPlan, paidPlans, priceForPlan } from "@/lib/plans";
import { stripe } from "@/lib/stripe";

const bodySchema = z.object({ plan: z.string() });

export async function POST(request: Request) {
  let user;
  try { user = await requireUser(); } catch { return Response.json({ error: "Authentication is required" }, { status: 401 }); }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !isPlan(body.data.plan) || !paidPlans.has(body.data.plan)) return Response.json({ error: "Invalid paid plan" }, { status: 400 });
  const price = priceForPlan(body.data.plan);
  if (!stripe || !price) return Response.json({ error: "Billing is not configured" }, { status: 503 });

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { clerkUserId: user.id, plan: body.data.plan } },
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/#pricing`,
  });
  if (!session.url) return Response.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  return Response.json({ url: session.url });
}
