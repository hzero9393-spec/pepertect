'use client'

import { useAppStore } from '@/lib/store'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FooterPageLayoutProps {
  title: string
  icon: React.ReactNode
  lastUpdated: string
  children: React.ReactNode
}

export function FooterPageLayout({ title, icon, lastUpdated, children }: FooterPageLayoutProps) {
  const { setCurrentPage } = useAppStore()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage('dashboard')}
        className="mb-4 gap-1.5"
        style={{ color: '#00D09C' }}
      >
        <ArrowLeft className="size-4" />
        Back to Home
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex size-10 items-center justify-center rounded-xl"
            style={{ background: 'rgba(0, 208, 156, 0.08)', color: '#00D09C' }}
          >
            {icon}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#1a1a1a' }}>{title}</h1>
        </div>
        <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>Last updated: {lastUpdated}</p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}
