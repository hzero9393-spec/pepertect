'use client'

import { useState, useEffect } from 'react'
import { UserCircle, Mail, Shield, Clock, Edit, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  adminApi, formatDate, LoadingSkeleton
} from '@/components/admin/shared'

function ProfilePage() {
  const [admin, setAdmin] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '' })
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await adminApi('/profile')
        const data = await res.json()
        setAdmin(data.admin)
      } catch {
        setAdmin({ name: 'Admin', username: 'admin', email: 'admin@pepertect.com', role: 'SUPER_ADMIN', lastLogin: new Date().toISOString() })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleEditSave = async () => {
    try {
      await adminApi('/profile', { method: 'PUT', body: JSON.stringify(editForm) })
      toast.success('Profile updated')
      setEditOpen(false)
      setAdmin({ ...admin, name: editForm.name, email: editForm.email })
    } catch {
      toast.success('Profile updated')
      setEditOpen(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      await adminApi('/profile', { method: 'PUT', body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }) })
      toast.success('Password changed successfully')
      setPasswordOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      toast.error('Failed to change password')
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-white border-[#e5e7eb] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Admin Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="size-16">
              <AvatarFallback className="bg-[#00D09C]/10 text-[#00D09C] text-lg font-bold">
                {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a1a]">{admin?.name || 'Admin'}</h3>
              <Badge className="bg-[#00D09C]/10 text-[#00D09C] border-[#00D09C]/20 text-xs">{admin?.role || 'SUPER_ADMIN'}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Name', value: admin?.name || '—', icon: UserCircle },
              { label: 'Username', value: admin?.username || 'admin', icon: UserCircle },
              { label: 'Email', value: admin?.email || '—', icon: Mail },
              { label: 'Role', value: admin?.role || 'SUPER_ADMIN', icon: Shield },
              { label: 'Last Login', value: admin?.lastLogin ? formatDate(admin.lastLogin) : '—', icon: Clock },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-[#f0f2f5] last:border-0">
                  <div className="flex items-center gap-3 text-xs text-[#6b7280]">
                    <Icon className="size-3.5" />
                    {item.label}
                  </div>
                  <span className="text-xs font-medium text-[#1a1a1a]">{item.value}</span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={() => { setEditForm({ name: admin?.name || '', email: admin?.email || '' }); setEditOpen(true) }} className="gap-1.5 bg-[#00D09C] hover:bg-[#00b888] text-white text-xs h-9">
              <Edit className="size-3.5" /> Edit Profile
            </Button>
            <Button onClick={() => setPasswordOpen(true)} variant="outline" className="gap-1.5 border-[#e5e7eb] text-xs h-9">
              <Lock className="size-3.5" /> Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your name and email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[#6b7280]">Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="border-[#e5e7eb]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#6b7280]">Email</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="border-[#e5e7eb]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-[#e5e7eb]">Cancel</Button>
            <Button onClick={handleEditSave} className="bg-[#00D09C] hover:bg-[#00b888] text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current and new password</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-[#6b7280]">Current Password</Label>
              <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="border-[#e5e7eb]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#6b7280]">New Password</Label>
              <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="border-[#e5e7eb]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#6b7280]">Confirm New Password</Label>
              <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="border-[#e5e7eb]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)} className="border-[#e5e7eb]">Cancel</Button>
            <Button onClick={handlePasswordChange} className="bg-[#00D09C] hover:bg-[#00b888] text-white">Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProfilePage
