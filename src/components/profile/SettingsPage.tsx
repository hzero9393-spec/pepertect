'use client';

import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/useAuthStore';
import { Sun, Moon, Shield, LogOut, Trash2, Bell } from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Theme</p>
              <p className="text-xs text-text-secondary">Switch between light and dark mode</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className={theme === 'light' ? 'bg-brand-primary text-white' : ''}
              >
                <Sun className="mr-1 h-3 w-3" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className={theme === 'dark' ? 'bg-brand-primary text-white' : ''}
              >
                <Moon className="mr-1 h-3 w-3" /> Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Push Notifications</p>
                <p className="text-xs text-text-secondary">Get notified about trades and alerts</p>
              </div>
            </div>
            <Badge className="bg-profit-green/10 text-profit-green">Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Account Type</p>
              <p className="text-xs text-text-secondary">{user?.email}</p>
            </div>
            <Badge className={user?.tier === 'PREMIUM' ? 'bg-accent-gold/20 text-accent-gold' : 'bg-bg-surface-alt text-text-secondary'}>
              {user?.tier}
            </Badge>
          </div>

          <div className="h-px bg-border-default" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-text-primary">Logout</p>
                <p className="text-xs text-text-secondary">Sign out of your account</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="text-loss-red border-loss-red/30">
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-loss-red/20">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold text-loss-red">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Reset Portfolio</p>
              <p className="text-xs text-text-secondary">Reset all positions, orders, and balance</p>
            </div>
            <Button variant="outline" size="sm" className="text-loss-red border-loss-red/30">
              <Trash2 className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
