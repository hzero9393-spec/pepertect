'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  ArrowLeft,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Paperclip,
  AlertCircle,
} from 'lucide-react';

const TICKET_CATEGORIES = [
  { value: 'ACCOUNT', label: 'Account & Login' },
  { value: 'TRADING', label: 'Trading & Orders' },
  { value: 'PAYMENT', label: 'Payment & Subscription' },
  { value: 'DATA', label: 'Market Data Issue' },
  { value: 'BUG', label: 'Bug Report' },
  { value: 'FEATURE', label: 'Feature Request' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'text-text-secondary' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-accent-gold' },
  { value: 'HIGH', label: 'High', color: 'text-loss-red' },
];

export function NewTicketPage() {
  const { token } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('TRADING');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: string; subject: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `${subject.trim()}`,
          description: `[${category}] [${priority}]\n\n${description.trim()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreated({ id: data.data.id, subject: subject.trim() });
        setSubject('');
        setDescription('');
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-4">
        <a
          href="/support"
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support
        </a>
        <div className="card-soft p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-tint-green mb-4">
            <CheckCircle2 className="h-9 w-9 text-profit-green" />
          </div>
          <h2 className="font-heading text-xl font-bold text-text-primary">Ticket Created</h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Your support ticket has been submitted. Our team will get back to you within 24 hours.
          </p>
          <div className="mt-4 mx-auto max-w-sm rounded-lg border border-border bg-bg-surface-alt p-3 text-left">
            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide">Ticket ID</p>
            <p className="font-mono text-sm font-semibold text-text-primary mt-0.5">{created.id}</p>
            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wide mt-2">Subject</p>
            <p className="text-sm text-text-primary mt-0.5">{created.subject}</p>
          </div>
          <a
            href="/support"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            View All Tickets
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <a
        href="/support"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </a>

      <div className="card-soft p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tint-blue shrink-0">
            <FileText className="h-6 w-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-text-primary">Create Support Ticket</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Tell us what&apos;s going on. We typically respond within 24 hours.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-soft p-5 space-y-4">
        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Subject <span className="text-loss-red">*</span>
          </label>
          <input
            type="text"
            placeholder="Briefly describe your issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={120}
            className="w-full h-11 px-3 rounded-lg border border-border bg-bg-surface-alt text-sm font-medium text-text-primary placeholder:text-text-tertiary placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
          <p className="text-[10px] text-text-tertiary text-right">{subject.length}/120</p>
        </div>

        {/* Category + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-bg-surface-alt text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Priority</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITY_LEVELS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`h-11 rounded-lg border text-xs font-bold transition-colors ${
                    priority === p.value
                      ? 'border-brand-primary bg-tint-blue text-brand-primary'
                      : 'border-border bg-bg-surface-alt text-text-secondary hover:bg-bg-surface'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Description <span className="text-loss-red">*</span>
          </label>
          <textarea
            placeholder="Please provide as much detail as possible. Include steps to reproduce the issue, expected behaviour, and any error messages you saw."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            maxLength={2000}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-surface-alt text-sm text-text-primary placeholder:text-text-tertiary placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
          />
          <p className="text-[10px] text-text-tertiary text-right">{description.length}/2000</p>
        </div>

        {/* Attachments (mock) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Attachments (optional)</label>
          <button
            type="button"
            className="w-full h-11 rounded-lg border border-dashed border-border bg-bg-surface-alt text-text-secondary hover:bg-bg-surface hover:border-brand-primary/40 flex items-center justify-center gap-2 text-sm"
          >
            <Paperclip className="h-4 w-4" />
            Click to upload screenshots (max 5 MB)
          </button>
        </div>

        {/* Info banner */}
        <div className="rounded-lg border border-border bg-bg-surface-alt p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Please do not share sensitive information like passwords, OTPs, or payment details in the ticket description.
            Our support team will never ask for these.
          </p>
        </div>

        {error && (
          <p className="text-sm text-loss-red flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={creating || !subject.trim() || !description.trim()}
          className="w-full h-11 rounded-lg bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Ticket
            </>
          )}
        </button>
      </form>

      {/* Quick FAQ teaser */}
      <div className="card-soft p-4">
        <p className="font-heading text-sm font-semibold text-text-primary mb-2">Common questions</p>
        <a href="/support/help-center" className="flex items-center justify-between py-2 group">
          <span className="text-sm text-text-secondary group-hover:text-text-primary">Browse FAQs &amp; guides</span>
          <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-text-primary" />
        </a>
      </div>
    </div>
  );
}
