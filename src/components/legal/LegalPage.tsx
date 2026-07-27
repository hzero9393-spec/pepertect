'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, FileText } from 'lucide-react';

export interface LegalSection {
  heading: string;
  body: string[]; // paragraphs
}

export interface LegalDoc {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}

interface LegalPageProps {
  doc: LegalDoc;
}

export function LegalPage({ doc }: LegalPageProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="card-soft p-5">
        <a
          href="/support"
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Support
        </a>
        <div className="flex items-start gap-3">
          <div className="icon-tile bg-tint-blue shrink-0">
            <FileText className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-bold text-text-primary">{doc.title}</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Effective from {doc.effectiveDate}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">{doc.intro}</p>
      </div>

      {/* Sections */}
      <div className="card-soft p-5 space-y-5">
        {doc.sections.map((s, idx) => (
          <section key={idx}>
            <h2 className="font-heading text-sm font-semibold text-text-primary mb-2">
              {idx + 1}. {s.heading}
            </h2>
            <div className="space-y-2">
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-text-secondary leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[11px] text-text-tertiary">
          © {new Date().getFullYear()} Pepertect. For questions about this document, email{' '}
          <a href="mailto:support@pepertect.com" className="text-brand-primary hover:underline">
            support@pepertect.com
          </a>
        </p>
      </div>
    </div>
  );
}
