'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  LogOut,
  MapPin,
  Shield,
  Chrome,
  AlertTriangle,
  Loader2,
  MonitorSmartphone,
  Wifi,
  Fingerprint,
  KeyRound,
  Activity,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────

interface SessionInfo {
  id: string
  browser: string
  os: string
  deviceType: string
  location: string | null
  ipAddress: string | null
  device: string
  isCurrent: boolean
  createdAt: string
  expiresAt: string
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatExpiry(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function getBrowserIcon(browser: string) {
  const b = browser.toLowerCase()
  if (b.includes('chrome')) return '🌐'
  if (b.includes('firefox')) return '🦊'
  if (b.includes('safari')) return '🧭'
  if (b.includes('edge')) return '🔷'
  if (b.includes('opera')) return '🔴'
  return '🌐'
}

function getOsIcon(os: string) {
  const o = os.toLowerCase()
  if (o.includes('windows')) return '🪟'
  if (o.includes('mac')) return '🍎'
  if (o.includes('linux')) return '🐧'
  if (o.includes('android')) return '🤖'
  if (o.includes('ios') || o.includes('iphone') || o.includes('ipad')) return '📱'
  if (o.includes('chrome')) return '💻'
  return '💻'
}

// ─── Animation ───────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

// ─── Component ───────────────────────────────────────────────────

export function ActiveDevicesPage() {
  const { token, logout } = useAuthStore()
  const { setCurrentPage } = useAppStore()
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = useState(false)
  const [logoutAllSubmitting, setLogoutAllSubmitting] = useState(false)
  const [loggingOutSessionId, setLoggingOutSessionId] = useState<string | null>(null)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  // Fetch Sessions
  const fetchSessions = useCallback(async () => {
    if (!token) return
    setSessionsLoading(true)
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {
      // Silent
    } finally {
      setSessionsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Logout single session
  const handleLogoutSession = async (sessionId: string) => {
    if (!token) return
    setLoggingOutSessionId(sessionId)
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Device logged out successfully')
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        setExpandedSession(null)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to logout device')
      }
    } catch {
      toast.error('Failed to logout device')
    } finally {
      setLoggingOutSessionId(null)
    }
  }

  // Logout all
  const handleLogoutAll = async () => {
    if (!token) return
    setLogoutAllSubmitting(true)
    try {
      const res = await fetch('/api/profile/logout-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      toast.success(`Logged out from ${data.sessionsTerminated} device(s)`)
      setLogoutAllConfirmOpen(false)
      fetchSessions()
    } catch {
      toast.error('Failed to logout from all devices')
    } finally {
      setLogoutAllSubmitting(false)
    }
  }

  const currentSession = sessions.find(s => s.isCurrent)
  const otherSessions = sessions.filter(s => !s.isCurrent)

  let si = 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto bg-[#f5f7fa] min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => setCurrentPage('profile')}
            className="size-9 rounded-lg bg-white border border-[#e8eaf0] flex items-center justify-center hover:bg-[#f0f2f5] transition-colors"
          >
            <ArrowLeft className="size-4 text-[#6b7280]" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-[#00D09C]/10 flex items-center justify-center">
              <MonitorSmartphone className="size-5 text-[#00D09C]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1a1a2e]">Active Devices</h1>
              <p className="text-xs text-[#9ca3af]">Manage your login sessions</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Overview Card ────────────────────────────────────── */}
      <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
        <div className="bg-white border border-[#e8eaf0] rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="size-10 rounded-full bg-[#00D09C] flex items-center justify-center ring-2 ring-white">
                  <Monitor className="size-5 text-white" />
                </div>
                {otherSessions.length > 0 && (
                  <div className="size-10 rounded-full bg-[#5367ff] flex items-center justify-center ring-2 ring-white">
                    <span className="text-xs font-bold text-white">+{otherSessions.length}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a1a2e]">
                  {sessions.length} Active Device{sessions.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-[#9ca3af]">
                  Your account is currently logged in on {sessions.length} device{sessions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {otherSessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogoutAllConfirmOpen(true)}
                className="text-xs font-semibold text-[#EB5B3C] border-[#eb5b3c]/20 hover:bg-[#EB5B3C]/5 hover:text-[#EB5B3C] gap-1.5"
              >
                <LogOut className="size-3.5" />
                Logout All
              </Button>
            )}
          </div>

          {/* Security Tip */}
          {otherSessions.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-[#fef2ef] border border-[#eb5b3c]/10 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-[#EB5B3C] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#EB5B3C]">Security Tip</p>
                <p className="text-[11px] text-[#9ca3af] mt-0.5">
                  If you see any device you don&apos;t recognize, logout from it immediately and change your password.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Loading State ────────────────────────────────────── */}
      {sessionsLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border border-[#e8eaf0] rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Current Device ────────────────────────────────── */}
          {currentSession && (
            <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
              <div className="bg-white border-2 border-[#00D09C]/20 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-[#00D09C] animate-pulse" />
                      <span className="text-xs font-bold text-[#00D09C] uppercase tracking-wider">Current Device</span>
                    </div>
                    <Badge className="bg-[#00D09C]/10 text-[#00D09C] border-0 text-[10px] px-2 py-0.5 font-bold">
                      <Shield className="size-3 mr-1" />
                      Active Now
                    </Badge>
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div className={cn(
                      "size-14 rounded-xl flex items-center justify-center shrink-0",
                      currentSession.deviceType === 'Mobile'
                        ? "bg-[#5367ff]/10"
                        : currentSession.deviceType === 'Tablet'
                          ? "bg-[#f59e0b]/10"
                          : "bg-[#00D09C]/10"
                    )}>
                      {currentSession.deviceType === 'Mobile' ? (
                        <Smartphone className="size-7 text-[#5367ff]" />
                      ) : currentSession.deviceType === 'Tablet' ? (
                        <Tablet className="size-7 text-[#f59e0b]" />
                      ) : (
                        <Monitor className="size-7 text-[#00D09C]" />
                      )}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-[#1a1a2e] flex items-center gap-2">
                        <span>{getOsIcon(currentSession.os)}</span>
                        {currentSession.os}
                      </h3>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                          <Globe className="size-3.5 shrink-0 text-[#9ca3af]" />
                          <span>{currentSession.browser}</span>
                        </div>
                        {currentSession.ipAddress && (
                          <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                            <Wifi className="size-3.5 shrink-0 text-[#9ca3af]" />
                            <span>IP: {currentSession.ipAddress.split(',')[0].trim()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                          <MapPin className="size-3.5 shrink-0 text-[#00D09C]" />
                          <span className="font-medium">{currentSession.location && currentSession.location !== 'Unknown Location' ? currentSession.location : 'Detecting...'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                          <Clock className="size-3.5 shrink-0 text-[#9ca3af]" />
                          <span>Login: {formatRelativeTime(currentSession.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <div className="mt-4 pt-4 border-t border-[#e8eaf0]/50">
                    <button
                      onClick={() => setExpandedSession(expandedSession === currentSession.id ? null : currentSession.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#5367ff] hover:text-[#4356e0] transition-colors"
                    >
                      {expandedSession === currentSession.id ? 'Hide' : 'Show'} Details
                      <ChevronRight className={cn(
                        "size-3 transition-transform",
                        expandedSession === currentSession.id && "rotate-90"
                      )} />
                    </button>
                    {expandedSession === currentSession.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 space-y-2"
                      >
                        <DetailRow icon={Fingerprint} label="Session ID" value={currentSession.id.slice(0, 16) + '...'} />
                        <DetailRow icon={KeyRound} label="Browser" value={currentSession.browser} />
                        <DetailRow icon={Monitor} label="Device Type" value={currentSession.deviceType} />
                        <DetailRow icon={Globe} label="IP Address" value={currentSession.ipAddress?.split(',')[0].trim() || 'N/A'} />
                        <DetailRow icon={MapPin} label="Location" value={currentSession.location || 'Unknown'} />
                        <DetailRow icon={Clock} label="Login Time" value={formatFullDate(currentSession.createdAt)} />
                        <DetailRow icon={Shield} label="Session Expires" value={formatExpiry(currentSession.expiresAt)} />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Other Devices ─────────────────────────────────── */}
          {otherSessions.length > 0 && (
            <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
              <div className="flex items-center gap-2 mb-1 px-1">
                <h2 className="text-sm font-bold text-[#1a1a2e]">Other Devices</h2>
                <Badge className="bg-[#f0f2f5] text-[#6b7280] border-0 text-[10px] px-1.5 py-0 font-bold">
                  {otherSessions.length}
                </Badge>
              </div>
            </motion.div>
          )}

          {otherSessions.map((session, idx) => (
            <motion.div
              key={session.id}
              custom={si++}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <div className={cn(
                "bg-white border rounded-2xl shadow-sm overflow-hidden transition-all",
                expandedSession === session.id ? "border-[#5367ff]/20" : "border-[#e8eaf0] hover:border-[#e8eaf0]/80"
              )}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div className={cn(
                      "size-12 rounded-xl flex items-center justify-center shrink-0",
                      session.deviceType === 'Mobile'
                        ? "bg-[#5367ff]/10"
                        : session.deviceType === 'Tablet'
                          ? "bg-[#f59e0b]/10"
                          : "bg-[#f0f2f5]"
                    )}>
                      {session.deviceType === 'Mobile' ? (
                        <Smartphone className="size-6 text-[#5367ff]" />
                      ) : session.deviceType === 'Tablet' ? (
                        <Tablet className="size-6 text-[#f59e0b]" />
                      ) : (
                        <Monitor className="size-6 text-[#6b7280]" />
                      )}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#1a1a2e] flex items-center gap-2">
                        <span>{getOsIcon(session.os)}</span>
                        {session.os}
                      </h3>
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                          <Globe className="size-3 shrink-0" />
                          <span>{session.browser}</span>
                          {session.ipAddress && (
                            <>
                              <span className="text-[#d1d5db]">·</span>
                              <span>{session.ipAddress.split(',')[0].trim()}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                          <MapPin className="size-3 shrink-0 text-[#5367ff]" />
                          <span>{session.location && session.location !== 'Unknown Location' ? session.location : 'Detecting...'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                          <Clock className="size-3 shrink-0" />
                          <span>{formatRelativeTime(session.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loggingOutSessionId === session.id}
                      onClick={() => handleLogoutSession(session.id)}
                      className="text-xs font-semibold text-[#EB5B3C] border-[#eb5b3c]/20 hover:bg-[#EB5B3C]/5 hover:text-[#EB5B3C] shrink-0 gap-1.5"
                    >
                      {loggingOutSessionId === session.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LogOut className="size-3.5" />
                      )}
                      <span className="hidden sm:inline">Logout</span>
                    </Button>
                  </div>

                  {/* Expandable Details */}
                  <div className="mt-3 pt-3 border-t border-[#e8eaf0]/50">
                    <button
                      onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#5367ff] hover:text-[#4356e0] transition-colors"
                    >
                      {expandedSession === session.id ? 'Hide' : 'View'} Details
                      <ChevronRight className={cn(
                        "size-3 transition-transform",
                        expandedSession === session.id && "rotate-90"
                      )} />
                    </button>
                    {expandedSession === session.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 space-y-2"
                      >
                        <DetailRow icon={Fingerprint} label="Session ID" value={session.id.slice(0, 16) + '...'} />
                        <DetailRow icon={KeyRound} label="Browser" value={session.browser} />
                        <DetailRow icon={Monitor} label="Device Type" value={session.deviceType} />
                        <DetailRow icon={Globe} label="IP Address" value={session.ipAddress?.split(',')[0].trim() || 'N/A'} />
                        <DetailRow icon={MapPin} label="Location" value={session.location || 'Unknown'} />
                        <DetailRow icon={Clock} label="Login Time" value={formatFullDate(session.createdAt)} />
                        <DetailRow icon={Shield} label="Session Expires" value={formatExpiry(session.expiresAt)} />
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loggingOutSessionId === session.id}
                            onClick={() => handleLogoutSession(session.id)}
                            className="w-full text-xs font-semibold text-[#EB5B3C] border-[#eb5b3c]/20 hover:bg-[#EB5B3C]/5"
                          >
                            {loggingOutSessionId === session.id ? (
                              <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Logging out...</>
                            ) : (
                              <><LogOut className="size-3.5 mr-1.5" />Logout from this device</>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* ── No Other Devices ──────────────────────────────── */}
          {!sessionsLoading && otherSessions.length === 0 && currentSession && (
            <motion.div custom={si++} variants={fadeInUp} initial="hidden" animate="visible">
              <div className="bg-white border border-[#e8eaf0] rounded-2xl p-8 text-center">
                <div className="size-14 rounded-full bg-[#e6faf4] flex items-center justify-center mx-auto mb-3">
                  <Shield className="size-7 text-[#00D09C]" />
                </div>
                <p className="text-sm font-semibold text-[#1a1a2e]">Only this device is active</p>
                <p className="text-xs text-[#9ca3af] mt-1">
                  No other devices are logged into your account. Your account is secure.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Logout All Confirmation Dialog ──────────────────── */}
      <Dialog open={logoutAllConfirmOpen} onOpenChange={setLogoutAllConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a1a2e]">
              <AlertTriangle className="size-5 text-[#EB5B3C]" />
              Logout All Devices?
            </DialogTitle>
            <DialogDescription className="text-[#6b7280]">
              This will logout all devices except your current one. You&apos;ll need to login again on those devices.
              <span className="block mt-1 font-medium text-[#1a1a2e]">{otherSessions.length} device{otherSessions.length !== 1 ? 's' : ''} will be logged out.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setLogoutAllConfirmOpen(false)}
              className="border-[#e8eaf0]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogoutAll}
              disabled={logoutAllSubmitting}
              className="bg-[#EB5B3C] hover:bg-[#d94f33] text-white gap-1.5"
            >
              {logoutAllSubmitting ? (
                <><Loader2 className="size-4 animate-spin" />Logging out...</>
              ) : (
                <><LogOut className="size-4" />Logout All</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Detail Row Component ────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-[#f7f8fc]">
      <Icon className="size-3.5 text-[#9ca3af] shrink-0" />
      <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider min-w-[90px]">{label}</span>
      <span className="text-xs font-medium text-[#1a1a2e] truncate">{value}</span>
    </div>
  )
}
