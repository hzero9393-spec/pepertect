'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/common';
import { Bell, BellOff, Check, Trash2 } from 'lucide-react';
import type { Notification } from '@/types';

export function NotificationsPage() {
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data);
          setUnreadCount(data.unreadCount);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchNotifications();
  }, [token]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(notifications.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    for (const n of notifications.filter((n) => !n.isRead)) {
      markAsRead(n.id);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TRADE': return 'bg-brand-primary/10 text-brand-primary';
      case 'SYSTEM': return 'bg-bg-surface-alt text-text-secondary';
      case 'SUBSCRIPTION': return 'bg-accent-gold/10 text-accent-gold';
      case 'PRICE_ALERT': return 'bg-warning-amber/10 text-warning-amber';
      default: return 'bg-bg-surface-alt text-text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">Notifications</h2>
          {unreadCount > 0 && <p className="text-sm text-text-secondary">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="mr-1 h-3 w-3" /> Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />)}</div>
          ) : notifications.length === 0 ? (
            <EmptyState icon={BellOff} title="No notifications" description="You're all caught up!" />
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                    notif.isRead ? 'border-border-default/50 bg-bg-base' : 'border-brand-primary/20 bg-brand-primary/5'
                  }`}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${getTypeColor(notif.type)}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${notif.isRead ? 'text-text-secondary' : 'font-medium text-text-primary'}`}>{notif.title}</p>
                      {!notif.isRead && <div className="h-2 w-2 rounded-full bg-brand-primary" />}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-text-secondary mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
