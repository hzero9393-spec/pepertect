'use client'

import { Shield } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'

export function PrivacyPolicyPage() {
  return (
    <FooterPageLayout
      title="Privacy Policy"
      icon={<Shield className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      <Section title="1. Introduction">
        <p>Pepertect (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our paper trading platform at pepertect.app (&quot;Platform&quot;). Please read this policy carefully. By using Pepertect, you agree to the collection and use of information in accordance with this policy.</p>
      </Section>

      <Section title="2. Information We Collect">
        <SubSection title="2.1 Personal Information">
          <ul>
            <li><strong>Account Information:</strong> When you register, we collect your name, email address, and password (stored in encrypted form).</li>
            <li><strong>Profile Information:</strong> Any additional information you choose to provide in your profile.</li>
          </ul>
        </SubSection>
        <SubSection title="2.2 Usage Data">
          <ul>
            <li><strong>Trading Activity:</strong> Your virtual trades, positions, orders, portfolio data, and trading history within the simulator.</li>
            <li><strong>Interaction Data:</strong> Pages visited, features used, time spent, and navigation patterns.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device type, and IP address.</li>
          </ul>
        </SubSection>
        <SubSection title="2.3 Cookies & Local Storage">
          <ul>
            <li>We use cookies and local storage for authentication, preferences, and session management.</li>
            <li>Essential cookies are required for the Platform to function properly.</li>
            <li>Analytics cookies help us understand how users interact with our Platform.</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul>
          <li>To create and manage your account and provide our services</li>
          <li>To maintain your virtual trading portfolio and simulation data</li>
          <li>To communicate with you about your account, updates, and support</li>
          <li>To improve our Platform, features, and user experience</li>
          <li>To detect, prevent, and address technical issues or fraud</li>
          <li>To generate anonymous, aggregated analytics about platform usage</li>
        </ul>
      </Section>

      <Section title="4. Data Sharing & Disclosure">
        <p>We do NOT sell your personal information. We may share your data only in the following circumstances:</p>
        <ul>
          <li><strong>Service Providers:</strong> Third-party services that help us operate the platform (hosting, analytics) under strict data protection agreements.</li>
          <li><strong>Legal Requirements:</strong> If required by law, regulation, or legal process.</li>
          <li><strong>Leaderboards:</strong> Your username and trading performance may appear on public leaderboards if you opt in.</li>
          <li><strong>Business Transfers:</strong> In connection with any merger, acquisition, or sale of assets.</li>
        </ul>
      </Section>

      <Section title="5. Data Security">
        <ul>
          <li>All passwords are encrypted using bcrypt hashing</li>
          <li>Authentication tokens use JWT with secure practices</li>
          <li>Data transmission is encrypted via HTTPS/TLS</li>
          <li>Access controls limit who can access personal data</li>
        </ul>
        <p>While we strive to protect your data, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>
      </Section>

      <Section title="6. Data Retention">
        <p>We retain your account data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law. Anonymous, aggregated data may be retained indefinitely for analytics.</p>
      </Section>

      <Section title="7. Your Rights">
        <ul>
          <li><strong>Access:</strong> You can view your personal data in your profile settings.</li>
          <li><strong>Correction:</strong> You can update your profile information at any time.</li>
          <li><strong>Deletion:</strong> You can request account deletion by contacting us.</li>
          <li><strong>Data Portability:</strong> You can export your trading data from the platform.</li>
          <li><strong>Opt-out:</strong> You can opt out of non-essential communications.</li>
        </ul>
      </Section>

      <Section title="8. Children's Privacy">
        <p>Pepertect is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will take steps to delete it.</p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Platform after changes constitutes acceptance of the updated policy.</p>
      </Section>

      <Section title="10. Contact Us">
        <p>If you have questions about this Privacy Policy, please contact us at:</p>
        <ul>
          <li>Email: privacy@pepertect.app</li>
          <li>Support Page: pepertect.app/support</li>
        </ul>
      </Section>
    </FooterPageLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a2e' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: '#4b5563' }}>
        {children}
      </div>
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>{title}</h3>
      <div className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>
        {children}
      </div>
    </div>
  )
}
