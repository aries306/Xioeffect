export const plans = ["core", "pro", "business", "executive"] as const;
export type Plan = (typeof plans)[number];
export const paidPlans = new Set<Plan>(["pro", "business", "executive"]);

const priceByPlan: Record<Exclude<Plan, "core">, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
  executive: process.env.STRIPE_PRICE_EXECUTIVE,
};

export function isPlan(value: string): value is Plan { return (plans as readonly string[]).includes(value); }
export function priceForPlan(plan: Plan): string | undefined { return plan === "core" ? undefined : priceByPlan[plan]; }
