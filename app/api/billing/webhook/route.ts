export async function POST() {
  // Verify Stripe's signature before parsing event data, then update subscriptions by Stripe customer ID.
  return Response.json({ error: "Stripe webhook is not configured" }, { status: 503 });
}
