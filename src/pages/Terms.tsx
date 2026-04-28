import LegalPage from "@/components/LegalPage";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="font-display text-2xl sm:text-3xl font-medium text-foreground mb-4">{title}</h2>
    <div className="space-y-3 text-[15px]">{children}</div>
  </section>
);

const Terms = () => {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" updated="April 2026">
      <p className="text-[15px] text-muted-foreground italic">
        By using RealVision, you agree to the following terms. Please read them carefully —
        they govern your relationship with our service.
      </p>

      <Section title="The Service">
        <p>
          RealVision provides AI-powered virtual staging for real estate imagery. We transform
          photos of vacant or furnished rooms into professionally staged renderings to help you
          market properties more effectively.
        </p>
      </Section>

      <Section title="Your Account">
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity under your account. You must be at least 18 years old to use RealVision.
        </p>
      </Section>

      <Section title="Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc list-outside pl-5 space-y-2 marker:text-accent">
          <li>Upload images you do not have rights to use.</li>
          <li>Use the service to generate misleading, fraudulent, or deceptive content.</li>
          <li>Attempt to reverse-engineer, scrape, or abuse our infrastructure.</li>
          <li>Resell or redistribute the raw service without written permission.</li>
        </ul>
      </Section>

      <Section title="Ownership of Outputs">
        <p>
          You retain ownership of the original photos you upload. Subject to these Terms and
          payment of any applicable fees, you receive a worldwide, royalty-free license to use
          the staged outputs for your real estate marketing purposes.
        </p>
        <p>
          AI-generated outputs from free-tier accounts may include a discreet RealVision watermark.
        </p>
      </Section>

      <Section title="Subscriptions & Billing">
        <p>
          Paid plans are billed on a monthly or annual basis. Plan limits reset at the start of
          each billing cycle. You may cancel at any time; access continues until the end of the
          paid period. Refunds are handled on a case-by-case basis.
        </p>
      </Section>

      <Section title="Service Availability">
        <p>
          We strive for high uptime but do not guarantee uninterrupted service. AI generation
          depends on third-party providers and may occasionally be unavailable or rate-limited.
        </p>
      </Section>

      <Section title="Disclaimer">
        <p>
          RealVision is provided "as is" without warranties of any kind. Staged outputs are
          artistic visualizations and should be disclosed as virtually staged when used in
          property listings, in accordance with local real estate regulations.
        </p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, RealVision's total liability shall not exceed
          the amount you paid us in the twelve months preceding the claim.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          We may suspend or terminate accounts that violate these Terms. You may close your
          account at any time by contacting support.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For any questions regarding these Terms, reach out to{" "}
          <a href="mailto:support@realvision.ai" className="text-accent hover:underline">
            support@realvision.ai
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
};

export default Terms;
