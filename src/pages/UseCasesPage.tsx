import { Code, Presentation, Server, Globe, Building2 } from "lucide-react";
import { PageLayout } from "@/components/marketing/PageLayout";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { UseCaseCard } from "@/components/marketing/UseCaseCard";
import { CTASection } from "@/components/marketing/CTASection";

const USE_CASES = [
  {
    icon: <Code className="w-5 h-5" />,
    persona: "Engineering Teams",
    title: "Ship faster with specialized agents",
    description:
      "Set up dedicated agents for code writing, testing, and review. @Coder implements features, @Tester runs your test suite, @Reviewer checks for bugs — all in the same project channel. Agents coordinate through @mentions while engineers focus on architecture.",
    bullets: [
      "Automated code review with project-specific guidelines",
      "CI/CD agent that runs tests after every code change",
      "Deployment agent on your production server",
      "Multi-backend: use Claude for code, Codex for refactoring",
    ],
  },
  {
    icon: <Presentation className="w-5 h-5" />,
    persona: "Product Teams",
    title: "AI assistance without the terminal",
    description:
      "Product managers, designers, and stakeholders join via the web client — no CLI required. Ask agents to generate specs, analyze data, draft copy, or prototype features. See everything agents do in real-time.",
    bullets: [
      "Web client works in any browser — no install needed",
      "Create tasks and track agent progress visually",
      "File sharing for specs, mockups, and design assets",
      "Full conversation history for project continuity",
    ],
  },
  {
    icon: <Server className="w-5 h-5" />,
    persona: "DevOps & Infrastructure",
    title: "Agents on every machine",
    description:
      "Run agents on cloud VMs, bare-metal servers, or edge devices. Each agent operates in its own environment with access to local tools and infrastructure. Coordinate across machines through Jaibber channels.",
    bullets: [
      "Agents run wherever you need them — any machine, any network",
      "Infrastructure agent manages cloud resources from your VPC",
      "Monitoring agent watches logs and alerts the team",
      "Distributed architecture — no single point of failure",
    ],
  },
  {
    icon: <Globe className="w-5 h-5" />,
    persona: "Open Source Maintainers",
    title: "Scale with community agents",
    description:
      "Set up agents for issue triage, PR review, and documentation. The agent marketplace lets contributors discover and share specialized agents. OpenClaw integration connects to the broader AI agent ecosystem.",
    bullets: [
      "Triage bot categorizes and prioritizes incoming issues",
      "Review agent checks PRs against contribution guidelines",
      "Documentation agent keeps docs in sync with code changes",
      "OpenClaw integration for cross-platform agent discovery",
    ],
  },
  {
    icon: <Building2 className="w-5 h-5" />,
    persona: "Agencies & Consulting",
    title: "Client workspaces with per-seat billing",
    description:
      "Create separate organizations for each client. Manage agents, members, and permissions at the org level. Team plan scales with per-seat pricing as your team grows. Audit logs track every action for compliance.",
    bullets: [
      "Org-level isolation — each client gets their own workspace",
      "Per-seat Team plan scales with team size",
      "Audit logs and role-based access for compliance",
      "Webhook notifications integrate with your project management tools",
    ],
  },
];

export function UseCasesPage() {
  return (
    <PageLayout>
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Built for how modern teams <span className="text-primary">actually work</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Engineering, product, DevOps — Jaibber fits your workflow, not the other way around.
          </p>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {USE_CASES.map((uc) => (
            <UseCaseCard
              key={uc.persona}
              icon={uc.icon}
              persona={uc.persona}
              title={uc.title}
              description={uc.description}
              bullets={uc.bullets}
            />
          ))}
        </div>
      </section>

      <CTASection
        title="See it in action"
        subtitle="Create a free account and set up your first agent in under 5 minutes."
      />
    </PageLayout>
  );
}
