'use client'

import { Headphones, Mail, MessageCircle, Clock, BookOpen, Video, FileText, ExternalLink } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'
import { useAppStore } from '@/lib/store'

export function SupportPage() {
  const { setCurrentPage } = useAppStore()

  return (
    <FooterPageLayout
      title="Support Center"
      icon={<Headphones className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SupportCard
          icon={<Mail className="size-5" />}
          title="Email Support"
          description="Send us a detailed email and we'll respond within 24 hours"
          action="support@pepertect.app"
          color="#00D09C"
        />
        <SupportCard
          icon={<MessageCircle className="size-5" />}
          title="Live Chat"
          description="Chat with our support team during business hours"
          action="Start Chat"
          color="#10b981"
        />
        <SupportCard
          icon={<BookOpen className="size-5" />}
          title="Knowledge Base"
          description="Browse articles and tutorials to find answers"
          action="Browse Articles"
          color="#f59e0b"
          onClick={() => setCurrentPage('learning')}
        />
        <SupportCard
          icon={<FileText className="size-5" />}
          title="FAQ"
          description="Check frequently asked questions for quick answers"
          action="View FAQ"
          color="#8b5cf6"
          onClick={() => setCurrentPage('faq')}
        />
      </div>

      <Section title="Support Hours">
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <Clock className="size-5 shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#15803d' }}>Business Hours (IST)</p>
            <p className="text-sm mt-1" style={{ color: '#166534' }}>Monday - Friday: 9:00 AM - 6:00 PM</p>
            <p className="text-sm" style={{ color: '#166534' }}>Saturday: 10:00 AM - 2:00 PM</p>
            <p className="text-sm" style={{ color: '#166534' }}>Sunday: Closed (Emergency email only)</p>
          </div>
        </div>
      </Section>

      <Section title="Common Issues & Solutions">
        <div className="space-y-3">
          <IssueCard
            question="My virtual balance is showing wrong"
            answer="Go to Profile → Reset Account to reset your virtual balance to ₹1,00,000. Note: This will clear all your positions and orders."
          />
          <IssueCard
            question="Trades are not executing"
            answer="Ensure you're trading during market hours (9:15 AM - 3:30 PM IST). Also check if you have sufficient virtual balance for the trade."
          />
          <IssueCard
            question="Market data is not updating"
            answer="Refresh the page. Market data may have a delay. If the issue persists, check our status page or contact support."
          />
          <IssueCard
            question="I can't login to my account"
            answer="Try resetting your password using the 'Forgot Password' option. If you don't receive the reset email, check your spam folder or contact support."
          />
          <IssueCard
            question="Option chain data seems incorrect"
            answer="Option chain data is based on available market data and may be delayed. Real-time data requires API integration. We're working on improving this."
          />
        </div>
      </Section>

      <Section title="Video Tutorials">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <VideoCard title="Getting Started with Pepertect" duration="5 min" />
          <VideoCard title="How to Place Your First Trade" duration="8 min" />
          <VideoCard title="Understanding Option Chain" duration="12 min" />
          <VideoCard title="Reading Charts & Indicators" duration="10 min" />
        </div>
      </Section>

      <Section title="Report a Bug">
        <p>Found a bug? Help us improve by reporting it:</p>
        <ol className="list-decimal pl-5 space-y-1 mt-2">
          <li>Describe the issue in detail</li>
          <li>Include steps to reproduce the bug</li>
          <li>Mention your browser and device</li>
          <li>Add screenshots if possible</li>
          <li>Send to: bugs@pepertect.app</li>
        </ol>
      </Section>
    </FooterPageLayout>
  )
}

function SupportCard({ icon, title, description, action, color, onClick }: {
  icon: React.ReactNode; title: string; description: string; action: string; color: string; onClick?: () => void
}) {
  return (
    <div
      className="p-4 rounded-xl cursor-pointer transition-all"
      style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 4px 12px ${color}15`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg shrink-0" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{title}</h3>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{description}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs font-medium" style={{ color }}>{action}</span>
            <ExternalLink className="size-3" style={{ color }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function IssueCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="p-4 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
      <h4 className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{question}</h4>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#6b7280' }}>{answer}</p>
    </div>
  )
}

function VideoCard({ title, duration }: { title: string; duration: string }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
      style={{ background: '#f9fafb' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 208, 156, 0.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#f9fafb' }}
    >
      <div className="flex size-10 items-center justify-center rounded-lg" style={{ background: '#00D09C15', color: '#00D09C' }}>
        <Video className="size-4" />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{title}</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>{duration}</p>
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
