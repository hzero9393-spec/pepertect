'use client'

import { useAppStore } from '@/lib/store'
import {
  Shield,
  FileText,
  Headphones,
  Mail,
  HelpCircle,
  AlertTriangle,
  Info,
  RotateCcw,
  TrendingUp,
  Twitter,
  Linkedin,
  Youtube,
  MessageCircle
} from 'lucide-react'

const footerLinks = [
  { id: 'about-us' as const, label: 'About Us', icon: Info },
  { id: 'privacy-policy' as const, label: 'Privacy Policy', icon: Shield },
  { id: 'terms-of-service' as const, label: 'Terms of Service', icon: FileText },
  { id: 'disclaimer' as const, label: 'Disclaimer', icon: AlertTriangle },
  { id: 'support' as const, label: 'Support', icon: Headphones },
  { id: 'contact-us' as const, label: 'Contact Us', icon: Mail },
  { id: 'faq' as const, label: 'FAQ', icon: HelpCircle },
  { id: 'refund-policy' as const, label: 'Refund Policy', icon: RotateCcw },
]

const socialLinks = [
  { icon: Twitter, label: 'Twitter' },
  { icon: Linkedin, label: 'LinkedIn' },
  { icon: Youtube, label: 'YouTube' },
  { icon: MessageCircle, label: 'Discord' },
]

export function Footer() {
  const { setCurrentPage } = useAppStore()

  const handleLinkClick = (pageId: Parameters<typeof setCurrentPage>[0]) => {
    setCurrentPage(pageId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer
      className="px-4 sm:px-6 pt-10 pb-6"
      style={{
        background: '#ffffff',
        borderTop: '1px solid #f0f0f0',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row gap-8 pb-8" style={{ borderBottom: '1px solid #f0f0f0' }}>
          {/* Brand */}
          <div className="md:w-1/3">
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{ background: '#00D09C', color: '#ffffff' }}
              >
                <TrendingUp className="size-4" />
              </div>
              <span className="text-lg font-bold" style={{ color: '#1a1a1a' }}>Pepertect</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
              India&apos;s paper trading platform. Practice NIFTY, BANKNIFTY, SENSEX options &amp; futures risk-free with ₹1,00,000 virtual money.
            </p>
            {/* Social */}
            <div className="flex items-center gap-2 mt-4">
              {socialLinks.map((social) => (
                <button
                  key={social.label}
                  className="flex size-8 items-center justify-center rounded-lg transition-colors"
                  style={{ background: '#f5f5f5', color: '#9ca3af' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#00D09C'
                    e.currentTarget.style.color = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f5f5f5'
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                  aria-label={social.label}
                >
                  <social.icon className="size-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Links Grid - Groww style simple columns */}
          <div className="md:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {footerLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className="text-left transition-colors group"
              >
                <link.icon className="size-3.5 mb-1.5" style={{ color: '#00D09C' }} />
                <p
                  className="text-xs font-medium group-hover:text-[#00D09C] transition-colors"
                  style={{ color: '#4a4a4a' }}
                >
                  {link.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="my-6 px-4 py-3 rounded-lg"
          style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: '#92400e' }}>
            <strong>⚠️ Disclaimer:</strong> Pepertect is a paper trading simulator for educational purposes only. No real money is involved. Market data may be delayed. This is not financial advice.
          </p>
        </div>

        {/* Bottom */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <span className="text-[11px]" style={{ color: '#9ca3af' }}>© 2025 Pepertect. All rights reserved.</span>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: '#9ca3af' }}>
            <span>Paper Trading</span>
            <span>•</span>
            <span>No Real Money</span>
            <span>•</span>
            <span>Learning Only</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
