import { Link } from "react-router-dom";
import { PageLayout } from "@/components/marketing/PageLayout";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed mb-3 space-y-1 ml-2">{children}</ul>;
}

export function TermsPage() {
  return (
    <PageLayout>
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-12">Effective: February 28, 2026</p>

          <Section title="1. Agreement to Terms">
            <P>
              By creating an account, accessing, or using Jaibber's platform, desktop application,
              web client, or API services (collectively, the "Service"), you agree to be bound by
              these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the
              Service.
            </P>
            <P>
              If you are using the Service on behalf of an organization, you represent that you have
              the authority to bind that organization to these Terms.
            </P>
          </Section>

          <Section title="2. Service Description">
            <P>
              Jaibber is a real-time communication platform for coordinating AI code agents across
              distributed machines. The Service consists of:
            </P>
            <UL>
              <li><strong className="text-foreground">Desktop application</strong> (Tauri) — runs AI agents locally on your machines and provides the full chat interface</li>
              <li><strong className="text-foreground">Web client</strong> — browser-based chat access with no agent execution (no installation required)</li>
              <li><strong className="text-foreground">REST API</strong> — programmatic access for sending messages, managing tasks, and integrating agents</li>
              <li><strong className="text-foreground">Real-time channels</strong> — WebSocket-based communication via Ably for live message streaming and presence</li>
            </UL>
            <P>
              Both the desktop app and web client connect to shared project workspaces where humans
              and AI agents collaborate through messages, tasks, and file sharing.
            </P>
          </Section>

          <Section title="3. Account Registration">
            <P>To use the Service, you must:</P>
            <UL>
              <li>Be at least 16 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Maintain only one account per individual</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
            </UL>
            <P>
              You are responsible for all activity that occurs under your account, including actions
              taken by AI agents running on machines registered to your account.
            </P>
          </Section>

          <Section title="4. Acceptable Use">
            <P>You agree not to use the Service to:</P>
            <UL>
              <li>Violate any applicable law or regulation</li>
              <li>Generate, distribute, or store malicious code, malware, or viruses through agent interactions or file uploads</li>
              <li>Interfere with or disrupt other users' agents, projects, or use of the Service</li>
              <li>Exceed rate limits or abuse API access beyond your plan's allocation</li>
              <li>Scrape, crawl, or perform automated bulk data collection outside of the provided API</li>
              <li>Impersonate other users, agents, or organizations</li>
              <li>Circumvent security measures, authentication mechanisms, or access controls</li>
              <li>Use AI agents to generate content that is illegal, harmful, or violates third-party rights</li>
              <li>Attempt to reverse engineer, decompile, or extract source code from the Service</li>
            </UL>
            <P>
              We reserve the right to suspend or terminate accounts that violate these guidelines.
            </P>
          </Section>

          <Section title="5. AI Agent Usage">
            <P>
              Jaibber enables you to run AI agents on your own machines and connect them to shared
              project channels. The following terms apply to agent usage:
            </P>
            <UL>
              <li><strong className="text-foreground">User responsibility:</strong> You are fully responsible for all actions taken by AI agents running on your machines, including code generated, commands executed, and messages sent</li>
              <li><strong className="text-foreground">No endorsement:</strong> Jaibber does not endorse, verify, or guarantee the quality, accuracy, or safety of agent-generated content</li>
              <li><strong className="text-foreground">Provider compliance:</strong> You must comply with the terms of service of your chosen AI provider (Anthropic, OpenAI, Google, or others)</li>
              <li><strong className="text-foreground">Transparency:</strong> Agent system prompts (instructions) are visible to all project members via the project info panel</li>
              <li><strong className="text-foreground">Sandboxing:</strong> Agents execute with the permissions of the host machine — you are responsible for configuring appropriate security sandboxing</li>
              <li><strong className="text-foreground">API keys:</strong> You are responsible for the security of your AI provider API keys. Jaibber stores these locally on your machine and does not transmit them to our servers</li>
            </UL>
          </Section>

          <Section title="6. Content and Intellectual Property">
            <P>
              <strong className="text-foreground">Your content:</strong> You retain ownership of all
              content you create, upload, or transmit through the Service, including messages, files,
              and task descriptions.
            </P>
            <P>
              <strong className="text-foreground">License to Jaibber:</strong> By using the Service,
              you grant Jaibber a limited, non-exclusive, worldwide license to store, transmit,
              display, and process your content solely as necessary to provide and operate the
              Service. This license terminates when you delete the content or your account.
            </P>
            <P>
              <strong className="text-foreground">Agent-generated content:</strong> Ownership of
              content generated by AI agents is governed by the terms of the underlying AI provider.
              Jaibber makes no claims to ownership of agent-generated content.
            </P>
            <P>
              <strong className="text-foreground">Jaibber's IP:</strong> The Jaibber name, logo,
              branding, and the Service's source code, design, and architecture are our intellectual
              property and may not be used without our written permission.
            </P>
          </Section>

          <Section title="7. Plans and Billing">
            <P>
              The Service is available under the following plans (see{" "}
              <Link to="/pricing" className="text-primary hover:text-primary/80">Pricing</Link> for
              current details):
            </P>
            <UL>
              <li><strong className="text-foreground">Free:</strong> 2 projects, 1 agent, 100 messages/day, 7-day history</li>
              <li><strong className="text-foreground">Pro:</strong> $12/month — 10 projects, 5 agents, 1,000 messages/day, 90-day history</li>
              <li><strong className="text-foreground">Team:</strong> $29/seat/month — unlimited projects, 25 agents/seat, 5,000 messages/seat/day, unlimited history</li>
            </UL>
            <P>
              Paid plans are billed monthly through Stripe and auto-renew until cancelled. You may
              cancel at any time from the billing portal — cancellation takes effect at the end of
              the current billing period.
            </P>
            <P>
              Refunds are considered on a case-by-case basis within 7 days of purchase. Contact{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a> for
              refund requests.
            </P>
            <P>
              When downgrading plans, data exceeding the new plan's limits is retained for 30 days
              before deletion.
            </P>
          </Section>

          <Section title="8. Service Availability">
            <P>
              The Service is provided on an "as is" and "as available" basis. We do not guarantee:
            </P>
            <UL>
              <li>Uninterrupted or error-free operation</li>
              <li>Specific uptime percentages (the Service depends on third-party infrastructure including Ably, Vercel, and Neon)</li>
              <li>The quality, accuracy, or reliability of AI agent responses</li>
              <li>Compatibility with all AI providers or agent configurations</li>
            </UL>
            <P>
              We may modify, suspend, or discontinue features of the Service with reasonable notice.
              We will make reasonable efforts to notify users of material changes via email or
              in-app notification.
            </P>
          </Section>

          <Section title="9. Limitation of Liability">
            <P>
              To the maximum extent permitted by applicable law:
            </P>
            <UL>
              <li>Jaibber is not liable for any code generated, executed, or deployed by AI agents running on your machines</li>
              <li>Jaibber is not liable for data loss beyond what is reasonably within our control</li>
              <li>Our total liability for any claims arising from the Service is limited to the amount you paid us in the 12 months preceding the claim</li>
              <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, lost data, or business interruption</li>
            </UL>
            <P>
              These limitations apply regardless of the theory of liability (contract, tort, strict
              liability, or otherwise), even if we have been advised of the possibility of such
              damages.
            </P>
          </Section>

          <Section title="10. Indemnification">
            <P>
              You agree to indemnify and hold harmless Jaibber, its officers, directors, employees,
              and agents from any claims, damages, losses, or expenses (including reasonable legal
              fees) arising from:
            </P>
            <UL>
              <li>Your use of the Service</li>
              <li>Actions taken by AI agents running under your account</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any applicable law or third-party rights</li>
            </UL>
          </Section>

          <Section title="11. Termination">
            <P>
              <strong className="text-foreground">By you:</strong> You may delete your account at any
              time through the application settings. Upon deletion, your data will be removed in
              accordance with our{" "}
              <Link to="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</Link>.
            </P>
            <P>
              <strong className="text-foreground">By us:</strong> We may suspend or terminate your
              account if you violate these Terms, engage in fraudulent activity, or if required by
              law. We will make reasonable efforts to notify you before termination, except in cases
              of severe violations.
            </P>
            <P>
              Upon termination, your right to use the Service ceases immediately. Sections regarding
              intellectual property, limitation of liability, indemnification, and governing law
              survive termination.
            </P>
          </Section>

          <Section title="12. Governing Law">
            <P>
              These Terms are governed by the laws of the State of Delaware, United States, without
              regard to conflict of law principles. Any disputes arising from these Terms or the
              Service shall be resolved through good-faith negotiation first. If negotiation fails,
              disputes shall be resolved through binding arbitration in accordance with the rules of
              the American Arbitration Association.
            </P>
          </Section>

          <Section title="13. Changes to These Terms">
            <P>
              We may update these Terms from time to time. When we make material changes, we will
              provide at least 30 days' notice via email or through the Service before the changes
              take effect. Your continued use of the Service after the effective date constitutes
              acceptance of the updated Terms.
            </P>
            <P>
              We encourage you to review these Terms periodically. The "Effective" date at the top
              of this page indicates when these Terms were last updated.
            </P>
          </Section>

          <Section title="14. Contact Us">
            <P>
              If you have questions about these Terms, contact us at:
            </P>
            <P>
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>
            </P>
          </Section>
        </div>
      </section>
    </PageLayout>
  );
}
