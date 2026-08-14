import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || !signature) return Response.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  let event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return Response.json({ error: "Invalid Stripe webhook signature" }, { status: 400 }); }

  // Once the Neon migration is applied, persist checkout/session, subscription, and cancellation
  // events by authenticated Clerk user ID before returning success.
  return Response.json({ received: true, type: event.type });
}
