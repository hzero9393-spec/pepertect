'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/common';
import { HelpCircle, Plus, Send, MessageSquare } from 'lucide-react';
import type { SupportTicket } from '@/types';

export function SupportPage() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchTickets = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/support', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTickets(data.data);
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
  };

  const activeTicket = tickets.find((t) => t.id === selectedTicket);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-warning-amber/10 text-warning-amber';
      case 'IN_PROGRESS': return 'bg-brand-primary/10 text-brand-primary';
      case 'RESOLVED': return 'bg-profit-green/10 text-profit-green';
      default: return 'bg-bg-surface-alt text-text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Ticket list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base font-semibold">Support Tickets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* New ticket form */}
            <div className="mb-4 space-y-2 rounded-lg border border-border-default bg-bg-base p-3">
              <Label className="text-xs">New Ticket</Label>
              <Input placeholder="Subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              <Textarea placeholder="Describe your issue..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} />
              <Button size="sm" onClick={handleCreate} disabled={creating || !newSubject || !newDescription}>
                <Plus className="mr-1 h-3 w-3" /> {creating ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />)}</div>
            ) : tickets.length === 0 ? (
              <EmptyState icon={HelpCircle} title="No tickets yet" description="Create a support ticket if you need help" />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedTicket === t.id ? 'border-brand-primary bg-brand-primary/5' : 'border-border-default hover:bg-bg-surface-alt'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-primary truncate">{t.subject}</p>
                      <span className={`shrink-0 ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{t.messages.length} messages</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat view */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base font-semibold">
              {activeTicket ? activeTicket.subject : 'Select a ticket'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTicket ? (
              <div className="space-y-4">
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {activeTicket.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.senderType === 'USER' ? 'bg-brand-primary text-white' : 'bg-bg-surface-alt text-text-primary'
                      }`}>
                        <p className="text-xs text-text-secondary mb-1">{msg.senderType}</p>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-[10px] mt-1 opacity-70">{new Date(msg.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleReply(activeTicket.id)}
                  />
                  <Button size="icon" onClick={() => handleReply(activeTicket.id)}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-8 w-8 text-text-secondary mb-2" />
                <p className="text-sm text-text-secondary">Select a ticket to view conversation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
