'use client'

import { useState, useRef } from 'react'
import {
  User,
  Bell,
  Shield,
  TrendingUp,
  Megaphone,
  Camera,
  Save,
  Lock,
  Smartphone,
  Monitor,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface NotificationSetting {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  iconBg: string
}

interface SessionInfo {
  id: string
  device: string
  location: string
  time: string
  icon: React.ReactNode
  isActive: boolean
}

function QuickAccessCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 spring-interaction group bg-[#111827] border-[#1f2937]"
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6 flex items-start gap-4">
        <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors duration-200">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm sm:text-base">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileCard() {
  return (
    <Card className="h-fit bg-[#111827] border-[#1f2937]">
      <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <Avatar className="size-20 sm:size-24">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Alex Thompson" />
            <AvatarFallback className="text-xl sm:text-2xl font-bold bg-amber-500/10 text-amber-500">
              AT
            </AvatarFallback>
          </Avatar>
          <button className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-amber-500 text-black shadow-md hover:bg-amber-400 transition-colors">
            <Camera className="size-4" />
          </button>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white">Alex Thompson</h2>
        <p className="text-sm text-gray-400 mt-0.5">Senior Portfolio Manager</p>

        <Separator className="my-4 bg-[#1f2937]" />

        <div className="w-full space-y-3 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-400">Member Since</span>
            <span className="text-xs sm:text-sm font-medium text-white">Jan 2022</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-400">Account Type</span>
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs">
              Premium
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-400">Verification</span>
            <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0 text-xs">
              Verified
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PersonalInfoForm() {
  return (
    <Card className="bg-[#111827] border-[#1f2937]">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg text-white">Personal Information</CardTitle>
        <CardDescription className="text-gray-400">Update your personal details and contact information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-400">Full Name</Label>
            <Input id="fullName" defaultValue="Alex Thompson" placeholder="Enter your full name" className="bg-[#0a0e17] border-[#1f2937] text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-400">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue="alex.thompson@pepertect.com"
              placeholder="Enter your email"
              className="bg-[#0a0e17] border-[#1f2937] text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-400">Phone</Label>
            <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" placeholder="Enter your phone" className="bg-[#0a0e17] border-[#1f2937] text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country" className="text-gray-400">Country</Label>
            <Select defaultValue="us">
              <SelectTrigger className="w-full bg-[#0a0e17] border-[#1f2937] text-white">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-[#1f2937]">
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="de">Germany</SelectItem>
                <SelectItem value="fr">France</SelectItem>
                <SelectItem value="jp">Japan</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="sg">Singapore</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button className="bg-amber-500 hover:bg-amber-400 text-black gap-2">
            <Save className="size-4" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function NotificationItem({
  setting,
  onToggle,
}: {
  setting: NotificationSetting
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-[#1a2332] transition-colors">
      <div
        className={`flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl ${setting.iconBg}`}
      >
        {setting.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm sm:text-base font-medium text-white">{setting.title}</h4>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5 line-clamp-1">
          {setting.description}
        </p>
      </div>
      <Switch checked={setting.enabled} onCheckedChange={() => onToggle(setting.id)} />
    </div>
  )
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'trade',
      icon: <TrendingUp className="size-5 text-amber-500" />,
      title: 'Trade Executions',
      description: 'Get notified when your trades are executed and filled.',
      enabled: true,
      iconBg: 'bg-amber-500/10',
    },
    {
      id: 'price',
      icon: <Bell className="size-5 text-emerald-400" />,
      title: 'Price Alerts',
      description: 'Receive alerts when assets hit your target prices.',
      enabled: true,
      iconBg: 'bg-emerald-500/10',
    },
    {
      id: 'security',
      icon: <Shield className="size-5 text-amber-500" />,
      title: 'Security Notifications',
      description: 'Important alerts about account security and login activity.',
      enabled: true,
      iconBg: 'bg-amber-500/10',
    },
    {
      id: 'marketing',
      icon: <Megaphone className="size-5 text-gray-400" />,
      title: 'Marketing & Insights',
      description: 'Weekly market insights, tips, and promotional offers.',
      enabled: false,
      iconBg: 'bg-[#1f2937]',
    },
  ])

  const handleToggle = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    )
  }

  return (
    <Card className="bg-[#111827] border-[#1f2937]">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg text-white">Notification Preferences</CardTitle>
        <CardDescription className="text-gray-400">Choose what notifications you want to receive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {notifications.map((setting) => (
          <NotificationItem key={setting.id} setting={setting} onToggle={handleToggle} />
        ))}
      </CardContent>
    </Card>
  )
}

function PasswordInput({
  id,
  label,
  placeholder,
}: {
  id: string
  label: string
  placeholder: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-400">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          className="pr-10 bg-[#0a0e17] border-[#1f2937] text-white"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function SessionCard({ session, onLogout }: { session: SessionInfo; onLogout: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-[#1f2937] hover:bg-[#1a2332] transition-colors">
      <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2937]">
        {session.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm sm:text-base font-medium text-white truncate">
            {session.device}
          </h4>
          {session.isActive && (
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0 text-[10px] px-1.5 py-0">
              Active Now
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
          {session.location} · {session.time}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-red-400 shrink-0"
        onClick={() => onLogout(session.id)}
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline ml-1">Logout</span>
      </Button>
    </div>
  )
}

function SecuritySettings() {
  const [sessions, setSessions] = useState<SessionInfo[]>([
    {
      id: 'mac',
      device: 'Mac OS · Chrome',
      location: 'San Francisco, US',
      time: 'Active Now',
      icon: <Monitor className="size-5 text-amber-500" />,
      isActive: true,
    },
    {
      id: 'iphone',
      device: 'iPhone 15 · Safari',
      location: 'San Francisco, US',
      time: '2 hours ago',
      icon: <Smartphone className="size-5 text-gray-400" />,
      isActive: false,
    },
    {
      id: 'windows',
      device: 'Windows 11 · Edge',
      location: 'New York, US',
      time: '3 days ago',
      icon: <Monitor className="size-5 text-gray-400" />,
      isActive: false,
    },
  ])

  const handleLogout = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-white">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-gray-400">Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <ShieldCheck className="size-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-medium text-white">Status</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0 text-xs">Enabled</Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Your account is protected with 2FA</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/5 shrink-0 w-fit">
              <ExternalLink className="size-3.5" />
              Manage 2FA
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#111827] border-[#1f2937]">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-white">Change Password</CardTitle>
          <CardDescription className="text-gray-400">Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordInput id="currentPassword" label="Current Password" placeholder="Enter current password" />
          <PasswordInput id="newPassword" label="New Password" placeholder="Enter new password" />
          <PasswordInput id="confirmPassword" label="Confirm New Password" placeholder="Confirm new password" />
          <div className="flex justify-end pt-2">
            <Button className="bg-amber-500 hover:bg-amber-400 text-black gap-2">
              <Lock className="size-4" />
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#111827] border-[#1f2937]">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-white">Active Sessions</CardTitle>
          <CardDescription className="text-gray-400">Manage your active sessions and logout from other devices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionCard key={session.id} session={session} onLogout={handleLogout} />
            ))
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">No active sessions found.</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-500/30 bg-[#111827]">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-red-400">Danger Zone</CardTitle>
          <CardDescription className="text-gray-400">
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10">
                <Trash2 className="size-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-medium text-red-400">Delete Account</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                  Once you delete your account, there is no going back.
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" className="gap-2 bg-red-500 hover:bg-red-600 shrink-0 w-fit">
              <Trash2 className="size-3.5" />
              Close Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('personal')
  const personalRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const securityRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (tab: string) => {
    setActiveTab(tab)
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      personal: personalRef,
      notifications: notificationsRef,
      security: securityRef,
    }
    const ref = refMap[tab]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <QuickAccessCard
            icon={<User className="size-5 sm:size-6" />}
            title="Personal Info"
            description="Update your profile and contact details"
            onClick={() => scrollToSection('personal')}
          />
          <QuickAccessCard
            icon={<Bell className="size-5 sm:size-6" />}
            title="Notifications"
            description="Configure your notification preferences"
            onClick={() => scrollToSection('notifications')}
          />
          <QuickAccessCard
            icon={<Shield className="size-5 sm:size-6" />}
            title="Security"
            description="Manage password and 2FA settings"
            onClick={() => scrollToSection('security')}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-fit mb-6 bg-[#111827]">
            <TabsTrigger value="personal" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <User className="size-3.5 sm:size-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Bell className="size-3.5 sm:size-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Shield className="size-3.5 sm:size-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" ref={personalRef}>
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6">
              <ProfileCard />
              <PersonalInfoForm />
            </div>
          </TabsContent>

          <TabsContent value="notifications" ref={notificationsRef}>
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security" ref={securityRef}>
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
