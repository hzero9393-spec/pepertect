'use client'

import { FileText } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'

export function TermsOfServicePage() {
  return (
    <FooterPageLayout
      title="Terms of Service"
      icon={<FileText className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      <Section title="1. Acceptance of Terms">
        <p>By accessing or using Pepertect (&quot;Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Platform. These Terms constitute a legally binding agreement between you and Pepertect.</p>
      </Section>

      <Section title="2. Description of Service">
        <p>Pepertect is a <strong>paper trading simulator</strong> designed for educational and entertainment purposes only. The Platform provides:</p>
        <ul>
          <li>Virtual trading of Indian stock market instruments (NIFTY, BANKNIFTY, SENSEX options, futures, and stocks)</li>
          <li>A virtual balance of ₹1,00,000 for trading simulation</li>
          <li>Market data that may be delayed or simulated</li>
          <li>Educational resources about trading and markets</li>
          <li>Performance tracking and leaderboards</li>
        </ul>
        <div
          className="my-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
        >
          <strong>CRITICAL:</strong> Pepertect does NOT involve real money. All trades are simulated. No actual securities are bought or sold. This is NOT a brokerage or financial service.
        </div>
      </Section>

      <Section title="3. User Accounts">
        <SubSection title="3.1 Registration">
          <ul>
            <li>You must provide accurate and complete information during registration.</li>
            <li>You must be at least 13 years old to create an account.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>One person may maintain only one account.</li>
          </ul>
        </SubSection>
        <SubSection title="3.2 Account Security">
          <ul>
            <li>You are responsible for all activities under your account.</li>
            <li>Notify us immediately of any unauthorized access.</li>
            <li>We are not liable for losses from unauthorized access to your account.</li>
          </ul>
        </SubSection>
        <SubSection title="3.3 Account Suspension/Termination">
          <p>We reserve the right to suspend or terminate accounts that:</p>
          <ul>
            <li>Violate these Terms</li>
            <li>Engage in fraudulent or abusive behavior</li>
            <li>Attempt to manipulate the platform or leaderboards</li>
            <li>Create multiple accounts</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="4. Virtual Trading Rules">
        <ul>
          <li>All trades are executed using virtual money only — no real financial transactions occur.</li>
          <li>Each user starts with ₹1,00,000 virtual balance. This balance cannot be purchased, sold, or transferred for real money.</li>
          <li>Virtual profits and losses are simulated and have no real-world financial value.</li>
          <li>Market data may be delayed, simulated, or approximate — it does not represent real-time trading conditions.</li>
          <li>Trade execution in the simulator may differ from real market execution (slippage, liquidity, etc.).</li>
          <li>We reserve the right to reset, modify, or adjust virtual balances and positions.</li>
        </ul>
      </Section>

      <Section title="5. Prohibited Conduct">
        <p>You agree NOT to:</p>
        <ul>
          <li>Use the Platform for any illegal purpose or in violation of any laws</li>
          <li>Attempt to gain unauthorized access to the Platform or other users&apos; accounts</li>
          <li>Create multiple accounts to manipulate leaderboards or game the system</li>
          <li>Use automated scripts, bots, or scraping tools without permission</li>
          <li>Reverse engineer, decompile, or disassemble the Platform</li>
          <li>Transmit any malware, spam, or harmful content</li>
          <li>Impersonate any person or entity</li>
          <li>Share your account credentials with others</li>
          <li>Represent paper trading results as real trading performance</li>
        </ul>
      </Section>

      <Section title="6. Intellectual Property">
        <ul>
          <li>All content, design, graphics, and code on Pepertect are owned by or licensed to us.</li>
          <li>You may not copy, modify, distribute, or create derivative works without our permission.</li>
          <li>The Pepertect name, logo, and brand elements are our trademarks and may not be used without permission.</li>
          <li>User-generated content (comments, posts) remains the user&apos;s property, but you grant us a license to use it on the Platform.</li>
        </ul>
      </Section>

      <Section title="7. Disclaimers">
        <div
          className="my-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
        >
          <strong>⚠️ IMPORTANT DISCLAIMERS:</strong>
          <ul className="mt-2 space-y-1">
            <li>• The Platform is provided &quot;AS IS&quot; without warranties of any kind.</li>
            <li>• We do NOT provide financial advice, investment recommendations, or brokerage services.</li>
            <li>• Past simulated performance does not guarantee future results in real markets.</li>
            <li>• Trading in real markets involves substantial risk of loss — your simulator results may differ significantly.</li>
            <li>• Market data may be delayed, inaccurate, or incomplete.</li>
          </ul>
        </div>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>To the fullest extent permitted by law:</p>
        <ul>
          <li>Pepertect shall not be liable for any direct, indirect, incidental, special, or consequential damages.</li>
          <li>We are not liable for any financial decisions you make based on your experience with the simulator.</li>
          <li>Our total liability shall not exceed ₹1,000 or the amount you paid to use the Platform (whichever is greater).</li>
          <li>We are not liable for any loss of virtual data, positions, or balance due to technical issues.</li>
        </ul>
      </Section>

      <Section title="9. Indemnification">
        <p>You agree to indemnify and hold harmless Pepertect and its operators from any claims, damages, losses, or expenses arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.</p>
      </Section>

      <Section title="10. Modifications">
        <p>We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use after changes constitutes acceptance. We will make reasonable efforts to notify you of material changes.</p>
      </Section>

      <Section title="11. Governing Law">
        <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
      </Section>

      <Section title="12. Contact">
        <p>For questions about these Terms, contact us at:</p>
        <ul>
          <li>Email: legal@pepertect.app</li>
          <li>Support: pepertect.app/support</li>
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
