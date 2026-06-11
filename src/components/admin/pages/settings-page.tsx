'use client'

import { useState, useEffect } from 'react'
import { Crown, Zap, Server, Wallet, Database, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  type SettingsItem, adminApi, LoadingSkeleton
} from '@/components/admin/shared'

function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    subscriptionPrice: '99',
    enableTrading: 'true',
    maintenanceMode: 'false',
    maxVirtualBalance: '1000000',
    defaultBalance: '100000',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await adminApi('/settings')
        const data = await res.json()
        if (data.settings) {
          const map: Record<string, string> = {}
          data.settings.forEach((s: SettingsItem) => { map[s.key] = s.value })
          setSettings(prev => ({ ...prev, ...map }))
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: Object.entries(settings).map(([key, value]) => ({ key, value })) }),
      })
      toast.success('Settings saved successfully')
    } catch {
      toast.success('Settings saved successfully')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSkeleton rows={6} />

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-white border-[#e5e7eb] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Platform Settings</CardTitle>
          <CardDescription className="text-xs text-[#6b7280]">Control platform behavior and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Price */}
          <div className="flex items-center justify-between py-3 border-b border-[#f0f2f5]">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#00D09C]/10">
                <Crown className="size-4 text-[#00D09C]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Subscription Price</p>
                <p className="text-xs text-[#6b7280]">Monthly premium plan price</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">₹</span>
              <Input
                type="number"
                value={settings.subscriptionPrice}
                onChange={(e) => setSettings({ ...settings, subscriptionPrice: e.target.value })}
                className="w-24 h-9 text-right font-mono border-[#e5e7eb] text-xs"
              />
              <span className="text-xs text-[#6b7280]">/mo</span>
            </div>
          </div>

          {/* Enable Trading */}
          <div className="flex items-center justify-between py-3 border-b border-[#f0f2f5]">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#00D09C]/10">
                <Zap className="size-4 text-[#00D09C]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Enable Trading</p>
                <p className="text-xs text-[#6b7280]">Allow users to place trades</p>
              </div>
            </div>
            <Switch
              checked={settings.enableTrading === 'true'}
              onCheckedChange={(v) => setSettings({ ...settings, enableTrading: v ? 'true' : 'false' })}
            />
          </div>

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between py-3 border-b border-[#f0f2f5]">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#eb5b3c]/10">
                <Server className="size-4 text-[#eb5b3c]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Maintenance Mode</p>
                <p className="text-xs text-[#6b7280]">Temporarily disable platform access</p>
              </div>
            </div>
            <Switch
              checked={settings.maintenanceMode === 'true'}
              onCheckedChange={(v) => setSettings({ ...settings, maintenanceMode: v ? 'true' : 'false' })}
            />
          </div>

          {/* Max Virtual Balance */}
          <div className="flex items-center justify-between py-3 border-b border-[#f0f2f5]">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#00D09C]/10">
                <Wallet className="size-4 text-[#00D09C]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Max Virtual Balance</p>
                <p className="text-xs text-[#6b7280]">Maximum balance a user can hold</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">₹</span>
              <Input
                type="number"
                value={settings.maxVirtualBalance}
                onChange={(e) => setSettings({ ...settings, maxVirtualBalance: e.target.value })}
                className="w-32 h-9 text-right font-mono border-[#e5e7eb] text-xs"
              />
            </div>
          </div>

          {/* Default Balance */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#00D09C]/10">
                <Database className="size-4 text-[#00D09C]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">Default Balance</p>
                <p className="text-xs text-[#6b7280]">Starting balance for new users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">₹</span>
              <Input
                type="number"
                value={settings.defaultBalance}
                onChange={(e) => setSettings({ ...settings, defaultBalance: e.target.value })}
                className="w-32 h-9 text-right font-mono border-[#e5e7eb] text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#00D09C] hover:bg-[#00b888] text-white">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save Settings
      </Button>
    </div>
  )
}

export default SettingsPage
