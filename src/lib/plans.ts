export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["3 projects", "2 agent connections", "3 members", "7-day message history"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/month",
    features: ["15 projects", "10 agent connections", "10 members", "90-day history", "Admin console"],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$49",
    period: "/mo + $10/seat",
    features: [
      "Unlimited projects",
      "Unlimited agents",
      "Unlimited members",
      "Unlimited history",
      "Audit logs",
      "SSO (coming soon)",
      "API access",
    ],
  },
];
