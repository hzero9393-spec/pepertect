'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInitials, formatINR, formatNumber } from '@/lib/utils';
import { User, Mail, Phone, Calendar, Shield, Wallet } from 'lucide-react';
import type { User as UserType } from '@/types';

export function ProfilePage() {
  const { user, token, login } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (data.success) {
        login({ ...user!, name }, token!);
        setMessage('Profile updated successfully');
      }
    } catch { setMessage('Failed to update profile'); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-brand-primary text-xl text-white">
                {getInitials(user?.name || user?.email || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h2 className="font-heading text-xl font-bold text-text-primary">{user?.name || 'User'}</h2>
              <p className="text-sm text-text-secondary">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                <Badge className={user?.tier === 'PREMIUM' ? 'bg-accent-gold/20 text-accent-gold' : 'bg-bg-surface-alt text-text-secondary'}>
                  {user?.tier} Plan
                </Badge>
                <Badge className="bg-bg-surface-alt text-text-secondary">{user?.role}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-default bg-bg-surface p-4 flex items-center gap-3">
          <Wallet className="h-5 w-5 text-brand-primary" />
          <div>
            <p className="text-xs text-text-secondary">Virtual Capital</p>
            <p className="font-mono text-sm font-bold text-text-primary">{formatINR(user?.virtualCapital ?? 0)}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-brand-primary" />
          <div>
            <p className="text-xs text-text-secondary">Member Since</p>
            <p className="text-sm font-medium text-text-primary">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-profit-green" />
          <div>
            <p className="text-xs text-text-secondary">Account Status</p>
            <p className="text-sm font-medium text-profit-green">Active</p>
          </div>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4 flex items-center gap-3">
          <User className="h-5 w-5 text-brand-primary" />
          <div>
            <p className="text-xs text-text-secondary">Role</p>
            <p className="text-sm font-medium text-text-primary">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
            <Input value={user?.email || ''} disabled className="bg-bg-surface-alt" />
            <p className="text-[10px] text-text-secondary">Email cannot be changed</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-brand-primary hover:bg-brand-primary-hover text-white">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          {message && <p className={`text-sm ${message.includes('success') ? 'text-profit-green' : 'text-loss-red'}`}>{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
