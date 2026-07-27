'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Headphones,
  Bot,
  User,
  Circle,
  Paperclip,
  Smile,
  Phone,
  Mail,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'BOT' | 'AGENT';
  text: string;
  ts: number;
}

const QUICK_REPLIES = [
  'How do I reset my virtual capital?',
  'What is the difference between Free and Premium?',
  'How do option strikes work?',
  'My balance did not update after a trade',
];

const BOT_AUTO_REPLIES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ['reset', 'capital', 'virtual'],
    reply: 'You can reset your virtual capital from Profile → Reset Capital. This will close all open positions and reset your balance to your plan\'s default (₹10,000 Free / ₹1,00,000 Premium). The reset is irreversible.',
  },
  {
    keywords: ['premium', 'free', 'plan', 'subscription', 'upgrade'],
    reply: 'Free plan: ₹10,000 virtual capital, equity trading, 10-stock watchlist. Premium (₹299/month): ₹1,00,000 capital, F&O trading, unlimited watchlist, priority support. Upgrade from Profile → Subscription.',
  },
  {
    keywords: ['option', 'strike', 'chain'],
    reply: 'The option chain page shows all strikes for NIFTY, SENSEX, BANKNIFTY, FINNIFTY. Click any strike to see its detailed overview (OI, IV, volume, moneyness, ITM/OTM status). You can place a paper trade directly from there.',
  },
  {
    keywords: ['balance', 'trade', 'update', 'deduct', 'money'],
    reply: 'Your Total Balance and Available Margin should update immediately after every trade. If you see stale numbers, please refresh the dashboard. If it still does not update, please raise a ticket from /support/new-ticket with the order ID.',
  },
  {
    keywords: ['hi', 'hello', 'hey'],
    reply: 'Hi there! 👋 I am the Pepertect assistant. How can I help you today? You can ask about trading, your account, subscriptions, or pick a quick reply below.',
  },
];

let msgCounter = 0;
function newMsgId() {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

function findBotReply(text: string): string {
  const t = text.toLowerCase();
  for (const r of BOT_AUTO_REPLIES) {
    if (r.keywords.some((k) => t.includes(k))) return r.reply;
  }
  return 'Thanks for your message! I have notified our support team — they typically respond within 15 minutes during market hours (9 AM – 6 PM IST). For urgent issues, please raise a ticket at /support/new-ticket.';
}

export function LiveChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: newMsgId(),
      sender: 'BOT',
      text: 'Hi! 👋 Welcome to Pepertect Live Chat. I am your virtual assistant. Ask me anything or pick a quick reply below to get started.',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [agentJoined, setAgentJoined] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, botTyping]);

  // Simulate agent joining after the user sends their first message
  useEffect(() => {
    if (messages.length >= 3 && !agentJoined) {
      const t = setTimeout(() => setAgentJoined(true), 4000);
      return () => clearTimeout(t);
    }
  }, [messages, agentJoined]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: newMsgId(),
      sender: 'USER',
      text: text.trim(),
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBotTyping(true);
    setTimeout(() => {
      setBotTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: newMsgId(),
          sender: 'BOT',
          text: findBotReply(text),
          ts: Date.now(),
        },
      ]);
    }, 900 + Math.random() * 600);
  };

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
      <div className="card-soft p-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tint-green">
              <MessageSquare className="h-6 w-6 text-profit-green" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-profit-green ring-2 ring-bg-base" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-base font-bold text-text-primary">Pepertect Live Chat</h1>
              <span className="pill bg-tint-green text-profit-green text-[10px]">
                <Circle className="h-2 w-2 fill-profit-green" />
                Online
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {agentJoined ? 'Support agent joined the chat' : 'Virtual assistant · Replies instantly'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-bg-surface-alt"
              aria-label="Call"
              title="Call support"
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-bg-surface-alt"
              aria-label="Email"
              title="Email support"
            >
              <Mail className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat window */}
      <div className="card-soft p-0 overflow-hidden flex flex-col" style={{ minHeight: '60vh' }}>
        {/* Conversation */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3"
          style={{ maxHeight: '50vh' }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'USER';
            return (
              <div
                key={msg.id}
                className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}
              >
                {!isUser && (
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      msg.sender === 'BOT' ? 'bg-tint-blue' : 'bg-tint-green'
                    )}
                  >
                    {msg.sender === 'BOT' ? (
                      <Bot className="h-3.5 w-3.5 text-brand-primary" />
                    ) : (
                      <Headphones className="h-3.5 w-3.5 text-profit-green" />
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2',
                    isUser
                      ? 'bg-brand-primary text-white rounded-br-sm'
                      : msg.sender === 'BOT'
                        ? 'bg-bg-surface-alt text-text-primary rounded-bl-sm'
                        : 'bg-tint-green text-text-primary rounded-bl-sm border border-profit-green/20'
                  )}
                >
                  <p className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5 font-semibold">
                    {isUser ? 'You' : msg.sender === 'BOT' ? 'Assistant' : 'Support Agent'}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-[10px] mt-1 opacity-60">
                    {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/20">
                    <User className="h-3.5 w-3.5 text-brand-primary" />
                  </div>
                )}
              </div>
            );
          })}
          {botTyping && (
            <div className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-blue">
                <Bot className="h-3.5 w-3.5 text-brand-primary" />
              </div>
              <div className="bg-bg-surface-alt rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-pulse [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          {agentJoined && (
            <div className="flex items-center gap-2 text-[11px] text-text-tertiary italic justify-center py-2">
              <Headphones className="h-3 w-3" />
              Support agent joined the chat
            </div>
          )}
        </div>

        {/* Quick replies */}
        {messages.length <= 2 && (
          <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:text-brand-primary hover:border-brand-primary/40"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-border p-2 sm:p-3 bg-bg-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-surface-alt shrink-0"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-bg-base text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-surface-alt shrink-0"
              aria-label="Emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover disabled:opacity-40 shrink-0"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer info */}
      <div className="card-soft p-3 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Support hours: 9 AM – 6 PM IST, Mon–Sat</span>
        </div>
        <a href="/support/new-ticket" className="text-brand-primary hover:underline font-medium">
          Raise a ticket →
        </a>
      </div>
    </div>
  );
}
