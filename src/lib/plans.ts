export interface Plan {
  id: string;
  name: string;
  price: string;
  priceAmount?: number;
  period: string;
  currency?: string;
  features: string[];
  recommended?: boolean;
  perSeat?: boolean;
  stripePriceId?: string;
}

/** Static fallback used while Stripe plans are loading or if fetch fails. */
export const FALLBACK_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceAmount: 0,
    period: "forever",
    features: ["3 projects", "2 agent connections", "3 members", "7-day message history"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$5",
    priceAmount: 500,
    period: "/month",
    features: ["15 projects", "10 agent connections", "10 members", "90-day history", "Admin console"],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$20",
    priceAmount: 2000,
    period: "/month/seat",
    features: [
      "Unlimited projects",
      "Unlimited agents",
      "Unlimited members",
      "Unlimited history",
      "Audit logs",
      "SSO (coming soon)",
      "API access",
    ],
    perSeat: true,
  },
];

/** Fetch plans from the server (which pulls live prices from Stripe). */
export async function fetchPlans(apiBaseUrl: string): Promise<Plan[]> {
  const res = await fetch(`${apiBaseUrl}/api/billing/plans`);
  if (!res.ok) throw new Error(`Failed to fetch plans: ${res.status}`);
  const { plans } = await res.json();
  return plans;
}
