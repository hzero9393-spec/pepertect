'use client'

import { Info, Users, Target, Award, TrendingUp, Shield, Lightbulb, Globe } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'

export function AboutUsPage() {
  return (
    <FooterPageLayout
      title="About Us"
      icon={<Info className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      {/* Hero */}
      <div className="p-6 rounded-xl mb-6" style={{ background: 'linear-gradient(135deg, #00D09C, #7c3aed)' }}>
        <h2 className="text-xl font-bold text-white mb-2">Making Market Education Accessible to Every Indian</h2>
        <p className="text-sm text-white/80 leading-relaxed">
          Pepertect was born from a simple idea — everyone should have the opportunity to learn about stock markets without risking their hard-earned money.
        </p>
      </div>

      {/* Mission */}
      <Section title="Our Mission">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MissionCard
            icon={<Target className="size-5" />}
            title="Democratize Market Education"
            description="Make stock market learning free and accessible to every Indian, regardless of their financial background."
          />
          <MissionCard
            icon={<Shield className="size-5" />}
            title="Risk-Free Learning"
            description="Provide a safe environment where beginners can make mistakes and learn without losing real money."
          />
          <MissionCard
            icon={<Lightbulb className="size-5" />}
            title="Practical Knowledge"
            description="Go beyond theory — let users experience real market mechanics through hands-on practice."
          />
          <MissionCard
            icon={<Globe className="size-5" />}
            title="India-First Approach"
            description="Built specifically for Indian markets — NSE, BSE, NIFTY, BANKNIFTY, and Indian stocks."
          />
        </div>
      </Section>

      {/* Story */}
      <Section title="Our Story">
        <p>
          India has one of the fastest-growing retail investor populations in the world. Millions of young Indians are entering the stock market for the first time, but many lack the knowledge and experience needed to navigate it safely.
        </p>
        <p>
          We noticed that most trading education resources were either too theoretical or too expensive. Books and courses can only teach so much — real learning happens through practice. But practicing with real money is risky, especially for beginners.
        </p>
        <p>
          That&apos;s why we built Pepertect — a free, realistic paper trading simulator where anyone can practice trading Indian stocks, options, and futures without risking a single rupee. With ₹1,00,000 in virtual money, users can explore strategies, understand market mechanics, and build confidence before entering real markets.
        </p>
      </Section>

      {/* Numbers */}
      <Section title="Pepertect by Numbers">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard number="10K+" label="Active Traders" />
          <StatCard number="5L+" label="Trades Executed" />
          <StatCard number="₹10Cr+" label="Virtual Volume" />
          <StatCard number="4.8★" label="User Rating" />
        </div>
      </Section>

      {/* Values */}
      <Section title="Our Values">
        <div className="space-y-3">
          <ValueItem
            icon={<Users className="size-5" />}
            title="User First"
            description="Every feature we build starts with the question: 'How does this help our users learn better?'"
          />
          <ValueItem
            icon={<Award className="size-5" />}
            title="Honesty & Transparency"
            description="We clearly state that Pepertect is a simulator. We never mislead users about the nature of paper trading."
          />
          <ValueItem
            icon={<TrendingUp className="size-5" />}
            title="Continuous Improvement"
            description="We constantly work on adding new features, improving data accuracy, and enhancing the learning experience."
          />
        </div>
      </Section>

      {/* Team */}
      <Section title="Our Team">
        <p>
          Pepertect is built by a passionate team of developers, traders, and educators who believe that financial literacy should be accessible to everyone. Our team combines expertise in technology, Indian financial markets, and education to create the best possible learning platform.
        </p>
      </Section>

      {/* Contact CTA */}
      <div className="mt-6 p-6 rounded-xl text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#15803d' }}>Want to Contribute?</h3>
        <p className="text-sm mb-4" style={{ color: '#166534' }}>
          We&apos;re always looking for feedback, suggestions, and partnerships to improve Pepertect.
        </p>
        <a
          href="mailto:hello@pepertect.app"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: '#16a34a', color: '#ffffff' }}
        >
          Get in Touch
        </a>
      </div>
    </FooterPageLayout>
  )
}

function MissionCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
      <div className="flex size-10 items-center justify-center rounded-lg mb-3" style={{ background: '#00D09C15', color: '#00D09C' }}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: '#1a1a1a' }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{description}</p>
    </div>
  )
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="p-4 rounded-xl text-center" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
      <p className="text-xl font-bold" style={{ color: '#00D09C' }}>{number}</p>
      <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{label}</p>
    </div>
  )
}

function ValueItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: '#f9fafb' }}>
      <div className="flex size-10 items-center justify-center rounded-lg shrink-0" style={{ background: '#00D09C15', color: '#00D09C' }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{title}</h3>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6b7280' }}>{description}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3" style={{ color: '#1a1a1a' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: '#4b5563' }}>
        {children}
      </div>
    </div>
  )
}
