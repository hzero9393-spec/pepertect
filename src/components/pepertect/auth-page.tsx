'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, BarChart3, Shield, Zap } from 'lucide-react'

// Google SVG icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
import { motion, AnimatePresence } from 'framer-motion'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const [googleChecked, setGoogleChecked] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const gisScriptLoaded = useRef(false)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { setAuth } = useAuthStore()

  // Check for OAuth error from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('auth_error')
    const authDetails = params.get('details')
    if (authError) {
      const errorMessages: Record<string, string> = {
        google_denied: 'Google sign-in was cancelled.',
        no_code: 'Google authentication failed. Please try again.',
        google_not_configured: 'Google Sign-In is not configured yet. Please use email/password to sign in.',
        token_exchange_failed: 'Failed to authenticate with Google. Please try again.',
        user_info_failed: 'Failed to get your Google profile. Please try again.',
        account_deactivated: 'Your account has been deactivated. Please contact support.',
        oauth_callback_failed: 'Something went wrong during Google sign-in. Please try again.',
        db_query_failed: 'Database connection error. Please try again later.',
        session_create_failed: 'Failed to create session. Please try again.',
        token_generation_failed: 'Authentication token error. Please try again.',
      }
      let msg = errorMessages[authError] || 'Authentication failed. Please try again.'
      // Append debug details if available (helps with troubleshooting)
      if (authDetails) {
        msg += ` (${authDetails})`
      }
      setError(msg)
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Handle Google GIS credential response
  const handleCredentialResponse = useCallback(async (response: CredentialResponse) => {
    try {
      setGoogleLoading(true)
      setError('')
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Google sign-in failed')
        return
      }
      setAuth(data.user, data.token)
    } catch {
      setError('Network error during Google sign-in. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }, [setAuth])

  // Load Google Identity Services script
  useEffect(() => {
    if (!googleClientId || gisScriptLoaded.current) return

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      gisScriptLoaded.current = true
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
    gisScriptLoaded.current = true
  }, [googleClientId])

  // Initialize Google GIS when script loads and client ID is available
  useEffect(() => {
    if (!googleClientId || !gisScriptLoaded.current) return

    const initGIS = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          cancel_on_tap_outside: true,
          context: 'signin',
        })
      }
    }

    // Try immediately, or wait for script to load
    if (window.google?.accounts?.id) {
      initGIS()
    } else {
      // Wait for the GIS script to load
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval)
          initGIS()
        }
      }, 100)
      // Cleanup after 10s if script doesn't load
      const timeout = setTimeout(() => clearInterval(checkInterval), 10000)
      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
  }, [googleClientId, handleCredentialResponse])

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(res => res.json())
      .then(data => {
        setGoogleAvailable(data.configured)
        setGoogleClientId(data.clientId || '')
        setGoogleChecked(true)
      })
      .catch(() => {
        setGoogleAvailable(false)
        setGoogleChecked(true)
      })
  }, [])

  const handleGoogleSignIn = () => {
    // If Google OAuth is not configured, show error
    if (!googleAvailable) {
      setError('Google Sign-In is not configured. Please use email/password to sign in.')
      return
    }
    // Use Google Identity Services (GIS) popup flow
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      // Render button in hidden div, then trigger prompt
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: googleButtonRef.current.offsetWidth,
        })
        // Trigger the Google sign-in prompt
        const btn = googleButtonRef.current.querySelector('div[role="button"]') as HTMLElement
        if (btn) {
          btn.click()
          return
        }
      }
      // Fallback: use prompt
      window.google.accounts.id.prompt()
    } else {
      // Fallback: redirect to server-side OAuth
      window.location.href = '/api/auth/google'
    }
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    setShowPassword(false)
  }

  const switchMode = (newMode: AuthMode) => {
    resetForm()
    setMode(newMode)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      setAuth(data.user, data.token)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || undefined, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      setAuth(data.user, data.token)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (pwd: string): { level: number; color: string; label: string; textColor: string } => {
    if (pwd.length === 0) return { level: 0, color: '', label: '', textColor: '' }
    if (pwd.length < 4) return { level: 1, color: 'bg-[#eb5b3c]', label: 'Weak', textColor: 'text-[#eb5b3c]' }
    if (pwd.length < 6) return { level: 2, color: 'bg-[#eb5b3c]', label: 'Fair', textColor: 'text-[#eb5b3c]' }
    if (pwd.length < 8) return { level: 3, color: 'bg-[#f59e0b]', label: 'Good', textColor: 'text-[#f59e0b]' }
    if (pwd.length < 10) return { level: 4, color: 'bg-[#22c55e]', label: 'Strong', textColor: 'text-[#22c55e]' }
    return { level: 4, color: 'bg-[#22c55e]', label: 'Very Strong', textColor: 'text-[#22c55e]' }
  }

  const features = [
    {
      icon: BarChart3,
      title: 'Live Market Data',
      desc: 'NIFTY, BANKNIFTY, SENSEX with real-time option chain',
    },
    {
      icon: Shield,
      title: 'Zero Risk Practice',
      desc: 'Trade with ₹1,00,000 virtual money — learn without losing',
    },
    {
      icon: Zap,
      title: 'F&O Trading',
      desc: 'Practice futures & options with Indian market lot sizes',
    },
  ]

  const stats = [
    { value: '50+', label: 'NSE Stocks' },
    { value: '5', label: 'Indices' },
    { value: '₹1L', label: 'Virtual Cash' },
  ]

  return (
    <div className="min-h-screen flex bg-[#f7f8fc]">
      {/* Left Panel - Branding & Features (desktop only) */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-white">
        {/* Subtle blue gradient accent - top right */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle at top right, #00D09C 0%, transparent 65%)',
          }}
        />
        {/* Subtle blue gradient accent - bottom left */}
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-[0.05]"
          style={{
            background: 'radial-gradient(circle at bottom left, #00D09C 0%, transparent 65%)',
          }}
        />
        {/* Thin decorative line pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="auth-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#00D09C" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20 w-full">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3 mb-14"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#00D09C]/10">
              <TrendingUp className="size-6 text-[#00D09C]" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#1a1a1a]">Pepertect</h1>
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <h2 className="text-[38px] font-bold leading-[1.2] text-[#1a1a1a] mb-4">
              Master Indian Markets<br />
              <span className="text-[#00D09C]">Before You Invest</span>
            </h2>
            <p className="text-[#6b7280] text-[17px] leading-relaxed max-w-md">
              Practice trading with real market data. Build strategies, analyze options, and sharpen your skills — all risk-free.
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="space-y-5 mb-14">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="flex gap-4 items-start p-4 rounded-xl bg-[#f7f8fc] border border-[#e8eaf0]"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#00D09C]/10">
                  <feature.icon className="size-[18px] text-[#00D09C]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[#1a1a1a] mb-0.5">{feature.title}</h3>
                  <p className="text-[#6b7280] text-[13px] leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats Row */}
          <motion.div
            className="flex gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex-1 text-center py-4 px-3 rounded-xl bg-[#f7f8fc] border border-[#e8eaf0]"
              >
                <div className="text-[22px] font-bold text-[#00D09C]">{stat.value}</div>
                <div className="text-[#9ca3af] text-[12px] font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-10 bg-[#f7f8fc]">
        <motion.div
          className="w-full max-w-[420px]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#00D09C]/10">
              <TrendingUp className="size-5 text-[#00D09C]" />
            </div>
            <span className="text-xl font-bold text-[#1a1a1a]">Pepertect</span>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25 }}
              >
                {/* Login Card */}
                <div className="bg-white rounded-2xl border border-[#e8eaf0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-7 sm:p-8">
                  <div className="mb-7">
                    <h2 className="text-[22px] font-bold text-[#1a1a1a]">Welcome back</h2>
                    <p className="text-[#6b7280] text-[14px] mt-1">
                      Sign in to continue your trading journey
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    {/* Google Sign-In */}
                    {/* Hidden container for GIS rendered button */}
                    <div ref={googleButtonRef} className="hidden" aria-hidden="true" />

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="w-full h-[46px] text-[14px] font-medium rounded-lg bg-white text-[#374151] border border-[#e0e0e0] hover:bg-[#f8f9fa] hover:border-[#d0d0d0] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {googleLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="size-4 border-2 border-[#9ca3af]/30 border-t-[#9ca3af] rounded-full animate-spin" />
                          Connecting...
                        </div>
                      ) : (
                        <>
                          <GoogleIcon className="size-5" />
                          Continue with Google
                        </>
                      )}
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#e8eaf0]" />
                      <span className="text-[12px] text-[#9ca3af] font-medium">or</span>
                      <div className="flex-1 h-px bg-[#e8eaf0]" />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email" className="text-[#374151] text-[13px] font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-[46px] text-[#1a1a1a] placeholder:text-[#b0b5c0] bg-[#f0f2f5] border-[#e8eaf0] rounded-lg text-[14px] focus-visible:border-[#00D09C] focus-visible:ring-[#00D09C]/15 focus-visible:bg-white"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-[#374151] text-[13px] font-medium">
                          Password
                        </Label>
                        <button
                          type="button"
                          className="text-[12px] text-[#00D09C] hover:text-[#00b88a] font-medium transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-[46px] text-[#1a1a1a] placeholder:text-[#b0b5c0] bg-[#f0f2f5] border-[#e8eaf0] rounded-lg text-[14px] focus-visible:border-[#00D09C] focus-visible:ring-[#00D09C]/15 focus-visible:bg-white"
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-[#eb5b3c]/[0.07] border border-[#eb5b3c]/20 text-[#eb5b3c] text-[13px]"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-[46px] text-[15px] font-semibold rounded-lg bg-[#00D09C] text-white hover:bg-[#00b88a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,208,156,0.2)]"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          Sign In
                          <ArrowRight className="size-4" />
                        </div>
                      )}
                    </button>
                  </form>

                  {/* Switch to Signup */}
                  <div className="mt-7 text-center">
                    <p className="text-[#6b7280] text-[13px]">
                      Don&apos;t have an account?{' '}
                      <button
                        onClick={() => switchMode('signup')}
                        className="text-[#00D09C] font-semibold hover:text-[#00b88a] transition-colors"
                      >
                        Create Account
                      </button>
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
              >
                {/* Signup Card */}
                <div className="bg-white rounded-2xl border border-[#e8eaf0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-7 sm:p-8">
                  <div className="mb-7">
                    <h2 className="text-[22px] font-bold text-[#1a1a1a]">Create Account</h2>
                    <p className="text-[#6b7280] text-[14px] mt-1">
                      Start trading with ₹1,00,000 virtual cash
                    </p>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* Google Sign-In */}
                    {/* Hidden container for GIS rendered button */}
                    <div ref={googleButtonRef} className="hidden" aria-hidden="true" />

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading}
                      className="w-full h-[46px] text-[14px] font-medium rounded-lg bg-white text-[#374151] border border-[#e0e0e0] hover:bg-[#f8f9fa] hover:border-[#d0d0d0] transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {googleLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="size-4 border-2 border-[#9ca3af]/30 border-t-[#9ca3af] rounded-full animate-spin" />
                          Connecting...
                        </div>
                      ) : (
                        <>
                          <GoogleIcon className="size-5" />
                          Sign up with Google
                        </>
                      )}
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#e8eaf0]" />
                      <span className="text-[12px] text-[#9ca3af] font-medium">or</span>
                      <div className="flex-1 h-px bg-[#e8eaf0]" />
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name" className="text-[#374151] text-[13px] font-medium">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 h-[46px] text-[#1a1a1a] placeholder:text-[#b0b5c0] bg-[#f0f2f5] border-[#e8eaf0] rounded-lg text-[14px] focus-visible:border-[#00D09C] focus-visible:ring-[#00D09C]/15 focus-visible:bg-white"
                          required
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email" className="text-[#374151] text-[13px] font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-[46px] text-[#1a1a1a] placeholder:text-[#b0b5c0] bg-[#f0f2f5] border-[#e8eaf0] rounded-lg text-[14px] focus-visible:border-[#00D09C] focus-visible:ring-[#00D09C]/15 focus-visible:bg-white"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {/* Phone (optional) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-phone" className="text-[#374151] text-[13px] font-medium">
                        Phone Number <span className="text-[#9ca3af] font-normal">(optional)</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10 h-[46px] text-[#1a1a1a] placeholder:text-[#b0b5c0] bg-[#f0f2f5] border-[#e8eaf0] rounded-lg text-[14px] focus-visible:border-[#00D09C] focus-visible:ring-[#00D09C]/15 focus-visible:bg-white"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-[#374151] text-[13px] font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-[46px] text-[#1a1a1a] placeholder:text-[#b0b5c0] bg-[#f0f2f5] border-[#e8eaf0] rounded-lg text-[14px] focus-visible:border-[#00D09C] focus-visible:ring-[#00D09C]/15 focus-visible:bg-white"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {/* Password strength indicator */}
                      {password && (
                        <div className="mt-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map((level) => {
                              const strength = getPasswordStrength(password)
                              return (
                                <div
                                  key={level}
                                  className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                                    level <= strength.level ? strength.color : 'bg-[#e8eaf0]'
                                  }`}
                                />
                              )
                            })}
                          </div>
                          <p className={`text-[11px] mt-1 font-medium ${getPasswordStrength(password).textColor}`}>
                            {getPasswordStrength(password).label}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm" className="text-[#374151] text-[13px] font-medium">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
                        <Input
                          id="signup-confirm"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`pl-10 h-[46px] text-[#1a1a1a] placeholder:text-[#b0b5c0] rounded-lg text-[14px] focus-visible:ring-[#00D09C]/15 focus-visible:bg-white ${
                            confirmPassword && confirmPassword !== password
                              ? 'bg-[#f0f2f5] border-[#eb5b3c] focus-visible:border-[#eb5b3c] focus-visible:ring-[#eb5b3c]/15'
                              : 'bg-[#f0f2f5] border-[#e8eaf0] focus-visible:border-[#00D09C]'
                          }`}
                          required
                          autoComplete="new-password"
                        />
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-[#eb5b3c] text-[11px] mt-1 font-medium">Passwords do not match</p>
                      )}
                      {confirmPassword && confirmPassword === password && confirmPassword.length > 0 && (
                        <p className="text-[#22c55e] text-[11px] mt-1 font-medium">Passwords match</p>
                      )}
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-2.5 pt-0.5">
                      <input
                        type="checkbox"
                        id="terms"
                        required
                        className="mt-[3px] size-3.5 rounded border-[#d1d5db] accent-[#00D09C] cursor-pointer"
                      />
                      <label htmlFor="terms" className="text-[12px] text-[#6b7280] leading-relaxed cursor-pointer">
                        I agree to the{' '}
                        <span className="text-[#00D09C] hover:underline cursor-pointer font-medium">Terms of Service</span>{' '}
                        and{' '}
                        <span className="text-[#00D09C] hover:underline cursor-pointer font-medium">Privacy Policy</span>
                      </label>
                    </div>

                    {/* Error */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-[#eb5b3c]/[0.07] border border-[#eb5b3c]/20 text-[#eb5b3c] text-[13px]"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Success */}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-[#22c55e]/[0.07] border border-[#22c55e]/20 text-[#22c55e] text-[13px]"
                      >
                        {success}
                      </motion.div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isLoading || (confirmPassword !== '' && confirmPassword !== password)}
                      className="w-full h-[46px] text-[15px] font-semibold rounded-lg bg-[#00D09C] text-white hover:bg-[#00b88a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,208,156,0.2)]"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating Account...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          Create Account
                          <ArrowRight className="size-4" />
                        </div>
                      )}
                    </button>
                  </form>

                  {/* Switch to Login */}
                  <div className="mt-6 text-center">
                    <p className="text-[#6b7280] text-[13px]">
                      Already have an account?{' '}
                      <button
                        onClick={() => switchMode('login')}
                        className="text-[#00D09C] font-semibold hover:text-[#00b88a] transition-colors"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom info */}
          <div className="mt-6">
            <div className="flex items-center justify-center gap-3 text-[11px] text-[#9ca3af] font-medium">
              <span>Secure</span>
              <span className="text-[#d1d5db]">•</span>
              <span>Made in India</span>
              <span className="text-[#d1d5db]">•</span>
              <span>₹0 Cost</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
