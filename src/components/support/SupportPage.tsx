'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  HelpCircle, Plus, Send, MessageSquare, Headphones, Sparkles,
  Ticket as TicketIcon, ChevronRight, Mail, FileText,
  Search, Filter,
} from 'lucide-react';
import type { SupportTicket } from '@/types';

type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Closed' },
];

export function SupportPage() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const fetchTickets = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/support', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTickets(data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [token]);

  const handleCreate = async () => {
    if (!newSubject || !newDescription) return;
    setCreating(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject, description: newDescription }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSubject('');
        setNewDescription('');
        fetchTickets();
        setSelectedTicket(data.data.id);
      }
    } catch {
      /* ignore */
    }
    setCreating(false);
  };

  const handleReply = async (ticketId: string) => {
    if (!replyContent) return;
    try {
      await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });
      setReplyContent('');
      fetchTickets();
    } catch {
      /* ignore */
    }
  };

  const activeTicket = tickets.find((t) => t.id === selectedTicket);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-tint-yellow text-accent-gold';
      case 'IN_PROGRESS': return 'bg-tint-blue text-brand-primary';
      case 'RESOLVED': return 'bg-tint-green text-profit-green';
      default: return 'bg-bg-surface-alt text-text-secondary';
    }
  };

  const counts = {
    ALL: tickets.length,
    OPEN: tickets.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
  };

  const filteredTickets = statusFilter === 'ALL' ? tickets : tickets.filter((t) => t.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* ============== HERO CARD ============== */}
      <div className="card-soft hero-support p-5 relative overflow-hidden">
        {/* Decorative chat bubble */}
        <svg
          className="absolute right-4 top-4 opacity-40 pointer-events-none"
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden
        >
          <path
            d="M16 12 C 8 12 4 16 4 24 L 4 44 C 4 52 8 56 16 56 L 22 56 L 22 66 L 36 56 L 60 56 C 68 56 72 52 72 44 L 72 24 C 72 16 68 12 60 12 Z"
            fill="#2563EB"
            opacity="0.25"
          />
          <circle cx="22" cy="34" r="3" fill="#2563EB" opacity="0.6" />
          <circle cx="36" cy="34" r="3" fill="#2563EB" opacity="0.6" />
          <circle cx="50" cy="34" r="3" fill="#2563EB" opacity="0.6" />
        </svg>

        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="icon-tile bg-tint-blue-strong">
              <Headphones className="h-5 w-5 text-brand-primary" />
            </div>
            <h2 className="font-heading text-xl font-bold text-text-primary">How can we help you?</h2>
          </div>
          <p className="mt-2 text-sm text-text-secondary max-w-[80%]">
            Browse our help center or create a support ticket. Our team is here to assist you with any questions.
          </p>
        </div>
      </div>

      {/* ============== CREATE TICKET CARD ============== */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Create a New Ticket</h3>
          <a
            href="/support/new-ticket"
            className="text-xs font-semibold text-brand-primary hover:underline"
          >
            Open full page →
          </a>
        </div>
        <div className="card-soft p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Subject</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Briefly describe your issue"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full h-11 px-3 pr-10 rounded-lg border border-border bg-bg-surface-alt text-sm font-medium text-text-primary placeholder:text-text-tertiary placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Describe your issue</label>
            <textarea
              placeholder="Provide details about your problem..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-surface-alt text-sm text-text-primary placeholder:text-text-tertiary placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-surface text-text-secondary hover:bg-bg-surface-alt"
              aria-label="Attach file"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newSubject || !newDescription}
              className="flex-1 h-10 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </div>
      </div>

      {/* ============== YOUR TICKETS ============== */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Your Tickets</h3>
          <button className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
            <Filter className="h-3 w-3" />
            Filter
          </button>
        </div>
        <div className="card-soft">
          {/* Status filter tabs */}
          <div className="flex items-center border-b border-border px-2 overflow-x-auto no-scrollbar">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="seg-tab whitespace-nowrap"
                data-active={statusFilter === f.key}
              >
                {f.label}
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="p-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tint-blue mb-3">
                  <FileText className="h-8 w-8 text-brand-primary" />
                </div>
                <p className="font-heading text-sm font-semibold text-text-primary">No tickets yet</p>
                <p className="text-xs text-text-secondary mt-0.5">You haven't raised any support tickets.</p>
                <a
                  href="/support/new-ticket"
                  className="mt-4 rounded-lg border border-brand-primary text-brand-primary px-4 py-2 text-xs font-semibold hover:bg-tint-blue inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create your first ticket
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t.id)}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition-colors',
                      selectedTicket === t.id
                        ? 'border-brand-primary bg-tint-blue'
                        : 'border-border hover:bg-bg-surface-alt'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-primary truncate flex-1">{t.subject}</p>
                      <span className={cn('pill shrink-0 ml-2', getStatusColor(t.status))}>
                        {t.status === 'IN_PROGRESS' ? 'In Progress' : t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="mx-1">·</span>
                      {t.messages?.length || 0} messages
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============== TICKET CONVERSATION (if any selected) ============== */}
      {activeTicket && (
        <div>
          <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Conversation</h3>
          <div className="card-soft p-4">
            <h4 className="font-heading text-sm font-semibold text-text-primary mb-3">{activeTicket.subject}</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {(activeTicket.messages || []).map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex', msg.senderType === 'USER' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2',
                      msg.senderType === 'USER'
                        ? 'bg-brand-primary text-white'
                        : 'bg-bg-surface-alt text-text-primary'
                    )}
                  >
                    <p className="text-[10px] opacity-70 mb-0.5">{msg.senderType}</p>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-[10px] mt-1 opacity-70">
                      {new Date(msg.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                placeholder="Type your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply(activeTicket.id)}
                className="flex-1 h-10 px-3 rounded-lg border border-border bg-bg-surface-alt text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <button
                onClick={() => handleReply(activeTicket.id)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover"
                aria-label="Send reply"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== RESOURCES ============== */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Resources</h3>
        <div className="card-soft p-1">
          <ResourceRow
            icon={Sparkles}
            tint="bg-tint-purple"
            color="text-info-purple"
            label="Help Center"
            subtext="FAQs, guides, and tutorials"
            href="/support/help-center"
          />
          <ResourceRow
            icon={MessageSquare}
            tint="bg-tint-green"
            color="text-profit-green"
            label="Live Chat"
            subtext="Chat with our support team"
            href="/support/live-chat"
          />
          <ResourceRow
            icon={Mail}
            tint="bg-tint-blue"
            color="text-brand-primary"
            label="Email Support"
            subtext="support@pepertect.com · We reply in 24 hours"
            href="mailto:support@pepertect.com"
            last
          />
        </div>
      </div>

      {/* ============== QUICK ACTIONS (3 main buttons) ============== */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Need more help?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/support/new-ticket"
            className="card-soft p-4 hover:shadow-md transition-shadow group"
          >
            <div className="icon-tile bg-tint-blue mb-3">
              <Plus className="h-5 w-5 text-brand-primary" />
            </div>
            <p className="font-semibold text-sm text-text-primary">Create a Ticket</p>
            <p className="text-[11px] text-text-secondary mt-0.5">Get a dedicated support thread</p>
          </a>
          <a
            href="/support/help-center"
            className="card-soft p-4 hover:shadow-md transition-shadow group"
          >
            <div className="icon-tile bg-tint-purple mb-3">
              <Sparkles className="h-5 w-5 text-info-purple" />
            </div>
            <p className="font-semibold text-sm text-text-primary">Help Center</p>
            <p className="text-[11px] text-text-secondary mt-0.5">Browse FAQs &amp; guides</p>
          </a>
          <a
            href="/support/live-chat"
            className="card-soft p-4 hover:shadow-md transition-shadow group"
          >
            <div className="icon-tile bg-tint-green mb-3">
              <MessageSquare className="h-5 w-5 text-profit-green" />
            </div>
            <p className="font-semibold text-sm text-text-primary">Live Chat</p>
            <p className="text-[11px] text-text-secondary mt-0.5">Chat with our team instantly</p>
          </a>
        </div>
      </div>

      {/* ============== LEGAL / FOOTER ============== */}
      <div className="card-soft p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary mb-3">Legal &amp; Policies</h3>
        <div className="grid grid-cols-2 gap-2">
          <LegalLink href="/legal/terms" label="Terms & Conditions" />
          <LegalLink href="/legal/privacy" label="Privacy Policy" />
          <LegalLink href="/legal/disclaimer" label="Disclaimer" />
          <LegalLink href="/legal/refund" label="Refund Policy" />
          <LegalLink href="/legal/cookies" label="Cookie Policy" />
          <LegalLink href="/legal/grievance" label="Grievance Officer" />
        </div>
        <div className="mt-4 pt-3 border-t border-border text-center">
          <p className="text-[11px] text-text-tertiary">
            © {new Date().getFullYear()} Pepertect. Paper trading platform for educational purposes only.
          </p>
          <p className="text-[10px] text-text-tertiary mt-1">
            Investments in securities market are subject to market risks. Read all documents carefully before investing.
          </p>
        </div>
      </div>
    </div>
  );
}

function LegalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-lg border border-border bg-bg-base px-3 py-2.5 text-xs font-medium text-text-primary hover:bg-bg-surface-alt hover:border-brand-primary/30 transition-colors"
    >
      <FileText className="h-3.5 w-3.5 text-text-secondary shrink-0" />
      <span className="truncate">{label}</span>
      <ChevronRight className="h-3 w-3 text-text-tertiary ml-auto shrink-0" />
    </a>
  );
}

function ResourceRow({
  icon: Icon,
  tint,
  color,
  label,
  subtext,
  href,
  last,
}: {
  icon: React.ElementType;
  tint: string;
  color: string;
  label: string;
  subtext: string;
  href: string;
  last?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-3 transition-colors hover:bg-bg-surface-alt',
        !last && 'border-b border-border'
      )}
    >
      <div className={cn('icon-tile', tint)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary truncate">{subtext}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
    </a>
  );
}
