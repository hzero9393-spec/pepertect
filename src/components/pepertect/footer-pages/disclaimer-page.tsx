'use client'

import { AlertTriangle } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'

export function DisclaimerPage() {
  return (
    <FooterPageLayout
      title="Disclaimer"
      icon={<AlertTriangle className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      <div
        className="my-4 px-5 py-4 rounded-xl"
        style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
      >
        <p className="text-sm font-bold mb-2" style={{ color: '#991b1b' }}>
          ⚠️ PLEASE READ THIS DISCLAIMER CAREFULLY BEFORE USING PEPERTECT
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#7f1d1d' }}>
          Pepertect is a paper trading simulator for educational and entertainment purposes only. 
          It does NOT involve real money, real securities, or real financial transactions of any kind.
        </p>
      </div>

      <Section title="1. Not Financial Advice">
        <p>The content, tools, and features provided on Pepertect are for informational and educational purposes only. Nothing on this Platform constitutes financial advice, investment advice, trading advice, or any other form of professional advice.</p>
        <p>You should not treat any information on Pepertect as a recommendation to buy, sell, or hold any security or financial instrument in real markets. Always consult with a qualified financial advisor before making real investment decisions.</p>
      </Section>

      <Section title="2. Simulated Trading Environment">
        <ul>
          <li><strong>Virtual Money Only:</strong> All trading on Pepertect uses virtual/fake money. No real financial transactions occur.</li>
          <li><strong>No Real Securities:</strong> No actual stocks, options, futures, or other securities are bought or sold through this platform.</li>
          <li><strong>Simulated Execution:</strong> Trade execution in the simulator may differ significantly from real market conditions. Factors like slippage, liquidity, market impact, and order timing are simulated and may not reflect reality.</li>
          <li><strong>Virtual P&L:</strong> Profits and losses shown are virtual and have no real-world financial value. Success in the simulator does not guarantee success in real markets.</li>
        </ul>
      </Section>

      <Section title="3. Market Data Limitations">
        <ul>
          <li><strong>Delayed Data:</strong> Market data on Pepertect may be delayed and should not be relied upon for real-time trading decisions.</li>
          <li><strong>Data Accuracy:</strong> While we strive for accuracy, market data may contain errors, omissions, or inaccuracies.</li>
          <li><strong>Not for Real Trading:</strong> Do not use Pepertect&apos;s data to make actual trading or investment decisions.</li>
          <li><strong>Third-Party Sources:</strong> Market data is sourced from third-party APIs and we cannot guarantee its completeness or accuracy.</li>
        </ul>
      </Section>

      <Section title="4. Risk of Real Trading">
        <div
          className="my-4 px-4 py-3 rounded-lg"
          style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
        >
          <p className="text-sm font-medium mb-2">⚠️ Real Trading Involves Significant Risk</p>
          <ul className="text-sm space-y-1">
            <li>• Trading in real stock/derivatives markets involves substantial risk of loss</li>
            <li>• You may lose some or all of your invested capital</li>
            <li>• Options and futures trading carries especially high risk</li>
            <li>• Past performance (even simulated) does not guarantee future results</li>
            <li>• Never invest money you cannot afford to lose</li>
          </ul>
        </div>
        <p>Success or profitability in Pepertect&apos;s simulated environment does not indicate that you will be profitable in real markets. Real markets involve emotional factors, real financial risk, and execution differences that cannot be fully simulated.</p>
      </Section>

      <Section title="5. No Guarantee of Results">
        <p>Pepertect does not guarantee any specific results, returns, or outcomes from using the platform. Your virtual trading performance is not indicative of future real-world trading performance. We make no representations or warranties about the accuracy, reliability, completeness, or timeliness of the platform&apos;s content or data.</p>
      </Section>

      <Section title="6. Educational Purpose">
        <p>Pepertect is designed to help users:</p>
        <ul>
          <li>Learn about Indian stock markets and trading concepts</li>
          <li>Practice trading strategies without financial risk</li>
          <li>Understand how options, futures, and other instruments work</li>
          <li>Develop familiarity with market mechanics and terminology</li>
        </ul>
        <p>It is NOT designed to be a substitute for professional financial education, advice, or real trading experience.</p>
      </Section>

      <Section title="7. Legal Compliance">
        <p>Pepertect is not registered with SEBI (Securities and Exchange Board of India) or any other financial regulatory authority. We are not a stockbroker, investment advisor, or financial intermediary. We do not facilitate real financial transactions of any kind.</p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>To the fullest extent permitted by law, Pepertect and its operators shall not be liable for any losses, damages, or liabilities arising from:</p>
        <ul>
          <li>Your use of or inability to use the Platform</li>
          <li>Any financial decisions you make based on your simulator experience</li>
          <li>Errors, inaccuracies, or delays in market data</li>
          <li>Technical issues, downtime, or data loss</li>
          <li>Your reliance on any information provided on the Platform</li>
        </ul>
      </Section>

      <Section title="9. Acceptance">
        <p>By using Pepertect, you acknowledge that you have read, understood, and agree to this Disclaimer. If you do not agree with any part of this Disclaimer, please discontinue use of the Platform immediately.</p>
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
