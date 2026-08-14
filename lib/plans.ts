export const plans = ["core", "pro", "business", "executive"] as const;
export type Plan = (typeof plans)[number];
export const paidPlans = new Set<Plan>(["pro", "business", "executive"]);
export function isPlan(value: string): value is Plan { return (plans as readonly string[]).includes(value); }
