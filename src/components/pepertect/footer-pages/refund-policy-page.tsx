'use client'

import { RotateCcw } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'

export function RefundPolicyPage() {
  return (
    <FooterPageLayout
      title="Refund Policy"
      icon={<RotateCcw className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      <div
        className="my-4 px-5 py-4 rounded-xl"
        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
      >
        <p className="text-sm font-medium" style={{ color: '#15803d' }}>
          ✅ Pepertect is completely FREE. There are no charges, no subscriptions, and no payments required to use our platform.
        </p>
      </div>

      <Section title="1. No Payments Required">
        <p>Pepertect is a free paper trading simulator. We do not charge any fees for:</p>
        <ul>
          <li>Account creation</li>
          <li>Virtual trading</li>
          <li>Access to market data</li>
          <li>Using any features of the platform</li>
          <li>Account maintenance</li>
        </ul>
        <p>Since no payments are collected, there is no question of refunds.</p>
      </Section>

      <Section title="2. Future Premium Features">
        <p>If we introduce any premium features or paid plans in the future, the following refund policy will apply:</p>
        <SubSection title="2.1 Subscription Refunds">
          <ul>
            <li><strong>7-Day Free Trial:</strong> All paid subscriptions will include a 7-day free trial. You can cancel during the trial period without any charges.</li>
            <li><strong>Monthly Subscriptions:</strong> If you cancel within the first 7 days of a paid month, you will receive a full refund.</li>
            <li><strong>Annual Subscriptions:</strong> If you cancel within the first 14 days, you will receive a full refund. After 14 days, a pro-rated refund will be issued for the remaining months.</li>
          </ul>
        </SubSection>
        <SubSection title="2.2 Refund Process">
          <ul>
            <li>Refunds will be processed within 5-7 business days</li>
            <li>Refunds will be credited to the original payment method</li>
            <li>You will receive an email confirmation once the refund is processed</li>
            <li>Processing time depends on your bank/payment provider</li>
          </ul>
        </SubSection>
        <SubSection title="2.3 Non-Refundable Items">
          <ul>
            <li>Subscriptions cancelled after the eligible refund period</li>
            <li>Account upgrades or one-time purchases used for more than 50% of their intended duration</li>
            <li>Services that have been fully utilized</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="3. Virtual Money & In-App Purchases">
        <p>Pepertect uses virtual money that has no real-world value. Important points:</p>
        <ul>
          <li>Virtual money (₹1,00,000 starting balance) cannot be purchased, sold, or transferred for real money</li>
          <li>Virtual profits and losses have no financial value</li>
          <li>If we introduce any virtual goods or features, they are non-refundable and non-transferable</li>
          <li>Resetting your account will restore your virtual balance to ₹1,00,000 at no cost</li>
        </ul>
      </Section>

      <Section title="4. Account Deletion & Data">
        <ul>
          <li>If you choose to delete your account, all your data (virtual balance, trades, positions) will be permanently removed</li>
          <li>Since no real money is involved, there is no financial settlement upon account deletion</li>
          <li>Data deletion is irreversible — you cannot recover your trading history after account deletion</li>
        </ul>
      </Section>

      <Section title="5. Technical Issues & Compensation">
        <p>If you experience technical issues that result in:</p>
        <ul>
          <li>Loss of virtual data due to platform errors (not user action)</li>
          <li>Incorrect trade execution due to system bugs</li>
          <li>Extended platform downtime affecting your trading</li>
        </ul>
        <p>Contact us at support@pepertect.app and we will work to resolve the issue. For the free tier, compensation will be in the form of account adjustments or extended features, not monetary refunds.</p>
      </Section>

      <Section title="6. How to Request a Refund">
        <p>If a paid feature is introduced and you need a refund:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Email us at refunds@pepertect.app</li>
          <li>Include your registered email and transaction details</li>
          <li>State the reason for the refund request</li>
          <li>We will review and respond within 48 hours</li>
        </ol>
      </Section>

      <Section title="7. Changes to This Policy">
        <p>We may update this Refund Policy from time to time. Any changes will be posted on this page with an updated &quot;Last updated&quot; date. For material changes, we will provide reasonable notice.</p>
      </Section>

      <Section title="8. Contact">
        <p>For refund-related questions:</p>
        <ul>
          <li>Email: refunds@pepertect.app</li>
          <li>General Support: support@pepertect.app</li>
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
