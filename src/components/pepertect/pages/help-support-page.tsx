'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Ticket,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Mail,
  Phone,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  Shield,
  TrendingUp,
  Wallet,
  FileText,
  X,
} from 'lucide-react'

// ─── Animation ───────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

// ─── FAQ Data ────────────────────────────────────────────────────

const FAQ_CATEGORIES = [
  { id: 'all', label: 'All', icon: HelpCircle },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'trading', label: 'Trading', icon: TrendingUp },
  { id: 'funds', label: 'Funds', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: FileText },
]

const FAQ_DATA = [
  {
    id: 1,
    category: 'account',
    question: 'How do I create a Pepertect account?',
    answer: 'You can create a Pepertect account in two ways: using your email and password, or by signing in with your Google account. Simply click the "Sign Up" button on the login page, fill in your details, and you\'ll receive ₹1,00,000 virtual balance to start paper trading immediately. No KYC or bank account needed since this is a simulation platform.',
  },
  {
    id: 2,
    category: 'account',
    question: 'I forgot my password. How do I reset it?',
    answer: 'Currently, you can reset your password from the Profile page. Go to Profile > Security > Change Password. Enter your current password and set a new one. If you\'ve forgotten your current password, you can sign in using Google OAuth instead. We\'re working on adding a "Forgot Password" email reset feature in a future update.',
  },
  {
    id: 3,
    category: 'account',
    question: 'How do I check which devices are logged into my account?',
    answer: 'Go to Profile > Active Devices section. You\'ll see all devices currently logged into your account with details like browser, OS, IP address, and location. You can logout from any individual device or use "Logout All" to sign out from all devices except the current one. This helps keep your account secure.',
  },
  {
    id: 4,
    category: 'account',
    question: 'Is my data safe on Pepertect?',
    answer: 'Yes! We take security seriously. Your password is encrypted using bcrypt hashing. All sessions are tracked with device and location information. You can monitor and logout from any unauthorized devices. Our platform runs on secure infrastructure with SSL encryption for all data transfers.',
  },
  {
    id: 5,
    category: 'trading',
    question: 'What is paper trading / virtual trading?',
    answer: 'Paper trading (also called virtual trading) allows you to practice trading with virtual money instead of real capital. Pepertect gives you ₹1,00,000 virtual balance to trade stocks, futures, and options in real market conditions. You can buy, sell, and track positions just like real trading, but without any financial risk. It\'s the perfect way to learn and test strategies.',
  },
  {
    id: 6,
    category: 'trading',
    question: 'How do I place a trade on Pepertect?',
    answer: 'To place a trade: 1) Navigate to the Trading page from the sidebar, 2) Search for a stock or select an index, 3) Choose your segment (Equity, Futures, or Options), 4) Select order type (Market, Limit, SL, SL-M), 5) Enter quantity/lots and price, 6) Review the order summary with brokerage calculation, 7) Click "Place Order". For options, you can also use the Option Chain page for a visual strike price selection.',
  },
  {
    id: 7,
    category: 'trading',
    question: 'What brokerage does Pepertect charge?',
    answer: 'Pepertect charges realistic brokerage to simulate real trading conditions: Equity Intraday: 0.05% on both buy & sell sides, Equity Delivery: 0.1% on both sides, Futures: 0.02% on both sides, Options: ₹20 per lot on sell side. Minimum brokerage is ₹5 per order and maximum is ₹200 per order. These rates are similar to what real discount brokers charge.',
  },
  {
    id: 8,
    category: 'trading',
    question: 'Can I trade Futures and Options on Pepertect?',
    answer: 'Yes! Pepertect supports all three segments: Equity (Cash), Futures, and Options. You can trade NIFTY, BANKNIFTY, and FINNIFTY index futures and options with real lot sizes and strike intervals. Stock F&O is also available for major stocks. Select the segment when placing your order from the Trading page or use the dedicated Option Chain and Futures pages.',
  },
  {
    id: 9,
    category: 'funds',
    question: 'How do I add more virtual funds to my account?',
    answer: 'Go to Profile > Virtual Balance section and click "Add Money". You can add virtual funds in preset amounts (₹10,000, ₹25,000, ₹50,000, ₹1,00,000) or enter a custom amount. Since this is paper trading, the virtual money has no real value — it\'s purely for practice. You can also reset your balance to ₹1,00,000 from the same section.',
  },
  {
    id: 10,
    category: 'funds',
    question: 'What is margin and how is it calculated?',
    answer: 'Margin is the amount blocked from your balance when you open a position. For Equity Intraday, margin is typically 20% of trade value. For Futures, it\'s around 10% (SPAN + Exposure). For Options buying, you pay the full premium. For Options selling, margin is similar to futures. The exact margin required is shown before you place each order.',
  },
  {
    id: 11,
    category: 'funds',
    question: 'Can I withdraw my virtual balance?',
    answer: 'No, the virtual balance on Pepertect is for paper trading only and cannot be withdrawn or converted to real money. It\'s purely a simulation to help you practice trading strategies and learn about the Indian stock market without any financial risk. When you reset your balance, it simply returns to the default ₹1,00,000.',
  },
  {
    id: 12,
    category: 'reports',
    question: 'How do I download my trading report?',
    answer: 'Go to the Reports page from the sidebar. You\'ll see a "Download Report" section where you can generate three types of PDF reports: Last Trade (single trade details), Monthly Report (last 30 days), and Full Trading Report (all trades). Each PDF includes trade details, P&L summary, brokerage breakdown, and AI-generated analysis.',
  },
  {
    id: 13,
    category: 'reports',
    question: 'What metrics are shown in the Reports section?',
    answer: 'The Reports page shows comprehensive analytics: Total P&L (overall profit/loss), Win Rate (percentage of profitable trades), Average P&L per trade, Total Trades count, Total Brokerage paid, Segment-wise breakdown (Equity, Futures, Options), and a visual P&L chart. You can also see individual trade history with filtering options.',
  },
  {
    id: 14,
    category: 'trading',
    question: 'Why was my order rejected?',
    answer: 'Orders can be rejected for several reasons: Insufficient balance or margin, Market is closed (trading is only allowed during market hours: 9:15 AM - 3:30 PM IST on weekdays), Invalid price for Limit/SL orders, Stock is in F&O ban period, Quantity exceeds allowed limits. The exact rejection reason is always shown in your Orders page.',
  },
  {
    id: 15,
    category: 'trading',
    question: 'What is the Option Chain and how do I use it?',
    answer: 'The Option Chain is a visual tool that shows all available call (CE) and put (PE) options for an index like NIFTY or BANKNIFTY. It displays strike prices, premiums, Open Interest (OI), volume, and Greeks for each strike. To access it, go to any index detail page and click "Option Chain". You can click on any strike price to quickly place an options trade.',
  },
]

// ─── Ticket Types ────────────────────────────────────────────────

interface TicketInfo {
  id: string
  subject: string
  message: string
  category: string
  priority: string
  status: string
  reply: string | null
  repliedAt: string | null
  createdAt: string
}

// ─── Component ───────────────────────────────────────────────────

export function HelpSupportPage() {
  const { token, user } = useAuthStore()
  const { setCurrentPage } = useAppStore()

  // Tab state
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'ticket' | 'myTickets'>('faq')

  // FAQ state
  const [faqCategory, setFaqCategory] = useState('all')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [faqSearch, setFaqSearch] = useState('')

  // Ticket form state
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketMessage, setTicketMessage] = useState('')
  const [ticketCategory, setTicketCategory] = useState('GENERAL')
  const [ticketPriority, setTicketPriority] = useState('MEDIUM')
  const [ticketSubmitting, setTicketSubmitting] = useState(false)

  // My tickets state
  const [tickets, setTickets] = useState<TicketInfo[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!token) return
    setTicketsLoading(true)
    try {
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
      }
    } catch {
      // Silent
    } finally {
      setTicketsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeTab === 'myTickets') {
      fetchTickets()
    }
  }, [activeTab, fetchTickets])

  // Submit ticket
  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    setTicketSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: ticketSubject,
          message: ticketMessage,
          category: ticketCategory,
          priority: ticketPriority,
        }),
      })
      if (res.ok) {
        toast.success('Ticket submitted successfully! We will get back to you soon.')
        setTicketSubject('')
        setTicketMessage('')
        setTicketCategory('GENERAL')
        setTicketPriority('MEDIUM')
        setActiveTab('myTickets')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to submit ticket')
      }
    } catch {
      toast.error('Failed to submit ticket')
    } finally {
      setTicketSubmitting(false)
    }
  }

  // Close ticket
  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Ticket closed successfully')
        fetchTickets()
      }
    } catch {
      toast.error('Failed to close ticket')
    }
  }

  // Filtered FAQs
  const filteredFaqs = FAQ_DATA.filter(faq => {
    const matchesCategory = faqCategory === 'all' || faq.category === faqCategory
    const matchesSearch = !faqSearch || faq.question.toLowerCase().includes(faqSearch.toLowerCase()) || faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  let si = 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto bg-[#f5f7fa] min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => setCurrentPage('profile')}
            className="size-9 rounded-lg bg-white border border-[#e8eaf0] flex items-center justify-center hover:bg-[#f0f2f5] transition-colors"
          >
            <ArrowLeft className="size-4 text-[#6b7280]" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-[#5367ff]/10 flex items-center justify-center">
              <HelpCircle className="size-5 text-[#5367ff]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1a1a2e]">Help & Support</h1>
              <p className="text-xs text-[#9ca3af]">We&apos;re here to help you</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab('faq')}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              activeTab === 'faq'
                ? "border-[#5367ff] bg-[#5367ff]/5"
                : "border-[#e8eaf0] bg-white hover:border-[#5367ff]/30 hover:bg-[#5367ff]/5"
            )}
          >
            <div className={cn(
              "size-10 rounded-xl flex items-center justify-center",
              activeTab === 'faq' ? "bg-[#5367ff]" : "bg-[#5367ff]/10"
            )}>
              <HelpCircle className={cn("size-5", activeTab === 'faq' ? "text-white" : "text-[#5367ff]")} />
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-semibold", activeTab === 'faq' ? "text-[#5367ff]" : "text-[#1a1a2e]")}>FAQ</p>
              <p className="text-[10px] text-[#9ca3af] mt-0.5">Quick answers</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              activeTab === 'contact'
                ? "border-[#00D09C] bg-[#00D09C]/5"
                : "border-[#e8eaf0] bg-white hover:border-[#00D09C]/30 hover:bg-[#00D09C]/5"
            )}
          >
            <div className={cn(
              "size-10 rounded-xl flex items-center justify-center",
              activeTab === 'contact' ? "bg-[#00D09C]" : "bg-[#00D09C]/10"
            )}>
              <MessageSquare className={cn("size-5", activeTab === 'contact' ? "text-white" : "text-[#00D09C]")} />
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-semibold", activeTab === 'contact' ? "text-[#00D09C]" : "text-[#1a1a2e]")}>Contact</p>
              <p className="text-[10px] text-[#9ca3af] mt-0.5">Talk to us</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('ticket')}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              activeTab === 'ticket' || activeTab === 'myTickets'
                ? "border-[#f59e0b] bg-[#f59e0b]/5"
                : "border-[#e8eaf0] bg-white hover:border-[#f59e0b]/30 hover:bg-[#f59e0b]/5"
            )}
          >
            <div className={cn(
              "size-10 rounded-xl flex items-center justify-center",
              activeTab === 'ticket' || activeTab === 'myTickets' ? "bg-[#f59e0b]" : "bg-[#f59e0b]/10"
            )}>
              <Ticket className={cn("size-5", activeTab === 'ticket' || activeTab === 'myTickets' ? "text-white" : "text-[#f59e0b]")} />
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-semibold", activeTab === 'ticket' || activeTab === 'myTickets' ? "text-[#f59e0b]" : "text-[#1a1a2e]")}>Ticket</p>
              <p className="text-[10px] text-[#9ca3af] mt-0.5">Raise issue</p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* ── FAQ Section ──────────────────────────────────────── */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          {/* Search */}
          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search questions..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e8eaf0] bg-white text-sm focus:border-[#5367ff] focus:ring-[#5367ff]/20 focus:outline-none transition-colors"
              />
              {faqSearch && (
                <button onClick={() => setFaqSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="size-4 text-[#9ca3af] hover:text-[#6b7280]" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Category Filter */}
          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FAQ_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFaqCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                    faqCategory === cat.id
                      ? "bg-[#5367ff] text-white"
                      : "bg-white border border-[#e8eaf0] text-[#6b7280] hover:border-[#5367ff]/30"
                  )}
                >
                  <cat.icon className="size-3" />
                  {cat.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* FAQ List */}
          <div className="space-y-2">
            {filteredFaqs.length === 0 ? (
              <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
                <div className="bg-white border border-[#e8eaf0] rounded-2xl p-8 text-center">
                  <Search className="size-8 text-[#d1d5db] mx-auto mb-2" />
                  <p className="text-sm font-semibold text-[#1a1a2e]">No questions found</p>
                  <p className="text-xs text-[#9ca3af] mt-1">Try a different search or category</p>
                </div>
              </motion.div>
            ) : (
              filteredFaqs.map((faq) => (
                <motion.div key={faq.id} custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
                  <div className="bg-white border border-[#e8eaf0] rounded-2xl overflow-hidden transition-all hover:border-[#5367ff]/20">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="w-full p-4 flex items-start gap-3 text-left"
                    >
                      <div className={cn(
                        "size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                        expandedFaq === faq.id ? "bg-[#5367ff]" : "bg-[#5367ff]/10"
                      )}>
                        {expandedFaq === faq.id ? (
                          <ChevronUp className="size-3.5 text-white" />
                        ) : (
                          <ChevronDown className="size-3.5 text-[#5367ff]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#1a1a2e] pr-2">{faq.question}</p>
                      </div>
                      <Badge className={cn(
                        "border-0 text-[9px] px-1.5 py-0 font-bold shrink-0",
                        faq.category === 'account' ? "bg-[#5367ff]/10 text-[#5367ff]" :
                        faq.category === 'trading' ? "bg-[#00D09C]/10 text-[#00D09C]" :
                        faq.category === 'funds' ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                        "bg-[#6b7280]/10 text-[#6b7280]"
                      )}>
                        {faq.category}
                      </Badge>
                    </button>
                    {expandedFaq === faq.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="px-4 pb-4"
                      >
                        <div className="pl-9 pt-2 border-t border-[#e8eaf0]/50">
                          <p className="text-sm text-[#6b7280] leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <p className="text-center text-xs text-[#9ca3af]">
              {FAQ_DATA.length} questions available • {filteredFaqs.length} shown
            </p>
          </motion.div>
        </div>
      )}

      {/* ── Contact Support Section ──────────────────────────── */}
      {activeTab === 'contact' && (
        <div className="space-y-4">
          {/* Contact Cards */}
          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <div className="bg-white border border-[#e8eaf0] rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="size-5 text-[#00D09C]" />
                <h2 className="text-base font-bold text-[#1a1a2e]">Get in Touch</h2>
              </div>
              <p className="text-sm text-[#6b7280] mb-5">
                Our support team is available to help you with any questions or issues. Choose your preferred method to reach us.
              </p>

              <div className="space-y-3">
                {/* Email */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f7f8fc] border border-[#e8eaf0]">
                  <div className="size-11 rounded-xl bg-[#5367ff]/10 flex items-center justify-center shrink-0">
                    <Mail className="size-5 text-[#5367ff]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a2e]">Email Support</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">support@pepertect.in</p>
                    <p className="text-[10px] text-[#9ca3af] mt-0.5">We typically respond within 24 hours</p>
                  </div>
                  <a
                    href="mailto:support@pepertect.in"
                    className="px-3 py-1.5 rounded-lg bg-[#5367ff] text-white text-xs font-semibold hover:bg-[#4356e0] transition-colors"
                  >
                    Email Us
                  </a>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f7f8fc] border border-[#e8eaf0]">
                  <div className="size-11 rounded-xl bg-[#00D09C]/10 flex items-center justify-center shrink-0">
                    <Phone className="size-5 text-[#00D09C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a2e]">Phone Support</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">+91 98765 43210</p>
                    <p className="text-[10px] text-[#9ca3af] mt-0.5">Mon-Fri, 9:00 AM - 6:00 PM IST</p>
                  </div>
                  <a
                    href="tel:+919876543210"
                    className="px-3 py-1.5 rounded-lg bg-[#00D09C] text-white text-xs font-semibold hover:bg-[#00b88a] transition-colors"
                  >
                    Call Us
                  </a>
                </div>

                {/* Live Chat */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f7f8fc] border border-[#e8eaf0]">
                  <div className="size-11 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="size-5 text-[#f59e0b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a2e]">Live Chat</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">Chat with our team in real-time</p>
                    <p className="text-[10px] text-[#9ca3af] mt-0.5">Available during market hours</p>
                  </div>
                  <button
                    onClick={() => toast.info('Live chat is not available yet.')}
                    className="px-3 py-1.5 rounded-lg bg-[#f59e0b] text-white text-xs font-semibold hover:bg-[#d97706] transition-colors"
                  >
                    Chat Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Support Hours */}
          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <div className="bg-white border border-[#e8eaf0] rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="size-5 text-[#5367ff]" />
                <h2 className="text-sm font-bold text-[#1a1a2e]">Support Hours</h2>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f7f8fc]">
                  <span className="text-xs text-[#6b7280]">Monday - Friday</span>
                  <span className="text-xs font-semibold text-[#1a1a2e]">9:00 AM - 6:00 PM IST</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f7f8fc]">
                  <span className="text-xs text-[#6b7280]">Saturday</span>
                  <span className="text-xs font-semibold text-[#1a1a2e]">10:00 AM - 2:00 PM IST</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#f7f8fc]">
                  <span className="text-xs text-[#6b7280]">Sunday & Holidays</span>
                  <span className="text-xs font-semibold text-[#EB5B3C]">Closed</span>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-[#e6faf4] border border-[#00D09C]/10 flex items-start gap-2">
                <CheckCircle2 className="size-4 text-[#00D09C] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#6b7280]">
                  Email support is available 24/7. We aim to respond within 24 hours on business days.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Raise a Ticket Section ───────────────────────────── */}
      {activeTab === 'ticket' && (
        <div className="space-y-4">
          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <div className="bg-white border border-[#e8eaf0] rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="size-5 text-[#f59e0b]" />
                  <h2 className="text-base font-bold text-[#1a1a2e]">Raise a Ticket</h2>
                </div>
                {tickets.length > 0 && (
                  <button
                    onClick={() => setActiveTab('myTickets')}
                    className="text-xs font-semibold text-[#5367ff] hover:text-[#4356e0] flex items-center gap-1"
                  >
                    View My Tickets ({tickets.length}) <ChevronRight className="size-3" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Category</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { value: 'GENERAL', label: 'General', icon: HelpCircle },
                      { value: 'BUG', label: 'Bug', icon: AlertCircle },
                      { value: 'FEATURE', label: 'Feature', icon: TrendingUp },
                      { value: 'ACCOUNT', label: 'Account', icon: Shield },
                      { value: 'TRADING', label: 'Trading', icon: BookOpen },
                    ].map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setTicketCategory(cat.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-xs font-semibold transition-all",
                          ticketCategory === cat.value
                            ? "border-[#5367ff] bg-[#5367ff]/5 text-[#5367ff]"
                            : "border-[#e8eaf0] text-[#6b7280] hover:border-[#5367ff]/30"
                        )}
                      >
                        <cat.icon className="size-4" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Priority</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'LOW', label: 'Low', color: '#6b7280' },
                      { value: 'MEDIUM', label: 'Medium', color: '#f59e0b' },
                      { value: 'HIGH', label: 'High', color: '#f97316' },
                      { value: 'URGENT', label: 'Urgent', color: '#EB5B3C' },
                    ].map(pri => (
                      <button
                        key={pri.value}
                        onClick={() => setTicketPriority(pri.value)}
                        className={cn(
                          "py-2 rounded-xl border-2 text-xs font-semibold transition-all",
                          ticketPriority === pri.value
                            ? "border-[currentColor] bg-opacity-5"
                            : "border-[#e8eaf0] text-[#6b7280] hover:border-[#e8eaf0]/80"
                        )}
                        style={ticketPriority === pri.value ? { borderColor: pri.color, color: pri.color, backgroundColor: `${pri.color}08` } : {}}
                      >
                        {pri.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Subject</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    className="w-full px-4 py-3 rounded-xl border border-[#e8eaf0] bg-white text-sm focus:border-[#5367ff] focus:ring-[#5367ff]/20 focus:outline-none transition-colors"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Message</label>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe your issue in detail. Include steps to reproduce if it's a bug, or specific details if it's a feature request..."
                    className="w-full px-4 py-3 rounded-xl border border-[#e8eaf0] bg-white text-sm focus:border-[#5367ff] focus:ring-[#5367ff]/20 focus:outline-none resize-none transition-colors"
                  />
                  <p className="text-[10px] text-[#9ca3af]">{ticketMessage.length}/1000 characters</p>
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmitTicket}
                  disabled={ticketSubmitting || !ticketSubject.trim() || !ticketMessage.trim()}
                  className="w-full bg-[#5367ff] hover:bg-[#4356e0] text-white font-semibold rounded-xl h-12 gap-2"
                >
                  {ticketSubmitting ? (
                    <><Loader2 className="size-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><Send className="size-4" /> Submit Ticket</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <div className="p-4 rounded-2xl bg-[#f7f8fc] border border-[#e8eaf0]">
              <p className="text-xs font-semibold text-[#1a1a2e] mb-2">Tips for faster resolution</p>
              <div className="space-y-1.5">
                {[
                  'Include screenshots or error messages if reporting a bug',
                  'Mention the exact steps you took before the issue occurred',
                  'Specify your browser and device type',
                  'For feature requests, describe the use case and expected behavior',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="size-3 text-[#5367ff] shrink-0 mt-1" />
                    <p className="text-[11px] text-[#6b7280]">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── My Tickets Section ───────────────────────────────── */}
      {activeTab === 'myTickets' && (
        <div className="space-y-4">
          <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1a1a2e]">My Tickets</h2>
              <button
                onClick={() => setActiveTab('ticket')}
                className="text-xs font-semibold text-[#5367ff] hover:text-[#4356e0] flex items-center gap-1"
              >
                <Ticket className="size-3" /> Raise New Ticket
              </button>
            </div>
          </motion.div>

          {ticketsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white border border-[#e8eaf0] rounded-2xl p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-60" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
              <div className="bg-white border border-[#e8eaf0] rounded-2xl p-8 text-center">
                <div className="size-14 rounded-full bg-[#f0f2f5] flex items-center justify-center mx-auto mb-3">
                  <Ticket className="size-7 text-[#9ca3af]" />
                </div>
                <p className="text-sm font-semibold text-[#1a1a2e]">No tickets yet</p>
                <p className="text-xs text-[#9ca3af] mt-1">
                  You haven&apos;t raised any support tickets. Click below to create one.
                </p>
                <Button
                  onClick={() => setActiveTab('ticket')}
                  className="mt-4 bg-[#5367ff] hover:bg-[#4356e0] text-white text-xs font-semibold gap-1.5"
                  size="sm"
                >
                  <Ticket className="size-3.5" /> Raise a Ticket
                </Button>
              </div>
            </motion.div>
          ) : (
            tickets.map((ticket) => (
              <motion.div key={ticket.id} custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
                <div className="bg-white border border-[#e8eaf0] rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0",
                        ticket.status === 'OPEN' ? "bg-[#f59e0b]/10" :
                        ticket.status === 'IN_PROGRESS' ? "bg-[#5367ff]/10" :
                        ticket.status === 'RESOLVED' ? "bg-[#00D09C]/10" :
                        "bg-[#f0f2f5]"
                      )}>
                        {ticket.status === 'OPEN' ? (
                          <AlertCircle className="size-5 text-[#f59e0b]" />
                        ) : ticket.status === 'IN_PROGRESS' ? (
                          <Loader2 className="size-5 text-[#5367ff]" />
                        ) : (
                          <CheckCircle2 className="size-5 text-[#00D09C]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1a1a2e] truncate">{ticket.subject}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={cn(
                            "border-0 text-[9px] px-1.5 py-0 font-bold",
                            ticket.status === 'OPEN' ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                            ticket.status === 'IN_PROGRESS' ? "bg-[#5367ff]/10 text-[#5367ff]" :
                            ticket.status === 'RESOLVED' ? "bg-[#00D09C]/10 text-[#00D09C]" :
                            "bg-[#6b7280]/10 text-[#6b7280]"
                          )}>
                            {ticket.status === 'OPEN' ? 'Open' :
                             ticket.status === 'IN_PROGRESS' ? 'In Progress' :
                             ticket.status === 'RESOLVED' ? 'Resolved' : 'Closed'}
                          </Badge>
                          <Badge className="bg-[#f0f2f5] text-[#6b7280] border-0 text-[9px] px-1.5 py-0 font-bold">
                            {ticket.category}
                          </Badge>
                          <span className="text-[10px] text-[#9ca3af]">
                            {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                        className="p-1"
                      >
                        <ChevronRight className={cn(
                          "size-4 text-[#9ca3af] transition-transform",
                          expandedTicket === ticket.id && "rotate-90"
                        )} />
                      </button>
                    </div>

                    {expandedTicket === ticket.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-[#e8eaf0]/50 space-y-3"
                      >
                        <div className="p-3 rounded-xl bg-[#f7f8fc]">
                          <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-1">Your Message</p>
                          <p className="text-sm text-[#1a1a2e]">{ticket.message}</p>
                        </div>

                        {ticket.reply && (
                          <div className="p-3 rounded-xl bg-[#e6faf4] border border-[#00D09C]/10">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="size-3 text-[#00D09C]" />
                              <p className="text-xs font-semibold text-[#00D09C] uppercase tracking-wider">Support Reply</p>
                            </div>
                            <p className="text-sm text-[#1a1a2e]">{ticket.reply}</p>
                            {ticket.repliedAt && (
                              <p className="text-[10px] text-[#9ca3af] mt-1">
                                Replied on {new Date(ticket.repliedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        )}

                        {ticket.status === 'OPEN' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCloseTicket(ticket.id)}
                            className="w-full text-xs font-semibold text-[#EB5B3C] border-[#eb5b3c]/20 hover:bg-[#EB5B3C]/5"
                          >
                            Close Ticket
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
