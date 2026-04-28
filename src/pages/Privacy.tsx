import LegalPage from "@/components/LegalPage";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="font-display text-2xl sm:text-3xl font-medium text-foreground mb-4">{title}</h2>
    <div className="space-y-3 text-[15px]">{children}</div>
  </section>
);

const Privacy = () => {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="April 2026">
      <p className="text-[15px] text-muted-foreground italic">
        At RealVision, we treat your data with the same care we put into every staged room.
        This policy explains what we collect, why we collect it, and how it's protected.
      </p>

      <Section title="Information We Collect">
        <p>We collect only what's necessary to deliver the service:</p>
        <ul className="list-disc list-outside pl-5 space-y-2 marker:text-accent">
          <li><strong>Account data</strong> — email address and authentication credentials.</li>
          <li><strong>Uploaded images</strong> — room photos you submit for staging.</li>
          <li><strong>Generated stagings</strong> — AI-rendered outputs and associated metadata (room type, style, timestamps).</li>
          <li><strong>Usage data</strong> — staging counts, plan tier, and basic activity logs.</li>
        </ul>
      </Section>

      <Section title="How We Use Your Data">
        <p>
          Your images and account data are used solely to operate RealVision: generating stagings,
          enforcing plan limits, displaying your gallery, and providing customer support. We do not
          sell your data, and we do not use your photos to train third-party AI models.
        </p>
      </Section>

      <Section title="AI Processing">
        <p>
          Uploaded images are sent to our AI provider (Google Gemini via the Lovable AI Gateway)
          to generate the staged result. Images are processed on-demand and are not retained by
          the AI provider beyond the request lifecycle.
        </p>
      </Section>

      <Section title="Storage & Security">
        <p>
          Images and stagings are stored in our secure cloud backend with row-level security,
          ensuring that only you can access your content. Public share links are generated only
          when you explicitly create one.
        </p>
      </Section>

      <Section title="Your Rights">
        <p>
          You may request deletion of your account and associated data at any time by contacting{" "}
          <a href="mailto:support@realvision.ai" className="text-accent hover:underline">
            support@realvision.ai
          </a>
          . We will honor verified deletion requests within 30 days.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use only essential cookies required for authentication and session management.
          We do not use third-party advertising or tracking cookies.
        </p>
      </Section>

      <Section title="Changes to This Policy">
        <p>
          We may update this policy as RealVision evolves. Material changes will be communicated
          via email or in-app notification.
        </p>
      </Section>
    </LegalPage>
  );
};

export default Privacy;
