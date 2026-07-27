'use client';

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Shield,
  CreditCard,
  TrendingUp,
  UserCog,
  Zap,
  HelpCircle,
  Video,
  FileText,
} from 'lucide-react';

interface FAQ {
  q: string;
  a: string;
  category: string;
}

interface Guide {
  title: string;
  description: string;
  duration: string;
  icon: React.ElementType;
  tint: string;
  color: string;
}

const FAQS: FAQ[] = [
  {
    category: 'Getting Started',
    q: 'What is Pepertect and how is it different from a real broker?',
    a: 'Pepertect is a paper trading platform that simulates the Indian stock market with virtual capital. You can practice trading stocks, options, and futures without risking real money. All orders, positions, and P&L are educational only — no real money is ever involved.',
  },
  {
    category: 'Getting Started',
    q: 'How much virtual capital do I get?',
    a: 'Free plan users receive ₹10,000 of virtual capital. Premium plan subscribers (₹299/month) receive ₹1,00,000 of virtual capital. The capital is resettable from your profile page if you want to start fresh.',
  },
  {
    category: 'Account',
    q: 'I forgot my password. How do I reset it?',
    a: 'Go to the login page and click "Forgot password". Enter your registered email and we will send you a reset link. The link is valid for 30 minutes. If you do not receive the email, check your spam folder or contact support.',
  },
  {
    category: 'Account',
    q: 'Can I have multiple accounts?',
    a: 'No. Our Terms & Conditions allow one account per user. Creating multiple accounts to abuse the free trial is prohibited and may result in permanent suspension.',
  },
  {
    category: 'Trading',
    q: 'Why does my order show "Pending" instead of "Executed"?',
    a: 'MARKET orders are filled immediately and show as "Executed". LIMIT orders only execute when the market price reaches your specified limit price — until then they remain "Pending". You can cancel a pending order from the Orders tab.',
  },
  {
    category: 'Trading',
    q: 'Why did my balance not change after a trade?',
    a: 'It should! When you BUY, your Total Balance and Available Margin decrease by the order value plus brokerage. When you SELL, they increase by the sale proceeds minus brokerage. If you are seeing stale numbers, please refresh the dashboard or contact support.',
  },
  {
    category: 'Trading',
    q: 'What is the option chain and how do I use it?',
    a: 'The option chain shows all available call and put options for NIFTY, SENSEX, BANKNIFTY, and FINNIFTY. Click on any strike to see a detailed overview of that strike including OI, volume, IV, and moneyness. You can place an option trade directly from the strike overview page.',
  },
  {
    category: 'Trading',
    q: 'How does the basket order feature work?',
    a: 'Basket order lets you place up to 20 stock orders in a single click. Add legs by searching or picking from popular stocks, set side (BUY/SELL), type (MARKET/LIMIT), and quantity for each leg, then click "Place N Order(s)". The system checks margin before placing.',
  },
  {
    category: 'Subscription',
    q: 'What is the difference between Free and Premium?',
    a: 'Free plan: ₹10,000 virtual capital, equity trading, option chain access, 10-stock watchlist, basic learning modules. Premium (₹299/month): ₹1,00,000 virtual capital, futures & options trading, unlimited watchlist, advanced reports, priority support, all learning modules.',
  },
  {
    category: 'Subscription',
    q: 'How do I cancel my Premium subscription?',
    a: 'Go to Profile → Subscription and click "Cancel Subscription". Your plan remains active until the end of the current billing cycle, after which you will be downgraded to Free. We do not offer refunds for partial months.',
  },
  {
    category: 'Subscription',
    q: 'Is the ₹299 payment secure?',
    a: 'Yes. Payments are processed through Razorpay, a PCI-DSS Level 1 certified payment gateway. We never see or store your card details — they go directly to Razorpay. Pepertect only receives a payment confirmation token.',
  },
  {
    category: 'Data & Privacy',
    q: 'Is my data safe with Pepertect?',
    a: 'Yes. Passwords are bcrypt-hashed (we never see your plain-text password). We comply with India\'s DPDP Act, 2023. We never sell your data. You can request account deletion anytime from Profile → Delete Account, and your data is removed within 30 days.',
  },
  {
    category: 'Data & Privacy',
    q: 'Why are the stock prices different from my real broker?',
    a: 'Pepertect uses simulated prices derived from a deterministic seed based on each stock\'s symbol. This keeps the platform free and lets you practice without needing expensive real-time data feeds. Price movements are realistic but not real-time market data.',
  },
];

const CATEGORIES = ['All', 'Getting Started', 'Account', 'Trading', 'Subscription', 'Data & Privacy'];

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; tint: string; color: string }> = {
  'Getting Started': { icon: Zap, tint: 'bg-tint-blue', color: 'text-brand-primary' },
  'Account': { icon: UserCog, tint: 'bg-tint-purple', color: 'text-info-purple' },
  'Trading': { icon: TrendingUp, tint: 'bg-tint-green', color: 'text-profit-green' },
  'Subscription': { icon: CreditCard, tint: 'bg-tint-yellow', color: 'text-accent-gold' },
  'Data & Privacy': { icon: Shield, tint: 'bg-tint-red', color: 'text-loss-red' },
};

const GUIDES: Guide[] = [
  {
    title: 'How to place your first trade',
    description: 'Step-by-step walkthrough of placing a MARKET or LIMIT order on the Trade page.',
    duration: '3 min read',
    icon: TrendingUp,
    tint: 'bg-tint-green',
    color: 'text-profit-green',
  },
  {
    title: 'Understanding the Option Chain',
    description: 'Learn how to read OI, IV, volume, and identify ITM/OTM options at a glance.',
    duration: '5 min read',
    icon: BookOpen,
    tint: 'bg-tint-blue',
    color: 'text-brand-primary',
  },
  {
    title: 'Basket orders explained',
    description: 'Place up to 20 orders in a single click — perfect for sectoral bets and pair trades.',
    duration: '4 min read',
    icon: Lightbulb,
    tint: 'bg-tint-yellow',
    color: 'text-accent-gold',
  },
  {
    title: 'Managing your watchlist',
    description: 'Track up to 10 stocks (Free) or unlimited (Premium) with real-time LTP and P&L.',
    duration: '2 min read',
    icon: HelpCircle,
    tint: 'bg-tint-purple',
    color: 'text-info-purple',
  },
];

export function HelpCenterPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
      const q = query.toLowerCase().trim();
      const matchesQuery = !q || faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <div className="space-y-4">
      <a
        href="/support"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </a>

      {/* Header */}
      <div className="card-soft hero-gradient p-5 relative overflow-hidden">
        <svg
          className="absolute right-4 top-4 opacity-30 pointer-events-none"
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden
        >
          <circle cx="40" cy="40" r="36" stroke="#2563EB" strokeWidth="2" fill="none" />
          <path d="M28 40 L36 48 L52 32" stroke="#2563EB" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="icon-tile bg-tint-blue-strong">
              <BookOpen className="h-5 w-5 text-brand-primary" />
            </div>
            <h2 className="font-heading text-xl font-bold text-text-primary">Help Center</h2>
          </div>
          <p className="mt-2 text-sm text-text-secondary max-w-[80%]">
            Find answers to common questions, browse guides, and learn how to get the most out of Pepertect.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card-soft p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Search FAQs, guides, and tutorials..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-lg border border-border bg-bg-surface-alt text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === cat
                ? 'bg-brand-primary text-white'
                : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface hover:text-text-primary border border-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Guides */}
      {activeCategory === 'All' && !query && (
        <div>
          <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Getting started guides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GUIDES.map((g) => {
              const Icon = g.icon;
              return (
                <a
                  key={g.title}
                  href="/learning"
                  className="card-soft p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={`icon-tile ${g.tint} shrink-0`}>
                      <Icon className={`h-5 w-5 ${g.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-text-primary">{g.title}</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{g.description}</p>
                      <p className="text-[10px] text-text-tertiary mt-2 flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        {g.duration}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* FAQ list */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">
          Frequently asked questions ({filteredFaqs.length})
        </h3>
        <div className="card-soft p-0 overflow-hidden">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center px-4">
              <HelpCircle className="h-10 w-10 text-text-secondary mx-auto mb-2" />
              <p className="text-sm font-medium text-text-primary">No results found</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Try a different search term or{' '}
                <a href="/support/new-ticket" className="text-brand-primary hover:underline">create a ticket</a>.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                const catMeta = CATEGORY_ICONS[faq.category] ?? CATEGORY_ICONS['Getting Started'];
                const CatIcon = catMeta.icon;
                return (
                  <div key={idx}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg-surface-alt transition-colors"
                    >
                      <div className={`icon-tile-sm ${catMeta.tint} shrink-0`}>
                        <CatIcon className={`h-3.5 w-3.5 ${catMeta.color}`} />
                      </div>
                      <p className="flex-1 text-sm font-medium text-text-primary">{faq.q}</p>
                      <ChevronDown
                        className={`h-4 w-4 text-text-tertiary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pl-14">
                        <p className="text-xs text-text-secondary leading-relaxed">{faq.a}</p>
                        <p className="mt-2 text-[10px] text-text-tertiary uppercase tracking-wide">
                          {faq.category}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="card-soft p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="icon-tile bg-tint-blue shrink-0">
            <FileText className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Didn&apos;t find what you were looking for?</p>
            <p className="text-xs text-text-secondary mt-0.5">Create a support ticket and we&apos;ll get back to you.</p>
          </div>
        </div>
        <a
          href="/support/new-ticket"
          className="shrink-0 rounded-lg bg-brand-primary text-white px-4 py-2 text-xs font-semibold hover:bg-brand-primary-hover"
        >
          New Ticket
        </a>
      </div>
    </div>
  );
}
