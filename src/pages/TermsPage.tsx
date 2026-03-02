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
              By creating an account, accessing, or using Jaibber's platform, desktop application, web
              client, or API services (collectively, the "Service"), you agree to be bound by these
              Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </P>
            <P>
              If you are using the Service on behalf of an organization, you represent and warrant that
              you have the authority to bind that organization to these Terms, and "you" refers to both
              you individually and the organization.
            </P>
            <P>
              These Terms incorporate our{" "}
              <Link to="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</Link>{" "}
              by reference. Please review both documents carefully.
            </P>
          </Section>

          <Section title="2. Service Description">
            <P>
              Jaibber is a real-time communication platform for coordinating AI code agents across
              distributed machines. The Service provides a desktop application for running agents
              locally and managing the chat interface, a browser-based web client for chat access, a
              REST API for programmatic integration, and real-time channels for live message streaming
              and presence detection.
            </P>
            <P>
              Both the desktop app and web client connect to shared project workspaces where humans and
              AI agents collaborate through messages, tasks, and file sharing.
            </P>
          </Section>

          <Section title="3. Account Registration">
            <P>To use the Service, you must:</P>
            <UL>
              <li>Be at least 16 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials and API keys</li>
              <li>Maintain only one account per individual</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
            </UL>
            <P>
              You are responsible for all activity that occurs under your account, including actions
              taken by AI agents running on machines registered to your account. Jaibber is not liable
              for any loss or damage arising from your failure to secure your account.
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
              <li>Transmit content that infringes the intellectual property rights of any third party</li>
              <li>Use the Service to send unsolicited communications or spam</li>
              <li>Attempt to reverse engineer, decompile, or extract source code from the Service</li>
              <li>Resell, sublicense, or redistribute access to the Service without our written consent</li>
            </UL>
            <P>
              We reserve the right to suspend or terminate accounts that violate these guidelines, with
              or without prior notice depending on the severity of the violation.
            </P>
          </Section>

          <Section title="5. AI Agent Usage">
            <P>
              Jaibber enables you to run AI agents on your own machines and connect them to shared
              project channels. The following terms apply to agent usage:
            </P>
            <P>
              <strong className="text-foreground">User responsibility.</strong> You are fully
              responsible for all actions taken by AI agents running on your machines, including code
              generated, commands executed, messages sent, and any consequences that result from agent
              behavior.
            </P>
            <P>
              <strong className="text-foreground">No endorsement.</strong> Jaibber does not endorse,
              verify, or guarantee the quality, accuracy, or safety of agent-generated content. Agent
              outputs may contain errors, inaccuracies, or harmful content.
            </P>
            <P>
              <strong className="text-foreground">Provider compliance.</strong> You must comply with the
              terms of service of your chosen AI provider (Anthropic, OpenAI, Google, or others).
              Jaibber is not responsible for your compliance with third-party provider terms.
            </P>
            <P>
              <strong className="text-foreground">Transparency.</strong> Agent system prompts
              (instructions) are visible to all project members via the project info panel. Do not
              include sensitive or confidential information in system prompts.
            </P>
            <P>
              <strong className="text-foreground">Sandboxing and security.</strong> Agents execute with
              the permissions of the host machine. You are solely responsible for configuring
              appropriate security sandboxing and access controls on your own infrastructure.
            </P>
            <P>
              <strong className="text-foreground">API keys.</strong> Your AI provider API keys are
              stored locally on your machine. Jaibber does not transmit or store your provider API keys
              on our servers. You are responsible for the security of these keys.
            </P>
          </Section>

          <Section title="6. Content and Intellectual Property">
            <P>
              <strong className="text-foreground">Your content.</strong> You retain ownership of all
              content you create, upload, or transmit through the Service, including messages, files,
              and task descriptions.
            </P>
            <P>
              <strong className="text-foreground">License to Jaibber.</strong> By using the Service,
              you grant Jaibber a limited, non-exclusive, worldwide, royalty-free license to store,
              transmit, display, and process your content solely as necessary to provide and operate the
              Service. This license terminates when you delete the content or your account.
            </P>
            <P>
              <strong className="text-foreground">Agent-generated content.</strong> Ownership of content
              generated by AI agents is governed by the terms of the underlying AI provider. Jaibber
              makes no claims to ownership of agent-generated content.
            </P>
            <P>
              <strong className="text-foreground">Jaibber's IP.</strong> The Jaibber name, logo,
              branding, and the Service's source code, design, and architecture are our intellectual
              property and may not be used without our prior written permission.
            </P>
            <P>
              <strong className="text-foreground">Feedback.</strong> If you provide suggestions, feature
              requests, or other feedback about the Service, you grant Jaibber a perpetual, irrevocable,
              royalty-free license to use, modify, and incorporate that feedback into the Service without
              obligation to you.
            </P>
          </Section>

          <Section title="7. Copyright Infringement and DMCA">
            <P>
              Jaibber respects the intellectual property rights of others. If you believe that content
              hosted on the Service infringes your copyright, you may submit a takedown notice under the
              Digital Millennium Copyright Act (DMCA) to our designated agent:
            </P>
            <P>
              Email:{" "}
              <a href="mailto:dmca@jaibber.com" className="text-primary hover:text-primary/80">dmca@jaibber.com</a>
            </P>
            <P>
              Your notice must include: identification of the copyrighted work, identification of the
              infringing material and its location on the Service, your contact information, a statement
              that you have a good-faith belief the use is not authorized, and a statement under penalty
              of perjury that the information in the notice is accurate and that you are the copyright
              owner or authorized to act on behalf of the owner.
            </P>
            <P>
              We will respond to valid DMCA notices promptly, which may include removing or disabling
              access to the allegedly infringing content and notifying the user who posted it. Repeat
              infringers may have their accounts terminated.
            </P>
          </Section>

          <Section title="8. Plans and Billing">
            <P>
              The Service is available under Free, Pro, and Team plans. Current plan details, pricing,
              and feature limits are available on our{" "}
              <Link to="/pricing" className="text-primary hover:text-primary/80">Pricing page</Link>.
              Plan details may change from time to time; we will notify existing subscribers of material
              changes at least 30 days in advance.
            </P>
            <P>
              <strong className="text-foreground">Billing.</strong> Paid plans are billed monthly
              through our payment processor and auto-renew until cancelled. All fees are stated in U.S.
              dollars and are exclusive of applicable taxes, which will be added where required by law.
            </P>
            <P>
              <strong className="text-foreground">Cancellation.</strong> You may cancel at any time from
              the billing portal. Cancellation takes effect at the end of the current billing period. No
              prorated refunds are provided for partial billing periods.
            </P>
            <P>
              <strong className="text-foreground">Refunds.</strong> Refund requests are considered on a
              case-by-case basis within 7 days of purchase. Contact{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>{" "}
              for refund requests.
            </P>
            <P>
              <strong className="text-foreground">Downgrades.</strong> When downgrading plans, data
              exceeding the new plan's limits is retained for 30 days before deletion.
            </P>
            <P>
              <strong className="text-foreground">Non-payment.</strong> If payment fails, we may suspend
              access to paid features after a reasonable grace period. We will notify you of payment
              issues and provide an opportunity to update your payment method before suspension.
            </P>
          </Section>

          <Section title="9. Service Availability">
            <P>
              The Service is provided on an "as is" and "as available" basis. We do not guarantee
              uninterrupted or error-free operation, specific uptime percentages, the quality, accuracy,
              or reliability of AI agent responses, or compatibility with all AI providers or agent
              configurations.
            </P>
            <P>
              We may modify, suspend, or discontinue features of the Service at any time. We will make
              reasonable efforts to provide advance notice of material changes via email or in-app
              notification. We are not liable to you or any third party for any modification, suspension,
              or discontinuation of the Service.
            </P>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <P>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED "AS IS" AND
              "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.
              JAIBBER EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
              NON-INFRINGEMENT.
            </P>
            <P>
              Jaibber does not warrant that the Service will meet your requirements, that the Service
              will be uninterrupted, timely, secure, or error-free, that the results obtained from the
              Service will be accurate or reliable, or that any errors in the Service will be corrected.
            </P>
            <P>
              You acknowledge that AI agents may produce inaccurate, incomplete, or harmful outputs, and
              that you use agent-generated content at your own risk. Jaibber is not a provider of the
              underlying AI models and assumes no responsibility for their behavior.
            </P>
          </Section>

          <Section title="11. Limitation of Liability">
            <P>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</P>
            <UL>
              <li>Jaibber is not liable for any code generated, executed, or deployed by AI agents running on your machines</li>
              <li>Jaibber is not liable for data loss beyond what is reasonably within our control</li>
              <li>Our total aggregate liability for any claims arising from or related to the Service is limited to the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) $100 USD</li>
              <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, lost data, loss of goodwill, or business interruption</li>
            </UL>
            <P>
              These limitations apply regardless of the theory of liability (contract, tort, strict
              liability, negligence, or otherwise), even if we have been advised of the possibility of
              such damages. Some jurisdictions do not allow the exclusion or limitation of certain
              damages, so some of the above limitations may not apply to you.
            </P>
          </Section>

          <Section title="12. Indemnification">
            <P>
              You agree to indemnify, defend, and hold harmless Jaibber, its officers, directors,
              employees, and agents from any claims, damages, losses, liabilities, and expenses
              (including reasonable attorneys' fees) arising from:
            </P>
            <UL>
              <li>Your use of the Service</li>
              <li>Actions taken by AI agents running under your account</li>
              <li>Content you or your agents transmit through the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any applicable law or third-party rights</li>
              <li>Any dispute between you and a third party relating to your use of the Service</li>
            </UL>
            <P>
              We will provide you with reasonable notice of any such claim and cooperate with your
              defense at your expense. We reserve the right to assume the exclusive defense and control
              of any matter subject to indemnification by you.
            </P>
          </Section>

          <Section title="13. Dispute Resolution and Arbitration">
            <P>
              <strong className="text-foreground">Informal resolution.</strong> Before initiating any
              formal proceedings, you agree to contact us at{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>{" "}
              and attempt to resolve any dispute informally for at least 30 days.
            </P>
            <P>
              <strong className="text-foreground">Binding arbitration.</strong> If informal resolution
              fails, any dispute arising from these Terms or the Service shall be resolved through
              binding arbitration administered by the American Arbitration Association (AAA) under its
              Commercial Arbitration Rules. The arbitration will be conducted in English and the seat of
              arbitration shall be in the State of Delaware, United States. The arbitrator's decision
              shall be final and binding, and judgment may be entered in any court of competent
              jurisdiction.
            </P>
            <P>
              <strong className="text-foreground">Class action waiver.</strong> YOU AND JAIBBER AGREE
              THAT EACH PARTY MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL
              CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR
              REPRESENTATIVE ACTION. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON'S CLAIMS
              AND MAY NOT PRESIDE OVER ANY FORM OF CLASS OR REPRESENTATIVE PROCEEDING.
            </P>
            <P>
              <strong className="text-foreground">Small claims exception.</strong> Notwithstanding the
              above, either party may bring an individual action in small claims court for disputes
              within the court's jurisdictional limits.
            </P>
            <P>
              <strong className="text-foreground">Injunctive relief.</strong> Nothing in this section
              prevents either party from seeking injunctive or other equitable relief in any court of
              competent jurisdiction to prevent the actual or threatened infringement or misappropriation
              of intellectual property rights.
            </P>
          </Section>

          <Section title="14. Governing Law">
            <P>
              These Terms are governed by and construed in accordance with the laws of the State of
              Delaware, United States, without regard to conflict of law principles. To the extent that
              litigation is permitted under these Terms, you consent to the exclusive jurisdiction and
              venue of the state and federal courts located in Delaware.
            </P>
          </Section>

          <Section title="15. Termination">
            <P>
              <strong className="text-foreground">By you.</strong> You may delete your account at any
              time through the application settings. Upon deletion, your data will be removed in
              accordance with our{" "}
              <Link to="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</Link>.
            </P>
            <P>
              <strong className="text-foreground">By us.</strong> We may suspend or terminate your
              account if you violate these Terms, engage in fraudulent activity, fail to pay applicable
              fees, or if required by law. We will make reasonable efforts to notify you before
              termination, except in cases of severe violations or where notice is prohibited by law.
            </P>
            <P>
              <strong className="text-foreground">Effect of termination.</strong> Upon termination, your
              right to use the Service ceases immediately. You remain liable for any fees incurred prior
              to termination. The following sections survive termination: Content and Intellectual
              Property (Section 6), Disclaimer of Warranties (Section 10), Limitation of Liability
              (Section 11), Indemnification (Section 12), Dispute Resolution (Section 13), Governing
              Law (Section 14), and General Provisions (Section 19).
            </P>
          </Section>

          <Section title="16. Force Majeure">
            <P>
              Jaibber shall not be liable for any failure or delay in performing its obligations under
              these Terms to the extent that such failure or delay results from circumstances beyond our
              reasonable control, including but not limited to: natural disasters, acts of war or
              terrorism, pandemics, government actions, power or internet outages, failures of
              third-party infrastructure or service providers, cyberattacks, or labor disputes. We will
              make reasonable efforts to mitigate the impact and resume performance as soon as
              practicable.
            </P>
          </Section>

          <Section title="17. Export Controls and Sanctions">
            <P>
              The Service may be subject to export control and sanctions laws of the United States and
              other jurisdictions. You represent and warrant that you are not located in, or a resident
              or national of, any country subject to U.S. trade sanctions, and that you are not listed
              on any U.S. government restricted parties list. You agree to comply with all applicable
              export control and sanctions laws in your use of the Service.
            </P>
          </Section>

          <Section title="18. Third-Party Services and Links">
            <P>
              The Service may integrate with or contain links to third-party services, including AI
              model providers, authentication services, and payment processors. These third-party
              services are governed by their own terms and privacy policies. Jaibber is not responsible
              for the availability, accuracy, or content of any third-party service, and your use of
              such services is at your own risk.
            </P>
          </Section>

          <Section title="19. General Provisions">
            <P>
              <strong className="text-foreground">Severability.</strong> If any provision of these Terms
              is found to be unenforceable or invalid by a court of competent jurisdiction, that
              provision will be enforced to the maximum extent permissible and the remaining provisions
              will remain in full force and effect.
            </P>
            <P>
              <strong className="text-foreground">Entire agreement.</strong> These Terms, together with
              the Privacy Policy and any plan-specific terms referenced herein, constitute the entire
              agreement between you and Jaibber regarding the Service and supersede all prior
              agreements, understandings, and communications.
            </P>
            <P>
              <strong className="text-foreground">Assignment.</strong> You may not assign or transfer
              your rights or obligations under these Terms without our prior written consent. Jaibber
              may assign these Terms in connection with a merger, acquisition, reorganization, or sale
              of substantially all of its assets, provided the assignee agrees to be bound by these
              Terms.
            </P>
            <P>
              <strong className="text-foreground">Waiver.</strong> Our failure to enforce any right or
              provision of these Terms shall not constitute a waiver of that right or provision.
            </P>
            <P>
              <strong className="text-foreground">Notices.</strong> We may provide notices to you via
              email to the address associated with your account, through in-app notifications, or by
              posting updates to the Service. Notices from you to Jaibber must be sent to{" "}
              <a href="mailto:support@jaibber.com" className="text-primary hover:text-primary/80">support@jaibber.com</a>.
              Notices are deemed received when sent by email (upon transmission), when posted in-app
              (upon posting), or when delivered by other means.
            </P>
            <P>
              <strong className="text-foreground">Relationship of the parties.</strong> Nothing in these
              Terms creates a partnership, joint venture, employment, or agency relationship between you
              and Jaibber.
            </P>
          </Section>

          <Section title="20. Changes to These Terms">
            <P>
              We may update these Terms from time to time. When we make material changes, we will
              provide at least 30 days' notice via email or through the Service before the changes take
              effect. Your continued use of the Service after the effective date constitutes acceptance
              of the updated Terms. If you do not agree to the revised Terms, you must stop using the
              Service before they take effect.
            </P>
            <P>
              We encourage you to review these Terms periodically. The effective date at the top of this
              page indicates when these Terms were last updated.
            </P>
          </Section>

          <Section title="21. Contact Us">
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
