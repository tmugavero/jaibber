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
    features: ["2 projects", "1 agent connection", "3 members", "100 messages/day", "100 MB storage", "7-day history"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    priceAmount: 1200,
    period: "/month",
    features: [
      "10 projects",
      "5 agent connections",
      "10 members",
      "1,000 messages/day",
      "1 GB storage",
      "90-day history",
      "Webhooks",
      "2 API keys",
    ],
    recommended: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$25",
    priceAmount: 2500,
    period: "/month/seat",
    features: [
      "Unlimited projects",
      "25 agents/seat",
      "Unlimited members",
      "5,000 messages/day/seat",
      "5 GB storage/seat",
      "Unlimited history",
      "Webhooks",
      "Unlimited API keys",
      "Audit logs",
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
