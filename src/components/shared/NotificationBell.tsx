'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, Settings, Trash2, TrendingUp, AlertTriangle, Gift, Star, Info } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteAllNotifications } from '@/hooks/useApi';

// Types
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: string | null;
  createdAt: string;
}

// Sound for notification bell
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Audio not supported - silent fail
  }
};

// Get icon based on notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'TRADE':
      return <TrendingUp className="h-4 w-4 text-brand-primary" />;
    case 'PRICE_ALERT':
      return <AlertTriangle className="h-4 w-4 text-accent-gold" />;
    case 'SUBSCRIPTION':
      return <Gift className="h-4 w-4 text-profit-green" />;
    case 'MILESTONE':
      return <Star className="h-4 w-4 text-accent-gold" />;
    default:
      return <Info className="h-4 w-4 text-text-secondary" />;
  }
};

// Get background color based on type and read status
const getNotificationBg = (type: string, isRead: boolean) => {
  if (isRead) return 'bg-bg-surface-alt/30';
  
  switch (type) {
    case 'TRADE':
      return 'bg-brand-primary/10 border-l-2 border-l-brand-primary';
    case 'PRICE_ALERT':
      return 'bg-accent-gold/10 border-l-2 border-l-accent-gold';
    case 'SUBSCRIPTION':
      return 'bg-profit-green/10 border-l-2 border-l-profit-green';
    case 'MILESTONE':
      return 'bg-purple-500/10 border-l-2 border-l-purple-500';
    default:
      return 'bg-bg-surface-alt/50';
  }
};

// Get navigation URL based on notification type and data
function getNotificationUrl(notif: Notification): string | null {
  try {
    const data = notif.data ? JSON.parse(notif.data) : null;
    
    switch (notif.type) {
      case 'TRADE':
        if (data?.symbol) return `/stock/${data.symbol}`;
        return '/positions';
      case 'SUBSCRIPTION':
        return null;
      case 'MILESTONE':
        return '/positions';
      case 'PRICE_ALERT':
        if (data?.symbol) return `/stock/${data.symbol}`;
        return '/watchlist';
      case 'SYSTEM':
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use React Query — auto-polls every 30s, deduplicates with shared cache
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteAll = useDeleteAllNotifications();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle notification click
  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      markRead.mutate(notif.id);
    }
    setIsOpen(false);
    const url = getNotificationUrl(notif);
    if (url) {
      router.push(url);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) playNotificationSound();
        }}
        className={cn(
          "relative p-2 rounded-xl transition-all duration-200",
          "hover:bg-bg-surface-alt active:scale-95",
          isOpen && "bg-bg-surface-alt"
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className={cn(
          "h-5 w-5 transition-colors",
          unreadCount > 0 ? "text-brand-primary" : "text-text-secondary"
        )} />
        
        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-loss-red px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-background shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-brand-primary/5 to-accent-gold/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary">
                  <span className="text-xs font-bold text-white">P</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-brand-primary font-medium">{unreadCount} new</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-brand-primary hover:bg-brand-primary/10 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-bg-surface-alt transition-colors"
                >
                  <X className="h-4 w-4 text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand-primary" />
                  <p className="mt-2 text-xs text-text-tertiary">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface-alt mb-3">
                    <Bell className="h-6 w-6 text-text-tertiary" />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">No notifications yet</p>
                  <p className="text-[11px] text-text-tertiary mt-1">We&apos;ll notify you when something happens!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        "p-3 cursor-pointer transition-colors hover:bg-bg-surface-alt/50",
                        getNotificationBg(notif.type, notif.isRead)
                      )}
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          notif.isRead ? "bg-bg-surface" : "bg-white shadow-sm"
                        )}>
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "text-sm font-semibold truncate",
                              notif.isRead ? "text-text-secondary" : "text-text-primary"
                            )}>
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-primary" />
                            )}
                          </div>
                          <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-text-tertiary mt-1">
                            {formatTimeAgo(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-bg-surface/30 flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm('Delete all notifications? This cannot be undone.')) {
                    deleteAll.mutate();
                  }
                }}
                disabled={deleteAll.isPending || notifications.length === 0}
                className={cn(
                  "flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-colors",
                  deleteAll.isPending || notifications.length === 0
                    ? "text-text-tertiary cursor-not-allowed"
                    : "text-loss-red hover:bg-loss-red/10"
                )}
              >
                <Trash2 className="h-4 w-4" />
                {deleteAll.isPending ? 'Deleting...' : 'Clear All'}
              </button>
              
              <a
                href="/settings/notifications"
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface-alt transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
