'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallPromptProps {
  className?: string;
}

// Helper to get today's date string (YYYY-MM-DD)
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function InstallPrompt({ className }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // Initialize dismissed state from localStorage
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const installed = localStorage.getItem('pepertect_app_installed');
    if (installed) return true;
    
    // Check if already dismissed TODAY
    const lastDismissed = localStorage.getItem('pepertect_install_dismissed_date');
    return lastDismissed === getTodayStr();
  });
  
  const [isIOS, setIsIOS] = useState(false);

  // Check if user has dismissed today or installed
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
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 15000); // 15 seconds after page load
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      localStorage.setItem('pepertect_app_installed', 'true');
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS or if no deferred prompt, show anyway after longer delay
    if ((isIOSDevice || !deferredPrompt) && !dismissed) {
      setTimeout(() => {
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 45000); // 45 seconds
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
    // Store TODAY's date - so it can show again tomorrow!
    localStorage.setItem('pepertect_install_dismissed_date', getTodayStr());
  };

  // Don't render if dismissed today or no prompt available
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
            "fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-xs",
            className
          )}
        >
          <div className="rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
            {/* Compact Header */}
            <div className="relative p-4 bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white">
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-3 pr-6">
                {/* App Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Install Pepertect</h3>
                  <p className="text-[11px] text-white/80">Add to Home Screen</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                Get full screen experience & faster access. Install Pepertect on your device!
              </p>

              {/* iOS Instructions */}
              {isIOS ? (
                <div className="p-3 rounded-xl bg-bg-surface-alt border border-border">
                  <p className="text-[11px] font-medium text-text-primary mb-1.5">
                    📱 How to install:
                  </p>
                  <ol className="text-[11px] text-text-secondary space-y-1 list-decimal list-inside">
                    <li>Tap the Share button below</li>
                    <li>Scroll & tap "Add to Home Screen"</li>
                    <li>Tap "Add" to confirm</li>
                  </ol>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {!isIOS ? (
                  <button
                    onClick={handleInstall}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary-hover transition-colors active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" />
                    Install App
                  </button>
                ) : (
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary-hover transition-colors active:scale-[0.98]"
                  >
                    Got it!
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl font-medium text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface-alt transition-colors"
                >
                  Later
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
