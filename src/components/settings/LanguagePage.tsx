'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  Globe,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Check,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English',  native: 'English'    },
  { code: 'hi', label: 'Hindi',    native: 'हिन्दी'      },
  { code: 'mr', label: 'Marathi',  native: 'मराठी'       },
  { code: 'ta', label: 'Tamil',    native: 'தமிழ்'       },
  { code: 'te', label: 'Telugu',   native: 'తెలుగు'      },
  { code: 'bn', label: 'Bengali',  native: 'বাংলা'        },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી'     },
  { code: 'kn', label: 'Kannada',  native: 'ಕನ್ನಡ'        },
];

export function LanguagePage() {
  const { token } = useAuthStore();
  const [current, setCurrent] = useState<string>('en');
  const [selected, setSelected] = useState<string>('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/user/preferences', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCurrent(d.data.language);
          setSelected(d.data.language);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (selected === current) return;
    setSaving(true);
    setSavedMessage(false);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selected }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrent(selected);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2500);
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <a
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt"
          aria-label="Back to profile"
        >
          <ChevronLeft className="h-5 w-5" />
        </a>
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Language</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Choose your preferred language
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card-soft p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span className="ml-2 text-sm text-text-secondary">Loading...</span>
        </div>
      ) : (
        <>
          <div className="card-soft p-3 flex items-start gap-2">
            <Globe className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              The app interface will use your selected language where translations are available.
              Some content (stock names, market data) will continue to be shown in English.
            </p>
          </div>

          <div className="card-soft p-0 overflow-hidden">
            <div className="divide-y divide-border">
              {LANGUAGES.map((lang) => {
                const isSelected = selected === lang.code;
                const isCurrent = current === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setSelected(lang.code)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 sm:p-4 text-left transition-colors',
                      isSelected ? 'bg-tint-blue' : 'hover:bg-bg-surface-alt'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shrink-0',
                      isSelected ? 'bg-brand-primary text-white' : 'bg-bg-surface-alt text-text-secondary'
                    )}>
                      {lang.code.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{lang.label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{lang.native}</p>
                    </div>
                    {isCurrent && (
                      <span className="pill bg-tint-green text-profit-green">Current</span>
                    )}
                    {isSelected && !isCurrent && (
                      <Check className="h-5 w-5 text-brand-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || selected === current}
            className={cn(
              'w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors',
              saving || selected === current
                ? 'bg-brand-primary/40 cursor-not-allowed'
                : 'bg-brand-primary hover:bg-brand-primary/90'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : savedMessage ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Language updated!
              </>
            ) : (
              'Save Language'
            )}
          </button>
        </>
      )}
    </div>
  );
}
