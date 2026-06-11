'use client'

import { Menu, Search, Bell, LogOut, User, FileBarChart, Settings, TrendingUp, Star, Zap, WifiOff } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMarketDataStatus } from '@/hooks/use-market-data'
import { cn } from '@/lib/utils'

interface TopBarProps {
  userName?: string | null
  onLogout?: () => void
  userAvatar?: string | null
}

export function TopBar({ userName, onLogout, userAvatar }: TopBarProps) {
  const { setSidebarOpen, setCurrentPage, watchlistSidebarOpen, setWatchlistSidebarOpen } = useAppStore()
  const { user } = useAuthStore()
  const avatar = userAvatar || user?.avatar
  const wsStatus = useMarketDataStatus()
  const isWsConnected = wsStatus === 'connected'

  return (
    <header
      className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e8ecf0',
      }}
      role="banner"
    >
      <div className="flex h-full w-full items-center gap-3 px-4 md:px-6">
        {/* Left: Mobile menu + Logo */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0 text-[#4b5563] hover:text-[#111827] hover:bg-[#f4f6f8] h-9 w-9 rounded-xl"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>

        {/* Logo - Mobile only (desktop has sidebar) */}
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="flex items-center gap-2.5 shrink-0 md:hidden"
        >
          <div
            className="flex size-8 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #00D09C 0%, #00A67E 100%)',
              boxShadow: '0 2px 8px rgba(0, 208, 156, 0.25)',
            }}
          >
            <TrendingUp className="size-4 text-white" />
          </div>
          <span className="text-base font-bold" style={{ color: '#111827' }}>
            Pepertect
          </span>
        </button>

        {/* Desktop: Page title area */}
        <div className="hidden md:flex items-center">
          <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>
            Paper Trading Platform
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden md:flex max-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            type="search"
            placeholder="Search stocks, indices..."
            className="pl-9 h-9 text-sm border-none focus-visible:ring-1 focus-visible:ring-[#00D09C]/30 placeholder:text-[#9ca3af]"
            style={{
              background: '#f4f6f8',
              color: '#111827',
              borderRadius: '10px',
            }}
          />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1.5">
          {/* WebSocket Connection Status */}
          <div 
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all',
              isWsConnected 
                ? 'text-[#00D09C] bg-[#00D09C]/8' 
                : 'text-[#9ca3af] bg-[#f4f6f8]'
            )}
            title={isWsConnected ? 'Real-time WebSocket connected' : 'WebSocket disconnected — using REST polling'}
          >
            {isWsConnected ? (
              <>
                <Zap className="size-3" />
                <span className="hidden sm:inline">LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="size-3" />
                <span className="hidden sm:inline">REST</span>
              </>
            )}
          </div>

          {/* Watchlist Toggle - Desktop only */}
          <Button
            variant="ghost"
            size="icon"
            className={`relative hidden md:flex shrink-0 h-9 w-9 rounded-xl transition-all duration-200 ${
              watchlistSidebarOpen
                ? 'text-[#00D09C] bg-[#00D09C]/10 hover:bg-[#00D09C]/15'
                : 'text-[#9ca3af] hover:text-[#00D09C] hover:bg-[#f4f6f8]'
            }`}
            onClick={() => setWatchlistSidebarOpen(!watchlistSidebarOpen)}
            aria-label="Toggle watchlist sidebar"
            title="Watchlist"
          >
            <Star className={`size-[18px] ${watchlistSidebarOpen ? 'fill-[#00D09C]' : ''}`} />
          </Button>

          {/* Notification */}
          <Button
            variant="ghost"
            size="icon"
            className="relative shrink-0 text-[#9ca3af] hover:text-[#111827] hover:bg-[#f4f6f8] h-9 w-9 rounded-xl"
            aria-label="Notifications"
          >
            <Bell className="size-[18px]" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-200 hover:bg-[#f4f6f8] outline-none focus-visible:ring-2 focus-visible:ring-[#00D09C]/20"
                aria-label="User menu"
              >
                <div
                  className="size-8 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ background: avatar ? 'transparent' : '#f4f6f8' }}
                >
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <User className="size-4 text-[#6b7280]" />
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-medium" style={{ color: '#374151' }}>
                  {userName || 'User'}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56"
              style={{
                background: '#ffffff',
                border: '1px solid #e8ecf0',
                color: '#111827',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                borderRadius: '12px',
              }}
            >
              <DropdownMenuLabel>
                <div className="flex flex-col py-1">
                  <span className="font-semibold text-sm" style={{ color: '#111827' }}>
                    {userName || 'User'}
                  </span>
                  <span className="text-[11px]" style={{ color: '#9ca3af' }}>
                    Paper Trading Account
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ background: '#e8ecf0' }} />
              <DropdownMenuItem
                onClick={() => setCurrentPage('profile')}
                className="cursor-pointer text-sm py-2.5 text-[#4b5563] focus:text-[#111827] focus:bg-[#f4f6f8] rounded-lg"
              >
                <Settings className="size-4 mr-2.5 text-[#9ca3af]" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setCurrentPage('reports')}
                className="cursor-pointer text-sm py-2.5 text-[#4b5563] focus:text-[#111827] focus:bg-[#f4f6f8] rounded-lg"
              >
                <FileBarChart className="size-4 mr-2.5 text-[#9ca3af]" />
                Reports
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: '#e8ecf0' }} />
              <DropdownMenuItem
                onClick={onLogout}
                className="cursor-pointer text-sm py-2.5 text-[#ef4444] focus:text-[#ef4444] focus:bg-red-50/80 rounded-lg"
              >
                <LogOut className="size-4 mr-2.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
