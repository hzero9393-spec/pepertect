'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, X, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ConfigStatus {
  configured: boolean
  clientId: string
  source: string
}

export function GoogleOAuthSetup() {
  const [clientId, setClientId] = useState('')
  const [currentConfig, setCurrentConfig] = useState<ConfigStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/settings/google-oauth')
      if (res.ok) {
        const data = await res.json()
        setCurrentConfig(data)
      }
    } catch {}
  }

  const handleSave = async () => {
    if (!clientId.trim()) return
    setIsLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings/google-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: 'Google Client ID saved! Google Sign-In is now active.' })
        setClientId('')
        toast.success('Google Client ID configured successfully')
        // Refresh config
        await fetchConfig()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
      toast.error('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/settings/google-oauth', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Google Client ID removed')
        setCurrentConfig(null)
        await fetchConfig()
      } else {
        toast.error('Failed to remove settings')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="bg-[#111827] border-[#1f2937]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
              Google Sign-In Setup
              {currentConfig?.configured && (
                <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0 text-[10px] px-1.5 py-0">
                  <Check className="size-3 mr-0.5" /> Active
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure Google OAuth to enable &quot;Sign in with Google&quot; for your users.
            </CardDescription>
          </div>
          {currentConfig?.configured && currentConfig.source === 'database' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-400 shrink-0"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentConfig?.configured && (
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
              <Check className="size-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                Google Sign-In is active
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Source: <span className="text-emerald-400 font-medium">{currentConfig.source}</span> &middot; Client ID: <span className="font-mono text-gray-300">{currentConfig.clientId}</span>
              </p>
            </div>
          </div>
        )}

        {!currentConfig?.configured && (
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
              <X className="size-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                Google Sign-In is not configured
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Add your Client ID below to enable Google Sign-In for your users.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="google-client-id" className="text-gray-400">Google Client ID</Label>
            <Input
              id="google-client-id"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
              className="bg-[#0a0e17] border-[#1f2937] text-white font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Get this from Google Cloud Console &rarr; APIs &amp; Services &rarr; Credentials
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!clientId.trim() || isLoading}
            className="bg-amber-500 hover:bg-amber-400 text-black gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Client ID'
            )}
          </Button>
        </div>

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/5 border border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <Check className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <Separator className="bg-[#1f2937]" />

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Setup Instructions</h4>
          <ol className="text-xs text-gray-400 space-y-2">
            <li className="flex gap-2">
              <span className="font-medium text-amber-500 shrink-0">1.</span>
              Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="size-3" /></a>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-amber-500 shrink-0">2.</span>
              Create a new project (or select existing)
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-amber-500 shrink-0">3.</span>
              Go to APIs &amp; Services &rarr; Credentials
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-amber-500 shrink-0">4.</span>
              Click &quot;Create Credentials&quot; &rarr; &quot;OAuth client ID&quot;
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-amber-500 shrink-0">5.</span>
              Application type: &quot;Web application&quot;
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-amber-500 shrink-0">6.</span>
              Add authorized JavaScript origins: your domain (e.g., https://pepertect.vercel.app)
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-amber-500 shrink-0">7.</span>
              Copy the Client ID and paste it above
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
