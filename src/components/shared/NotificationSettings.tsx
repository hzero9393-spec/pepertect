'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';

// Notification type definitions
const NOTIFICATION_TYPES = [
  {
    key: 'TRADE',
    label: 'Trade Notifications',
    description: 'Order executed, Stop Loss hit, Target achieved',
    icon: '💹',
  },
  {
    key: 'SYSTEM',
    label: 'System Notifications',
    description: 'Welcome messages, system updates',
    icon: '🔔',
  },
  {
    key: 'PRICE_ALERT',
    label: 'Price Alerts',
    description: 'When stocks hit your target prices',
    icon: '📊',
  },
  {
    key: 'SUBSCRIPTION',
    label: 'Subscription Updates',
    description: 'Trial status, payment confirmations',
    icon: '💳',
  },
  {
    key: 'MILESTONE',
    label: 'Milestones',
    description: 'Achievement celebrations',
    icon: '🏆',
  },
] as const;

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { token } = useAuthStore();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // Which one is being saved
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current preferences
  const fetchPreferences = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch('/api/user/notification-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setPreferences(data.preferences || {});
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Toggle a single preference
  const togglePreference = async (key: string, value: boolean) => {
    if (!token || saving === key) return;
    
    setSaving(key);
    setSuccess(null);

    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      const data = await res.json();

      if (data.success) {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setSuccess(key);
        
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand-primary" />
            Notification Preferences
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Choose which notifications you want to receive
          </p>
        </div>
        
        {/* Enable All / Disable All */}
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              const allEnabled = Object.values(preferences).every(v => v);
              NOTIFICATION_TYPES.forEach(t => togglePreference(t.key, !allEnabled));
            }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border hover:bg-bg-surface-alt transition-colors"
          >
            {Object.values(preferences).every(v => v) ? 'Disable All' : 'Enable All'}
          </button>
        </div>
      </div>

      {/* Preferences List */}
      <div className="space-y-2">
        {NOTIFICATION_TYPES.map((type) => {
          const isEnabled = preferences[type.key] !== false; // Default to enabled
          const isSaving = saving === type.key;
          const showSuccess = success === type.key;

          return (
            <motion.div
              key={type.key}
              layout
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all",
                isEnabled 
                  ? "border-border bg-bg-surface-alt/50" 
                  : "border-border/50 bg-bg-surface opacity-60"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">{type.icon}</span>
                <div className="min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    isEnabled ? "text-text-primary" : "text-text-secondary"
                  )}>
                    {type.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary truncate">
                    {type.description}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => togglePreference(type.key, !isEnabled)}
                disabled={isSaving}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-all duration-300 shrink-0",
                  "focus:outline-none focus:ring-2 focus:ring-brand-primary/30",
                  isEnabled 
                    ? "bg-brand-primary" 
                    : "bg-border"
                )}
              >
                {/* Thumb */}
                <motion.div
                  layout
                  animate={{ x: isEnabled ? 20 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "absolute top-1 h-5 w-5 rounded-full shadow-md flex items-center justify-center",
                    isEnabled ? "bg-white" : "bg-text-tertiary"
                  )}
                >
                  {showSuccess ? (
                    <Check className="h-3 w-3 text-profit-green" />
                  ) : isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin text-text-secondary" />
                  ) : (
                    <Bell className={cn(
                      "h-3 w-3",
                      isEnabled ? "text-brand-primary" : "text-text-tertiary"
                    )} />
                  )}
                </motion.div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="p-3 rounded-xl bg-info-purple/10 border border-info-purple/20">
        <p className="text-[11px] text-text-secondary leading-relaxed flex items-start gap-2">
          <BellOff className="h-4 w-4 text-info-purple mt-0.5 shrink-0" />
          Disabling a notification type means you won&apos;t receive alerts of that category.
          Important account-related notifications will always be delivered.
        </p>
      </div>
    </div>
  );
}
