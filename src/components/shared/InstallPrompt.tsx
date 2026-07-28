'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallPromptProps {
  className?: string;
}

export function InstallPrompt({ className }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Initialize dismissed state from localStorage
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissedBefore = localStorage.getItem('pepertect_install_dismissed');
    const installed = localStorage.getItem('pepertect_app_installed');
    return !!(dismissedBefore || installed);
  });
  const [isIOS, setIsIOS] = useState(false);

  // Check if user has dismissed before
  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay (don't annoy immediately)
      setTimeout(() => {
        setShowPrompt(true);
      }, 10000); // 10 seconds after page load
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      localStorage.setItem('pepertect_app_installed', 'true');
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS or if no deferred prompt, show anyway after longer delay
    if (isIOSDevice || !deferredPrompt) {
      setTimeout(() => {
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('pepertect_app_installed', 'true');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // Fallback - show instructions
      setShowPrompt(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pepertect_install_dismissed', Date.now().toString());
  };

  // Don't render if dismissed or no prompt available
  if (dismissed || !showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm",
            className
          )}
        >
          <div className="rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
            {/* Header */}
            <div className="relative p-4 pb-3 bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white">
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-3 pr-6">
                {/* App Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                  <span className="text-2xl font-bold">P</span>
                </div>
                <div>
                  <h3 className="font-bold text-base">Install Pepertect</h3>
                  <p className="text-xs text-white/80">Paper Trading Platform</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-text-secondary leading-relaxed">
                Install Pepertect on your device for:
              </p>

              <ul className="space-y-2">
                {[
                  { icon: Smartphone, text: 'Full screen experience' },
                  { icon: Download, text: 'Offline access' },
                  { icon: Monitor, text: 'Faster loading times' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-text-primary">
                    <item.icon className="h-4 w-4 text-profit-green shrink-0" />
                    {item.text}
                  </li>
                ))}
              </ul>

              {/* iOS Instructions */}
              {isIOS ? (
                <div className="p-3 rounded-xl bg-bg-surface-alt border border-border">
                  <p className="text-xs font-medium text-text-primary mb-1">
                    How to install:
                  </p>
                  <ol className="text-[11px] text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Tap the Share button in Safari</li>
                    <li>Scroll and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to confirm</li>
                  </ol>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {!isIOS && (
                  <button
                    onClick={handleInstall}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary-hover transition-colors active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" />
                    Install Now
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className={cn(
                    "py-2.5 rounded-xl font-medium text-sm transition-colors",
                    isIOS ? "w-full bg-bg-surface-alt text-text-secondary hover:bg-bg-surface" : "px-4 text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Type declaration for BeforeInstallPromptEvent
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
