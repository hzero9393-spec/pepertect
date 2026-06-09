'use client'

import { Mail, MapPin, Phone, Clock, Send, Globe, MessageCircle } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'

export function ContactUsPage() {
  return (
    <FooterPageLayout
      title="Contact Us"
      icon={<Mail className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      {/* Contact Methods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ContactMethod
          icon={<Mail className="size-5" />}
          title="Email Us"
          detail="support@pepertect.app"
          subDetail="We respond within 24 hours"
          color="#00D09C"
        />
        <ContactMethod
          icon={<Phone className="size-5" />}
          title="Call Us"
          detail="+91 80-XXXX-XXXX"
          subDetail="Mon-Fri, 9AM - 6PM IST"
          color="#10b981"
        />
        <ContactMethod
          icon={<MapPin className="size-5" />}
          title="Visit Us"
          detail="Bengaluru, Karnataka"
          subDetail="India"
          color="#f59e0b"
        />
      </div>

      {/* Contact Form */}
      <Section title="Send Us a Message">
        <div className="p-6 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#1a1a1a' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#00D09C' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Email Address *</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#1a1a1a' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#00D09C' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db' }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Subject *</label>
              <select
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#1a1a1a' }}
              >
                <option value="">Select a subject</option>
                <option value="general">General Inquiry</option>
                <option value="technical">Technical Issue</option>
                <option value="account">Account Problem</option>
                <option value="feedback">Feedback & Suggestions</option>
                <option value="partnership">Partnership Inquiry</option>
                <option value="bug">Bug Report</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#374151' }}>Message *</label>
              <textarea
                rows={5}
                placeholder="Describe your issue or question in detail..."
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none"
                style={{ background: '#ffffff', border: '1px solid #d1d5db', color: '#1a1a1a' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#00D09C' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db' }}
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: '#00D09C', color: '#ffffff' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#00b88a' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#00D09C' }}
            >
              <Send className="size-4" />
              Send Message
            </button>
          </form>
        </div>
      </Section>

      {/* Other Ways to Reach Us */}
      <Section title="Other Ways to Reach Us">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SocialLink icon={<Globe className="size-5" />} title="Website" detail="pepertect.app" />
          <SocialLink icon={<MessageCircle className="size-5" />} title="Discord Community" detail="Join 5,000+ traders" />
          <SocialLink icon={<Mail className="size-5" />} title="Partnership" detail="partnerships@pepertect.app" />
          <SocialLink icon={<Clock className="size-5" />} title="Response Time" detail="Within 24 business hours" />
        </div>
      </Section>

      <Section title="Office Address">
        <div className="p-4 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <p className="text-sm" style={{ color: '#4b5563' }}>
            <strong>Pepertect Technologies Pvt. Ltd.</strong><br />
            WeWork Embassy Tech Village<br />
            Outer Ring Road, Devarabisanahalli<br />
            Bengaluru, Karnataka 560103<br />
            India
          </p>
        </div>
      </Section>
    </FooterPageLayout>
  )
}

function ContactMethod({ icon, title, detail, subDetail, color }: {
  icon: React.ReactNode; title: string; detail: string; subDetail: string; color: string
}) {
  return (
    <div className="p-5 rounded-xl text-center" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
      <div className="flex size-12 items-center justify-center rounded-xl mx-auto mb-3" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{title}</h3>
      <p className="text-sm font-medium mt-1" style={{ color }}>{detail}</p>
      <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{subDetail}</p>
    </div>
  )
}

function SocialLink({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
      <div className="flex size-10 items-center justify-center rounded-lg shrink-0" style={{ background: '#00D09C15', color: '#00D09C' }}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{title}</p>
        <p className="text-xs" style={{ color: '#6b7280' }}>{detail}</p>
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
