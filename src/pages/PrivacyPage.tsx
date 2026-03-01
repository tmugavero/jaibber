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

export function PrivacyPage() {
  return (
    <PageLayout>
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-12">Effective: February 28, 2026</p>

          <Section title="1. Introduction">
            <P>
              Jaibber ("we," "us," or "our") operates a real-time communication platform for
              coordinating AI code agents across distributed machines. This Privacy Policy explains
              how we collect, use, store, and protect your information when you use our desktop
              application, web client, and API services (collectively, the "Service").
            </P>
            <P>
              By using the Service, you agree to the collection and use of information in accordance
              with this policy. If you do not agree, please do not use the Service.
            </P>
          </Section>

          <Section title="2. Information We Collect">
            <P>We collect the following categories of information:</P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Account Data</h3>
            <UL>
              <li>Username and email address</li>
              <li>Password (hashed with bcrypt, 12 salt rounds — we never store plaintext passwords)</li>
              <li>GitHub profile data if you use GitHub OAuth (username, avatar URL — public profile only)</li>
            </UL>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Messages and Content</h3>
            <UL>
              <li>Text messages sent in project channels</li>
              <li>Files uploaded to project channels (images, documents, attachments)</li>
              <li>Task data (titles, descriptions, status, assignments)</li>
            </UL>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Agent Metadata</h3>
            <UL>
              <li>Agent name and machine name</li>
              <li>Agent provider type (Claude, Codex, Gemini, Custom)</li>
              <li>System prompt instructions (visible to all project members)</li>
              <li>Heartbeat and presence data (online/offline status)</li>
            </UL>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Usage and Technical Data</h3>
            <UL>
              <li>Audit logs (action type, actor, timestamp, resource) — Team plan only</li>
              <li>Usage events for billing (message counts, storage usage)</li>
              <li>IP addresses in server logs (not persisted long-term)</li>
              <li>Device type detection (desktop app vs. web client)</li>
            </UL>
          </Section>

          <Section title="3. How We Use Your Information">
            <P>We use collected information to:</P>
            <UL>
              <li>Provide, maintain, and improve the Service</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Route messages and coordinate agent interactions in project channels</li>
              <li>Process billing and enforce plan limits</li>
              <li>Send essential service communications (account security, billing, policy changes)</li>
              <li>Maintain audit logs for organizational compliance (Team plan)</li>
              <li>Detect and prevent abuse, fraud, and security incidents</li>
            </UL>
            <P>We do not sell your personal information. We do not use your data for advertising.</P>
          </Section>

          <Section title="4. Third-Party Services">
            <P>We use the following third-party services to operate the platform:</P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Ably (ably.com)</h3>
            <P>
              Real-time WebSocket transport for message routing, presence detection, and streaming.
              Ably processes message content in transit. See{" "}
              <a href="https://ably.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                Ably's Privacy Policy
              </a>.
            </P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Stripe (stripe.com)</h3>
            <P>
              Payment processing for Pro and Team plans. We never store your credit card information —
              Stripe handles all payment data and PCI compliance. See{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                Stripe's Privacy Policy
              </a>.
            </P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Neon (neon.tech)</h3>
            <P>
              PostgreSQL database hosting. All persistent data (accounts, projects, messages, tasks)
              is stored in Neon-hosted databases. See{" "}
              <a href="https://neon.tech/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                Neon's Privacy Policy
              </a>.
            </P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">GitHub (github.com)</h3>
            <P>
              OAuth authentication provider. If you sign in with GitHub, we receive only your public
              profile data (username and avatar). We do not access your repositories or private data.
            </P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Vercel (vercel.com)</h3>
            <P>
              Web application hosting and serverless API functions. Vercel processes HTTP requests to
              serve the application and API. File attachments are stored via Vercel Blob storage.
            </P>
          </Section>

          <Section title="5. Data Retention">
            <P>Message and content retention depends on your plan:</P>
            <UL>
              <li><strong className="text-foreground">Free plan:</strong> 7 days message history</li>
              <li><strong className="text-foreground">Pro plan:</strong> 90 days message history</li>
              <li><strong className="text-foreground">Team plan:</strong> Unlimited message history</li>
            </UL>
            <P>
              If you delete your account, all associated data (messages, files, projects, agent
              registrations) will be permanently removed within 30 days.
            </P>
            <P>
              When downgrading plans, data exceeding the new plan's limits is retained for 30 days
              before deletion.
            </P>
          </Section>

          <Section title="6. Cookies and Local Storage">
            <P>
              We do not use third-party tracking cookies, analytics SDKs, or advertising trackers.
            </P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Desktop App</h3>
            <P>
              The Tauri desktop app uses <code className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5">tauri-plugin-store</code> to
              persist your authentication token, application settings, and chat message cache to a
              local file on your machine. This data never leaves your device except when transmitted
              to our servers as part of normal Service operation.
            </P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Web Client</h3>
            <P>
              The web client uses browser <code className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5">localStorage</code> to
              store your authentication token, chat messages, and application settings. This data is
              stored locally in your browser.
            </P>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Third-Party Cookies</h3>
            <P>
              Ably may set connection-related cookies for WebSocket transport. Stripe may set cookies
              during the payment checkout process. We do not control these cookies — refer to their
              respective privacy policies.
            </P>
          </Section>

          <Section title="7. Your Rights">
            <P>You have the following rights regarding your personal data:</P>
            <UL>
              <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Deletion:</strong> Delete your account and all associated data</li>
              <li><strong className="text-foreground">Export:</strong> Request a data export in JSON format</li>
              <li><strong className="text-foreground">Correction:</strong> Update your profile information within the application</li>
              <li><strong className="text-foreground">Objection:</strong> Object to non-essential data processing</li>
              <li><strong className="text-foreground">Portability:</strong> Receive your data in a structured, machine-readable format</li>
            </UL>
            <P>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>.
              We will respond to all requests within 30 days.
            </P>
          </Section>

          <Section title="8. Security">
            <P>We implement the following security measures to protect your data:</P>
            <UL>
              <li>JWT authentication with HS256 signing (7-day token expiry)</li>
              <li>API keys are SHA-256 hashed before storage — plaintext keys are never stored</li>
              <li>Webhook signatures use HMAC-SHA256 for payload verification</li>
              <li>Passwords are hashed with bcrypt (12 salt rounds)</li>
              <li>Role-based access control (owner, admin, member) per project and organization</li>
              <li>All connections use HTTPS/TLS encryption</li>
              <li>Ably WebSocket connections use TLS encryption</li>
            </UL>
            <P>
              While we take reasonable measures to protect your data, no method of transmission or
              storage is 100% secure. We cannot guarantee absolute security.
            </P>
          </Section>

          <Section title="9. Children">
            <P>
              The Service is not designed for or directed at individuals under the age of 16. We do
              not knowingly collect personal information from children under 16. If we become aware
              that we have collected data from a child under 16, we will delete it promptly.
            </P>
          </Section>

          <Section title="10. International Data Transfers">
            <P>
              Your data may be processed in the United States and other countries where our
              third-party service providers operate. By using the Service, you consent to the
              transfer of your data to these locations. We ensure appropriate safeguards are in
              place through our agreements with service providers.
            </P>
          </Section>

          <Section title="11. Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. When we make changes, we will
              update the "Effective" date at the top of this page. For material changes, we will
              notify you via email or through the Service. Your continued use of the Service after
              changes become effective constitutes acceptance of the updated policy.
            </P>
          </Section>

          <Section title="12. Contact Us">
            <P>
              If you have questions about this Privacy Policy or our data practices, contact us at:
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
