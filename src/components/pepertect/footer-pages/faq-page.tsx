'use client'

import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { FooterPageLayout } from './footer-page-layout'
import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const faqData: FAQItem[] = [
  // General
  {
    category: 'General',
    question: 'What is Pepertect?',
    answer: 'Pepertect is a paper trading simulator for Indian stock markets. It allows you to practice trading NIFTY, BANKNIFTY, SENSEX options, futures, and stocks using virtual money — completely risk-free. No real money is involved at any point.'
  },
  {
    category: 'General',
    question: 'Is Pepertect free to use?',
    answer: 'Yes! Pepertect is completely free. You get ₹1,00,000 virtual money to practice trading. There are no hidden charges, no premium plans, and no real money transactions.'
  },
  {
    category: 'General',
    question: 'Is this real trading?',
    answer: 'No. Pepertect is a simulator. All trades are virtual and use fake money. No real securities are bought or sold. This platform is designed for learning and practice only.'
  },
  {
    category: 'General',
    question: 'Can I withdraw my virtual profits?',
    answer: 'No. Virtual money and profits have no real-world value. They exist only within the simulator for practice purposes. You cannot withdraw, transfer, or convert virtual money to real money.'
  },
  // Trading
  {
    category: 'Trading',
    question: 'What instruments can I trade?',
    answer: 'You can trade:\n• NIFTY 50 Index Options (CE & PE)\n• BANKNIFTY Index Options (CE & PE)\n• SENSEX Index Options (CE & PE)\n• Individual Stocks\n• Futures contracts\n\nAll trading is simulated using virtual money.'
  },
  {
    category: 'Trading',
    question: 'How much virtual money do I get?',
    answer: 'Every user starts with ₹1,00,000 (One Lakh Rupees) in virtual money. If you lose it all, you can reset your account from the Profile section to start fresh.'
  },
  {
    category: 'Trading',
    question: 'What are the trading hours?',
    answer: 'The simulator follows Indian market hours:\n• Pre-open: 9:00 AM - 9:15 AM IST\n• Normal trading: 9:15 AM - 3:30 PM IST\n• Post-close: 3:30 PM - 3:40 PM IST\n\nYou can place trades during market hours. Outside these hours, you can still view your portfolio and analyze data.'
  },
  {
    category: 'Trading',
    question: 'How do I place a trade?',
    answer: '1. Navigate to the Trading page or click on any index/stock\n2. Select the instrument you want to trade\n3. Choose BUY or SELL\n4. Enter the quantity and price\n5. Review your order and confirm\n\nFor options: Select the strike price and CE/PE from the Option Chain.'
  },
  {
    category: 'Trading',
    question: 'Why is my trade not executing?',
    answer: 'Trades may not execute if:\n• You\'re trading outside market hours\n• You don\'t have sufficient virtual balance\n• The order price is too far from the market price\n• There\'s a technical issue (try refreshing)\n\nIf the problem persists, contact support.'
  },
  {
    category: 'Trading',
    question: 'What is the Option Chain?',
    answer: 'The Option Chain shows all available call (CE) and put (PE) options for a particular index or stock at different strike prices. It displays key data like Last Traded Price (LTP), Open Interest (OI), Volume, and Implied Volatility (IV). Use it to analyze options and make informed trading decisions.'
  },
  // Account
  {
    category: 'Account',
    question: 'How do I create an account?',
    answer: '1. Visit pepertect.app\n2. Click "Sign Up" or "Create Account"\n3. Enter your name, email, and password\n4. Click "Register"\n5. You\'re ready to start trading with ₹1,00,000 virtual money!'
  },
  {
    category: 'Account',
    question: 'Can I reset my account?',
    answer: 'Yes. Go to Profile → Reset Account. This will:\n• Reset your virtual balance to ₹1,00,000\n• Clear all open positions\n• Cancel all pending orders\n• Delete your trade history\n\nThis action cannot be undone.'
  },
  {
    category: 'Account',
    question: 'Can I have multiple accounts?',
    answer: 'No. Each user is allowed only one account. Multiple accounts may result in all accounts being suspended. If you\'re having issues with your current account, please contact support instead of creating a new one.'
  },
  {
    category: 'Account',
    question: 'How do I delete my account?',
    answer: 'To delete your account, contact us at support@pepertect.app with your registered email. Account deletion is permanent and all your data (trades, positions, history) will be permanently removed within 30 days.'
  },
  // Technical
  {
    category: 'Technical',
    question: 'Is the market data real-time?',
    answer: 'Market data on Pepertect may be delayed. We are working on integrating real-time data feeds. Currently, data is fetched from public APIs and may have a delay of a few seconds to minutes. This should not affect your learning experience.'
  },
  {
    category: 'Technical',
    question: 'Which browsers are supported?',
    answer: 'Pepertect works best on:\n• Google Chrome (latest)\n• Mozilla Firefox (latest)\n• Microsoft Edge (latest)\n• Safari (latest)\n\nWe recommend using Chrome for the best experience. Mobile browsers are also supported.'
  },
  {
    category: 'Technical',
    question: 'The website is loading slowly. What can I do?',
    answer: 'Try these steps:\n1. Clear your browser cache\n2. Disable browser extensions\n3. Check your internet connection\n4. Try a different browser\n5. If using mobile, switch to desktop mode\n\nIf the issue persists, report it to bugs@pepertect.app'
  },
  // Safety
  {
    category: 'Safety',
    question: 'Is my data secure?',
    answer: 'Yes. We take security seriously:\n• Passwords are encrypted using bcrypt\n• All data transmission uses HTTPS/TLS\n• Authentication uses secure JWT tokens\n• We follow industry-standard security practices\n\nHowever, please use a strong password and don\'t share your credentials.'
  },
  {
    category: 'Safety',
    question: 'Will Pepertect ever ask for my real money or bank details?',
    answer: 'NEVER. Pepertect is completely free and virtual. We will NEVER ask for:\n• Real money or payments\n• Bank account details\n• Credit/debit card information\n• UPI or payment app details\n\nIf anyone asks for such information claiming to be from Pepertect, please report it immediately.'
  },
]

const categories = ['All', ...Array.from(new Set(faqData.map(f => f.category)))]

export function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredFAQs = selectedCategory === 'All'
    ? faqData
    : faqData.filter(f => f.category === selectedCategory)

  return (
    <FooterPageLayout
      title="Frequently Asked Questions"
      icon={<HelpCircle className="size-5" />}
      lastUpdated="March 1, 2025"
    >
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="px-4 py-2 rounded-full text-xs font-medium transition-colors"
            style={{
              background: selectedCategory === cat ? '#00D09C' : '#f3f4f6',
              color: selectedCategory === cat ? '#ffffff' : '#6b7280',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search hint */}
      <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
        Showing {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''} {selectedCategory !== 'All' ? `in ${selectedCategory}` : ''}
      </p>

      {/* FAQ Items */}
      <div className="space-y-2">
        {filteredFAQs.map((faq, index) => {
          const isOpen = openIndex === index
          return (
            <div
              key={`${faq.category}-${index}`}
              className="rounded-xl overflow-hidden transition-colors"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span
                    className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: '#00D09C15', color: '#00D09C' }}
                  >
                    {faq.category}
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                    {faq.question}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="size-4 shrink-0 ml-2" style={{ color: '#00D09C' }} />
                ) : (
                  <ChevronDown className="size-4 shrink-0 ml-2" style={{ color: '#9ca3af' }} />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-[52px]">
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#4b5563' }}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Still have questions */}
      <div className="mt-8 p-6 rounded-xl text-center" style={{ background: 'rgba(0, 208, 156, 0.08)' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#1a1a1a' }}>Still have questions?</h3>
        <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
          Can&apos;t find what you&apos;re looking for? Our support team is here to help.
        </p>
        <a
          href="mailto:support@pepertect.app"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: '#00D09C', color: '#ffffff' }}
        >
          Contact Support
        </a>
      </div>
    </FooterPageLayout>
  )
}
