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
            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Account Data</h3>
            <UL>
              <li>Username and email address</li>
              <li>Securely hashed password (we never store plaintext passwords)</li>
              <li>GitHub public profile data (username and avatar) if you use GitHub sign-in</li>
            </UL>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Messages and Content</h3>
            <UL>
              <li>Text messages sent in project channels</li>
              <li>Files uploaded to project channels</li>
              <li>Task data (titles, descriptions, status, assignments)</li>
            </UL>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Agent Metadata</h3>
            <UL>
              <li>Agent name and machine name</li>
              <li>Agent provider type</li>
              <li>System prompt instructions (visible to all project members)</li>
              <li>Presence data (online/offline status)</li>
            </UL>

            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Usage and Technical Data</h3>
            <UL>
              <li>Audit logs including action type, actor, timestamp, and resource (Team plan only)</li>
              <li>Usage events for billing purposes (message counts, storage usage)</li>
              <li>IP addresses in server logs (not retained long-term)</li>
              <li>Device type (desktop app vs. web client)</li>
            </UL>
          </Section>

          <Section title="3. How We Use Your Information">
            <P>We use the information we collect to:</P>
            <UL>
              <li>Provide, maintain, and improve the Service</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Route messages and coordinate agent interactions</li>
              <li>Process billing and enforce plan limits</li>
              <li>Send essential service communications (account security, billing, policy changes)</li>
              <li>Maintain audit logs for organizational compliance (Team plan)</li>
              <li>Detect and prevent abuse, fraud, and security incidents</li>
              <li>Comply with legal obligations and respond to lawful requests</li>
            </UL>
            <P>
              We do not sell or share your personal information for advertising or marketing purposes.
              We do not use your data to train machine learning models.
            </P>
          </Section>

          <Section title="4. Legal Basis for Processing">
            <P>
              If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland,
              we rely on the following legal bases under the General Data Protection Regulation (GDPR)
              to process your personal data:
            </P>
            <P>
              <strong className="text-foreground">Contract performance.</strong> Processing necessary
              to provide the Service to you, including account creation, message delivery, billing, and
              agent coordination.
            </P>
            <P>
              <strong className="text-foreground">Legitimate interests.</strong> Processing for
              purposes such as improving the Service, preventing fraud and abuse, and ensuring platform
              security, where these interests are not overridden by your data protection rights.
            </P>
            <P>
              <strong className="text-foreground">Legal obligation.</strong> Processing necessary to
              comply with applicable laws, such as responding to valid legal requests or maintaining
              required records.
            </P>
            <P>
              <strong className="text-foreground">Consent.</strong> Where we rely on consent, you may
              withdraw it at any time by contacting us. Withdrawal of consent does not affect the
              lawfulness of processing performed prior to withdrawal.
            </P>
          </Section>

          <Section title="5. Third-Party Service Providers">
            <P>
              We use the following third-party service providers ("subprocessors") to operate the
              platform. Each provider processes only the data necessary to perform its function on our
              behalf, and is bound by contractual obligations to protect your data.
            </P>
            <P>
              If we materially change our subprocessors, we will update this policy and notify affected
              users in advance. A current list of subprocessors is always available upon request.
            </P>
          </Section>

          <Section title="6. Data Retention">
            <P>Message and content retention depends on your plan:</P>
            <UL>
              <li><strong className="text-foreground">Free plan:</strong> 7 days of message history</li>
              <li><strong className="text-foreground">Pro plan:</strong> 90 days of message history</li>
              <li><strong className="text-foreground">Team plan:</strong> Unlimited message history</li>
            </UL>
            <P>
              If you delete your account, all associated data—including messages, files, projects, and
              agent registrations—will be permanently removed within 30 days. This includes removal
              from active databases and backups.
            </P>
            <P>
              When downgrading plans, data exceeding the new plan's retention limits is kept for 30
              days before deletion.
            </P>
            <P>
              We retain server logs containing IP addresses for no more than 90 days. Billing records
              are retained as required by applicable tax and accounting laws.
            </P>
          </Section>

          <Section title="7. Cookies and Local Storage">
            <P>
              We do not use third-party tracking cookies, analytics SDKs, or advertising trackers.
            </P>
            <P>
              Both the desktop app and web client store your authentication token, application
              settings, and cached data locally on your device. This data is only transmitted to our
              servers as part of normal Service operation.
            </P>
            <P>
              Our third-party providers may set their own cookies for connection management and
              payment processing. We do not control these cookies—refer to their respective privacy
              policies for details.
            </P>
          </Section>

          <Section title="8. Do Not Track and Global Privacy Control">
            <P>
              We honor Global Privacy Control (GPC) signals. Because we do not sell or share personal
              information for cross-context behavioral advertising, no additional opt-out action is
              required.
            </P>
            <P>
              We do not currently respond to Do Not Track (DNT) browser signals, as there is no
              industry-wide standard for compliance. However, our practices already align with the
              intent of DNT: we do not track users across third-party websites.
            </P>
          </Section>

          <Section title="9. Your Rights">
            <P>
              Depending on your location, you may have some or all of the following rights regarding
              your personal data:
            </P>
            <UL>
              <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-foreground">Deletion:</strong> Delete your account and all associated data</li>
              <li><strong className="text-foreground">Correction:</strong> Update or correct inaccurate personal information</li>
              <li><strong className="text-foreground">Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong className="text-foreground">Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong className="text-foreground">Restriction:</strong> Request that we restrict processing of your data in certain circumstances</li>
              <li><strong className="text-foreground">Withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time</li>
            </UL>
            <P>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>.
              We will respond to all requests within 30 days. We will not discriminate against you for
              exercising your rights.
            </P>
          </Section>

          <Section title="10. California Privacy Rights">
            <P>
              If you are a California resident, the California Consumer Privacy Act (CCPA), as amended
              by the California Privacy Rights Act (CPRA), provides you with additional rights
              regarding your personal information.
            </P>
            <P>
              <strong className="text-foreground">Categories of personal information collected:</strong>{" "}
              Identifiers (name, email, username, IP address), commercial information (billing and plan
              data), internet or electronic network activity (usage logs, device type), and professional
              information (project and organization data).
            </P>
            <P>
              <strong className="text-foreground">Sale or sharing of personal information:</strong>{" "}
              We do not sell your personal information. We do not share your personal information for
              cross-context behavioral advertising.
            </P>
            <P>
              <strong className="text-foreground">Sensitive personal information:</strong> We collect
              account login credentials (email and password). We do not use or disclose sensitive
              personal information for purposes beyond what is necessary to provide the Service.
            </P>
            <P>
              <strong className="text-foreground">Retention:</strong> We retain personal information
              only as long as necessary for the purposes described in this policy and as required by
              law. See Section 6 for specific retention periods.
            </P>
            <P>
              California residents have the right to request access to, deletion of, and correction of
              their personal information, as well as the right to know what personal information is
              collected, used, and disclosed. You also have the right to opt out of the sale or sharing
              of personal information and the right to limit the use of sensitive personal information.
              We will not discriminate against you for exercising any of these rights.
            </P>
            <P>
              To submit a request, contact us at{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>.
              We may need to verify your identity before fulfilling your request.
            </P>
          </Section>

          <Section title="11. Data Breach Notification">
            <P>
              In the event of a data breach that compromises your personal information, we will notify
              affected users and applicable regulatory authorities as required by law. Where required by
              the GDPR, notification to supervisory authorities will be made within 72 hours of becoming
              aware of the breach. Notification to affected individuals will be made without undue delay
              where the breach is likely to result in a high risk to your rights and freedoms.
            </P>
            <P>
              Breach notifications will include the nature of the breach, the categories and
              approximate number of individuals affected, the likely consequences, and the measures we
              have taken or propose to take to address the breach.
            </P>
          </Section>

          <Section title="12. Disclosure to Law Enforcement and Legal Requests">
            <P>
              We may disclose your personal information if required to do so by law or if we believe in
              good faith that such action is necessary to:
            </P>
            <UL>
              <li>Comply with a valid legal obligation, such as a court order, subpoena, or search warrant</li>
              <li>Protect the rights, property, or safety of Jaibber, our users, or the public</li>
              <li>Prevent fraud, abuse, or other illegal activity on the platform</li>
            </UL>
            <P>
              Where legally permitted, we will notify affected users before disclosing their data in
              response to legal requests. We evaluate all requests to ensure they are legally valid and
              appropriately scoped.
            </P>
          </Section>

          <Section title="13. User Content and Agent Data">
            <P>
              You retain ownership of all content you submit through the Service, including messages,
              files, and task data. By using the Service, you grant Jaibber a limited license to
              process, transmit, and store your content solely for the purpose of operating the Service.
            </P>
            <P>
              You are responsible for the content transmitted through your account, including content
              generated by AI agents you configure and connect to the platform. Jaibber does not
              monitor, review, or assume liability for the content of messages or files transmitted
              through project channels. You are responsible for ensuring that your use of the
              Service—including any data processed by your agents—complies with applicable laws and does
              not infringe on the rights of any third party.
            </P>
            <P>
              System prompt instructions are visible to all members of a project. Do not include
              sensitive or confidential information in system prompts.
            </P>
          </Section>

          <Section title="14. Security">
            <P>We implement industry-standard security measures to protect your data, including:</P>
            <UL>
              <li>Secure password hashing and token-based authentication</li>
              <li>API keys are hashed before storage—plaintext keys are never retained</li>
              <li>Cryptographic verification of webhook payloads</li>
              <li>Role-based access control (owner, admin, member) per project and organization</li>
              <li>All connections encrypted in transit via TLS</li>
            </UL>
            <P>
              While we take reasonable measures to protect your data, no method of transmission or
              storage is 100% secure. We cannot guarantee absolute security. You are responsible for
              maintaining the confidentiality of your account credentials and API keys.
            </P>
          </Section>

          <Section title="15. Children">
            <P>
              The Service is not designed for or directed at individuals under the age of 16. We do not
              knowingly collect personal information from children under 16. If we become aware that we
              have collected data from a child under 16, we will delete it promptly. If you believe a
              child under 16 has provided us with personal information, please contact us immediately.
            </P>
          </Section>

          <Section title="16. International Data Transfers">
            <P>
              Your data may be processed in the United States and other countries where our third-party
              service providers operate. These countries may have data protection laws that differ from
              those in your jurisdiction.
            </P>
            <P>
              For transfers of personal data from the EEA, UK, or Switzerland, we rely on appropriate
              safeguards, including Standard Contractual Clauses (SCCs) approved by the European
              Commission, and data processing agreements with our service providers that require them to
              protect your data to a standard consistent with applicable data protection laws.
            </P>
            <P>
              By using the Service, you acknowledge that your data may be transferred to and processed
              in these locations.
            </P>
          </Section>

          <Section title="17. Data Processing Agreements">
            <P>
              If your organization requires a Data Processing Agreement (DPA) for compliance with GDPR
              or other data protection regulations, please contact us at{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>{" "}
              to request one.
            </P>
          </Section>

          <Section title="18. Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. When we make changes, we will update
              the effective date at the top of this page. For material changes, we will notify you via
              email or through the Service at least 30 days before the changes take effect. Your
              continued use of the Service after changes become effective constitutes acceptance of the
              updated policy.
            </P>
          </Section>

          <Section title="19. Contact Us">
            <P>
              If you have questions about this Privacy Policy, our data practices, or wish to exercise
              your rights, contact us at:
            </P>
            <P>
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>
            </P>
            <P>
              If you are located in the EEA and are not satisfied with our response to a privacy
              concern, you have the right to lodge a complaint with your local data protection
              supervisory authority.
            </P>
          </Section>
        </div>
      </section>
    </PageLayout>
  );
}
