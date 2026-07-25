'use client'

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

const SWATCHES = [
  { name: "bg-base", className: "bg-bg-base", border: true },
  { name: "bg-surface", className: "bg-bg-surface", border: true },
  { name: "bg-surface-alt", className: "bg-bg-surface-alt", border: true },
  { name: "border-default", className: "bg-border-default" },
  { name: "text-primary", className: "bg-text-primary" },
  { name: "text-secondary", className: "bg-text-secondary" },
  { name: "brand-primary", className: "bg-brand-primary" },
  { name: "brand-primary-hover", className: "bg-brand-primary-hover" },
  { name: "accent-gold", className: "bg-accent-gold" },
  { name: "profit-green", className: "bg-profit-green" },
  { name: "loss-red", className: "bg-loss-red" },
  { name: "warning-amber", className: "bg-warning-amber" },
]

export default function VerificationPage() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  return (
    <main className="min-h-screen bg-bg-base px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-text-primary">
            Pepertect
          </h1>
          <p className="text-text-secondary">
            Part 1 — Design Token Verification
          </p>
        </header>

        {/* Theme Toggle */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-text-primary">Theme</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              Current: {mounted ? (theme === "dark" ? "Dark" : "Light") : "—"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="border-border-default text-text-primary"
            >
              {mounted && theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Toggle Theme
            </Button>
          </div>
        </section>

        {/* Color Swatches */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-text-primary">Design Token Swatches</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {SWATCHES.map((s) => (
              <div
                key={s.name}
                className={`rounded-lg p-3 space-y-2 ${s.border ? "border border-border-default" : ""}`}
              >
                <div className={`h-10 w-full rounded ${s.className}`} />
                <p className="text-xs font-mono text-text-secondary">{s.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Font Samples */}
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">Typography Samples</h2>
          <div className="rounded-lg border border-border-default bg-bg-surface p-5 space-y-4">
            <div>
              <p className="text-xs font-mono text-text-secondary mb-1">font-heading (Sora)</p>
              <p className="font-heading text-xl font-semibold text-text-primary">
                NIFTY 50 — 24,587.30 ↑ +1.2%
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-text-secondary mb-1">font-body (Inter)</p>
              <p className="font-body text-sm text-text-secondary">
                Your virtual portfolio gained ₹12,450 today across 3 active positions in the equity segment.
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-text-secondary mb-1">font-mono (IBM Plex Mono)</p>
              <p className="font-mono text-sm text-text-primary">
                LTP 2,458.30 | Chg +29.45 (1.21%) | Vol 12.4L | O 2,428.85 H 2,461.20 L 2,425.10 C 2,430.55
              </p>
            </div>
          </div>
        </section>

        {/* Buy / Sell Buttons */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-text-primary">Trade Action Buttons</h2>
          <div className="flex gap-4">
            <Button className="bg-profit-green hover:bg-profit-green/90 text-white font-semibold px-8">
              BUY
            </Button>
            <Button className="bg-loss-red hover:bg-loss-red/90 text-white font-semibold px-8">
              SELL
            </Button>
          </div>
        </section>

        {/* Card Sample */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-text-primary">Card Sample</h2>
          <div className="rounded-lg border border-border-default bg-bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-text-primary">RELIANCE</h3>
              <span className="font-mono text-sm text-profit-green">+₹24.50 (1.32%)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">LTP</span>
              <span className="font-mono font-medium text-text-primary">₹1,882.75</span>
            </div>
            <div className="h-px bg-border-default" />
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-text-secondary">Open</p>
                <p className="font-mono text-text-primary">1,860.20</p>
              </div>
              <div>
                <p className="text-text-secondary">High</p>
                <p className="font-mono text-text-primary">1,891.40</p>
              </div>
              <div>
                <p className="text-text-secondary">Low</p>
                <p className="font-mono text-text-primary">1,855.80</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
